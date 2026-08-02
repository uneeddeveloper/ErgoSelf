/**
 * Algoritma skoring System Usability Scale (SUS).
 *
 * Rumus baku (Brooke, 1996):
 *   - Item GANJIL (positif) : kontribusi = skor − 1
 *   - Item GENAP  (negatif) : kontribusi = 5 − skor
 *   - Skor akhir = Σ kontribusi × 2,5   →  rentang 0–100
 *
 * Karena 10 item × kontribusi maksimum 4 = 40, dan 40 × 2,5 = 100, skor SUS
 * SELALU berada di rentang 0–100 dan selalu kelipatan 2,5.
 *
 * Penting: skor SUS BUKAN persentase. Skor 68 bukan berarti "68% puas",
 * melainkan nilai rata-rata industri hasil meta-analisis Sauro (2011).
 *
 * Fungsi di file ini murni agar dapat di-unit test tanpa database.
 */

import {
  ITEM_SUS,
  JUMLAH_ITEM_SUS,
  SKOR_JAWABAN_MAKS,
  SKOR_JAWABAN_MIN,
  cariItemSus,
} from './item'

/** Rentang akseptabilitas (Bangor, Kortum & Miller, 2009) */
export type SusInterpretasi = 'NOT_ACCEPTABLE' | 'MARGINAL' | 'ACCEPTABLE'

/** Skor rata-rata industri hasil meta-analisis Sauro (2011) */
export const TARGET_SUS = 68

export const LABEL_INTERPRETASI: Record<SusInterpretasi, string> = {
  NOT_ACCEPTABLE: 'Tidak Dapat Diterima',
  MARGINAL: 'Marginal (Batas Dapat Diterima)',
  ACCEPTABLE: 'Dapat Diterima',
}

export interface KontribusiItem {
  nomor: number
  pernyataan: string
  nada: 'POSITIF' | 'NEGATIF'
  skorJawaban: number
  /** Kontribusi setelah konversi, rentang 0–4 */
  kontribusi: number
}

export interface HasilSus {
  perItem: KontribusiItem[]
  /** Σ kontribusi seluruh item, rentang 0–40 */
  jumlahKontribusi: number
  /** Σ kontribusi × 2,5 — rentang 0–100 */
  skorTotal: number
  interpretasi: SusInterpretasi
  labelInterpretasi: string
  /** Grade huruf A–F (Sauro & Lewis, 2016) */
  gradeHuruf: string
  /** Adjective rating (Bangor et al., 2009) */
  adjektif: string
  /** Apakah skor mencapai target penelitian (≥ 68) */
  memenuhiTarget: boolean
  /** Selisih terhadap target; negatif berarti di bawah target */
  selisihTarget: number
}

/** Galat validasi jawaban SUS — dipetakan menjadi HTTP 422 di route API. */
export class GalatJawabanSus extends Error {
  constructor(
    message: string,
    readonly nomorItem?: number,
  ) {
    super(message)
    this.name = 'GalatJawabanSus'
  }
}

/**
 * Menghitung kontribusi satu item.
 *
 * Nomor ganjil dianggap pernyataan positif dan genap negatif — sesuai
 * susunan baku SUS. Nada diambil dari katalog `ITEM_SUS` agar tetap benar
 * seandainya suatu saat urutan item diubah.
 */
export function hitungKontribusiItem(
  nomor: number,
  skorJawaban: number,
): number {
  const item = cariItemSus(nomor)
  if (!item) {
    throw new GalatJawabanSus(`Nomor item SUS ${nomor} tidak dikenali`, nomor)
  }

  if (
    !Number.isInteger(skorJawaban) ||
    skorJawaban < SKOR_JAWABAN_MIN ||
    skorJawaban > SKOR_JAWABAN_MAKS
  ) {
    throw new GalatJawabanSus(
      `Jawaban item ${nomor} harus bilangan bulat ${SKOR_JAWABAN_MIN}–${SKOR_JAWABAN_MAKS}`,
      nomor,
    )
  }

  return item.nada === 'POSITIF'
    ? skorJawaban - SKOR_JAWABAN_MIN // 1→0 … 5→4
    : SKOR_JAWABAN_MAKS - skorJawaban // 1→4 … 5→0
}

