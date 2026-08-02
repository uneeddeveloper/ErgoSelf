/**
 * Algoritma perhitungan skor CMDQ.
 *
 * Sengaja ditulis sebagai fungsi MURNI tanpa ketergantungan pada database,
 * Nuxt, maupun jaringan — supaya bisa di-unit test langsung (lihat
 * `tests/skoring-cmdq.test.ts`) dan hasilnya dapat diverifikasi manual oleh
 * penguji tesis.
 *
 * Rumus (pendekatan tiga dimensi CMDQ, Hedge et al.):
 *
 *     skor segmen = bobot frekuensi × tingkat ketidaknyamanan × tingkat gangguan
 *     skor total  = Σ skor seluruh segmen
 *
 * Catatan instrumen: daftar segmen mengikuti Nordic Body Map (28 segmen) dan
 * bobot frekuensi memakai skala linier 0–3 (lihat `skala.ts`), sehingga skor
 * per segmen berkisar 0–27 dan skor total 0–756.
 */

import {
  AMBANG_SEGMEN_SEDANG,
  AMBANG_SEGMEN_TINGGI,
  AMBANG_TOTAL_SEDANG,
  AMBANG_TOTAL_TINGGI,
  BOBOT_FREKUENSI,
  FREKUENSI_MAKS,
  FREKUENSI_MIN,
  GANGGUAN_MAKS,
  GANGGUAN_MIN,
  KETIDAKNYAMANAN_MAKS,
  KETIDAKNYAMANAN_MIN,
  SKOR_TOTAL_MAKS,
  type KategoriRisiko,
} from './skala'
import { SEGMEN_TUBUH, cariSegmen, type DefinisiSegmen } from './segmen'

/** Kategori pada level satu segmen — termasuk "tidak ada keluhan". */
export type KategoriSegmen = 'TIDAK_ADA' | KategoriRisiko

export interface JawabanSegmenInput {
  kodeSegmen: string
  frekuensiKode: number
  /** Wajib bila frekuensi > 0; harus kosong bila frekuensi = 0 */
  ketidaknyamananSkor?: number | null
  /** Wajib bila frekuensi > 0; harus kosong bila frekuensi = 0 */
  gangguanSkor?: number | null
}

export interface SkorSegmen {
  kodeSegmen: string
  nama: string
  regio: DefinisiSegmen['regio']
  urutan: number
  frekuensiKode: number
  frekuensiBobot: number
  ketidaknyamananSkor: number | null
  gangguanSkor: number | null
  skor: number
  kategori: KategoriSegmen
}

export interface HasilSkorCmdq {
  perSegmen: SkorSegmen[]
  skorTotal: number
  skorRataRata: number
  /** Jumlah segmen dengan skor > 0 */
  jumlahSegmenBermasalah: number
  kategoriRisiko: KategoriRisiko
  /** Segmen dengan skor tertinggi; null bila semua segmen bernilai 0 */
  segmenTertinggi: SkorSegmen | null
  jumlahSegmenDinilai: number
  skorTotalMaks: number
  /** Persentase skor total terhadap skor maksimum, 2 desimal */
  persenDariMaks: number
  ambangSedang: number
  ambangTinggi: number
}

/** Galat validasi jawaban — dipetakan menjadi HTTP 422 di route API. */
export class GalatJawabanCmdq extends Error {
  constructor(
    message: string,
    readonly kodeSegmen?: string,
  ) {
    super(message)
    this.name = 'GalatJawabanCmdq'
  }
}

function bulatkan(nilai: number, desimal = 2): number {
  return Number(nilai.toFixed(desimal))
}

function bilanganBulatDalamRentang(
  nilai: unknown,
  min: number,
  maks: number,
): nilai is number {
  return (
    typeof nilai === 'number' &&
    Number.isInteger(nilai) &&
    nilai >= min &&
    nilai <= maks
  )
}

/**
 * Menghitung skor satu segmen.
 * Bila frekuensi = 0 (tidak pernah mengalami keluhan), skor otomatis 0 dan
 * dua pertanyaan lanjutan tidak berlaku.
 */
export function hitungSkorSegmen(
  frekuensiKode: number,
  ketidaknyamananSkor: number | null | undefined,
  gangguanSkor: number | null | undefined,
): number {
  if (!bilanganBulatDalamRentang(frekuensiKode, FREKUENSI_MIN, FREKUENSI_MAKS)) {
    throw new GalatJawabanCmdq(
      `Tingkat frekuensi harus bilangan bulat ${FREKUENSI_MIN}–${FREKUENSI_MAKS}`,
    )
  }

  if (frekuensiKode === 0) return 0

  if (
    !bilanganBulatDalamRentang(
      ketidaknyamananSkor,
      KETIDAKNYAMANAN_MIN,
      KETIDAKNYAMANAN_MAKS,
    )
  ) {
    throw new GalatJawabanCmdq(
      `Tingkat ketidaknyamanan harus bilangan bulat ${KETIDAKNYAMANAN_MIN}–${KETIDAKNYAMANAN_MAKS}`,
    )
  }

  if (!bilanganBulatDalamRentang(gangguanSkor, GANGGUAN_MIN, GANGGUAN_MAKS)) {
    throw new GalatJawabanCmdq(
      `Tingkat gangguan terhadap pekerjaan harus bilangan bulat ${GANGGUAN_MIN}–${GANGGUAN_MAKS}`,
    )
  }

  const bobot = BOBOT_FREKUENSI[frekuensiKode]
  if (bobot === undefined) {
    throw new GalatJawabanCmdq('Bobot frekuensi tidak terdefinisi')
  }

  return bulatkan(bobot * ketidaknyamananSkor * gangguanSkor)
}