/** Akseptabilitas: < 50 tidak diterima, 50–70 marginal, > 70 diterima. */
export function interpretasiSus(skorTotal: number): SusInterpretasi {
  if (skorTotal < 50) return 'NOT_ACCEPTABLE'
  if (skorTotal <= 70) return 'MARGINAL'
  return 'ACCEPTABLE'
}

/** Grade huruf berdasarkan kurva Sauro & Lewis (2016). */
export function gradeSus(skorTotal: number): string {
  if (skorTotal >= 80.3) return 'A'
  if (skorTotal >= 74) return 'B'
  if (skorTotal >= 68) return 'C'
  if (skorTotal >= 51) return 'D'
  return 'F'
}

/** Adjective rating (Bangor, Kortum & Miller, 2009). */
export function adjektifSus(skorTotal: number): string {
  if (skorTotal >= 85) return 'Terbaik (Best Imaginable)'
  if (skorTotal >= 73) return 'Sangat Baik (Excellent)'
  if (skorTotal >= 52) return 'Baik (Good)'
  if (skorTotal >= 39) return 'Cukup (OK)'
  if (skorTotal >= 25) return 'Buruk (Poor)'
  return 'Terburuk (Worst Imaginable)'
}

export interface JawabanSusInput {
  itemNomor: number
  skorJawaban: number
}

/**
 * Menghitung hasil SUS lengkap dari jawaban mentah responden.
 *
 * Validasi: seluruh 10 item wajib terjawab, tanpa duplikat, dan setiap
 * jawaban harus bilangan bulat 1–5.
 *
 * @throws {GalatJawabanSus}
 */
export function hitungSkorSus(jawaban: readonly JawabanSusInput[]): HasilSus {
  if (!Array.isArray(jawaban)) {
    throw new GalatJawabanSus('Jawaban kuesioner SUS tidak valid')
  }

  const perNomor = new Map<number, number>()
  for (const item of jawaban) {
    if (!cariItemSus(item?.itemNomor)) {
      throw new GalatJawabanSus(
        `Nomor item SUS ${item?.itemNomor} tidak dikenali`,
        item?.itemNomor,
      )
    }
    if (perNomor.has(item.itemNomor)) {
      throw new GalatJawabanSus(
        `Jawaban item nomor ${item.itemNomor} terkirim lebih dari sekali`,
        item.itemNomor,
      )
    }
    perNomor.set(item.itemNomor, item.skorJawaban)
  }

  const belumTerjawab = ITEM_SUS.filter((i) => !perNomor.has(i.nomor))
  if (belumTerjawab.length > 0) {
    const nomor = belumTerjawab.map((i) => i.nomor).join(', ')
    throw new GalatJawabanSus(
      `Masih ada pernyataan yang belum dijawab: nomor ${nomor}`,
      belumTerjawab[0]!.nomor,
    )
  }

  const perItem: KontribusiItem[] = ITEM_SUS.map((item) => {
    const skorJawaban = perNomor.get(item.nomor)!
    return {
      nomor: item.nomor,
      pernyataan: item.pernyataan,
      nada: item.nada,
      skorJawaban,
      kontribusi: hitungKontribusiItem(item.nomor, skorJawaban),
    }
  })

  const jumlahKontribusi = perItem.reduce((jml, i) => jml + i.kontribusi, 0)
  const skorTotal = Number((jumlahKontribusi * 2.5).toFixed(2))
  const interpretasi = interpretasiSus(skorTotal)

  return {
    perItem,
    jumlahKontribusi,
    skorTotal,
    interpretasi,
    labelInterpretasi: LABEL_INTERPRETASI[interpretasi],
    gradeHuruf: gradeSus(skorTotal),
    adjektif: adjektifSus(skorTotal),
    memenuhiTarget: skorTotal >= TARGET_SUS,
    selisihTarget: Number((skorTotal - TARGET_SUS).toFixed(2)),
  }
}

/** Jumlah item — diekspor ulang agar pemanggil cukup mengimpor satu modul. */
export { JUMLAH_ITEM_SUS }