/** Kategori risiko pada level satu segmen (rentang 0–27). */
export function kategorikanSkorSegmen(skor: number): KategoriSegmen {
  if (skor <= 0) return 'TIDAK_ADA'
  if (skor <= AMBANG_SEGMEN_SEDANG) return 'RENDAH'
  if (skor <= AMBANG_SEGMEN_TINGGI) return 'SEDANG'
  return 'TINGGI'
}

/**
 * Kategori risiko pada level responden, berdasarkan skor total.
 * Ambang dapat dilewatkan secara eksplisit agar hasil lama tetap bisa
 * dihitung ulang dengan ambang yang berlaku saat itu.
 */
export function kategorikanSkorTotal(
  skorTotal: number,
  ambangSedang: number = AMBANG_TOTAL_SEDANG,
  ambangTinggi: number = AMBANG_TOTAL_TINGGI,
): KategoriRisiko {
  if (skorTotal <= ambangSedang) return 'RENDAH'
  if (skorTotal <= ambangTinggi) return 'SEDANG'
  return 'TINGGI'
}

/**
 * Menghitung seluruh hasil CMDQ dari jawaban mentah responden.
 *
 * Validasi yang diterapkan:
 *   - setiap kode segmen harus dikenal;
 *   - tidak boleh ada segmen ganda;
 *   - seluruh segmen wajib terjawab (kelengkapan instrumen);
 *   - bila frekuensi = 0, dua pertanyaan lanjutan harus kosong;
 *   - bila frekuensi > 0, dua pertanyaan lanjutan wajib terisi 1–3.
 *
 * @throws {GalatJawabanCmdq}
 */
export function hitungSkorCmdq(
  jawaban: readonly JawabanSegmenInput[],
): HasilSkorCmdq {
  if (!Array.isArray(jawaban)) {
    throw new GalatJawabanCmdq('Jawaban kuesioner tidak valid')
  }

  const terlihat = new Set<string>()
  const perKode = new Map<string, JawabanSegmenInput>()

  for (const item of jawaban) {
    const segmen = cariSegmen(item?.kodeSegmen)
    if (!segmen) {
      throw new GalatJawabanCmdq(
        `Bagian tubuh "${item?.kodeSegmen}" tidak dikenali`,
        item?.kodeSegmen,
      )
    }
    if (terlihat.has(segmen.kode)) {
      throw new GalatJawabanCmdq(
        `Jawaban untuk ${segmen.nama} terkirim lebih dari sekali`,
        segmen.kode,
      )
    }
    terlihat.add(segmen.kode)
    perKode.set(segmen.kode, item)
  }

  const belumTerjawab = SEGMEN_TUBUH.filter((s) => !perKode.has(s.kode))
  if (belumTerjawab.length > 0) {
    const daftar = belumTerjawab.map((s) => s.nama).join(', ')
    throw new GalatJawabanCmdq(
      `Masih ada bagian tubuh yang belum dijawab: ${daftar}`,
      belumTerjawab[0]!.kode,
    )
  }

  const perSegmen: SkorSegmen[] = SEGMEN_TUBUH.map((segmen) => {
    const item = perKode.get(segmen.kode)!
    const frekuensiKode = item.frekuensiKode
    const tidakPernah = frekuensiKode === 0

    // Jika responden menjawab "tidak pernah", dua pertanyaan lanjutan tidak
    // ditampilkan di UI — kalau tetap terkirim, itu tanda data tidak konsisten.
    if (
      tidakPernah &&
      (item.ketidaknyamananSkor != null || item.gangguanSkor != null)
    ) {
      throw new GalatJawabanCmdq(
        `${segmen.nama}: tingkat ketidaknyamanan dan gangguan tidak berlaku bila keluhan tidak pernah dirasakan`,
        segmen.kode,
      )
    }

    let skor: number
    try {
      skor = hitungSkorSegmen(
        frekuensiKode,
        item.ketidaknyamananSkor,
        item.gangguanSkor,
      )
    } catch (error) {
      const pesan =
        error instanceof Error ? error.message : 'Jawaban tidak valid'
      throw new GalatJawabanCmdq(`${segmen.nama}: ${pesan}`, segmen.kode)
    }

    return {
      kodeSegmen: segmen.kode,
      nama: segmen.nama,
      regio: segmen.regio,
      urutan: segmen.urutan,
      frekuensiKode,
      frekuensiBobot: BOBOT_FREKUENSI[frekuensiKode]!,
      ketidaknyamananSkor: tidakPernah ? null : item.ketidaknyamananSkor!,
      gangguanSkor: tidakPernah ? null : item.gangguanSkor!,
      skor,
      kategori: kategorikanSkorSegmen(skor),
    }
  })

  const skorTotal = bulatkan(perSegmen.reduce((jml, s) => jml + s.skor, 0))
  const jumlahSegmenDinilai = perSegmen.length
  const bermasalah = perSegmen.filter((s) => s.skor > 0)

  const segmenTertinggi =
    bermasalah.length > 0
      ? bermasalah.reduce((maks, s) => (s.skor > maks.skor ? s : maks))
      : null

  return {
    perSegmen,
    skorTotal,
    skorRataRata: bulatkan(skorTotal / jumlahSegmenDinilai),
    jumlahSegmenBermasalah: bermasalah.length,
    kategoriRisiko: kategorikanSkorTotal(skorTotal),
    segmenTertinggi,
    jumlahSegmenDinilai,
    skorTotalMaks: SKOR_TOTAL_MAKS,
    persenDariMaks: bulatkan((skorTotal / SKOR_TOTAL_MAKS) * 100),
    ambangSedang: AMBANG_TOTAL_SEDANG,
    ambangTinggi: AMBANG_TOTAL_TINGGI,
  }
}
