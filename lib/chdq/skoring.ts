/**
 * Algoritma perhitungan skor CHDQ (Cornell Hand Discomfort Questionnaire).
 *
 * Fungsi murni tanpa ketergantungan database/Nuxt/jaringan, sama seperti
 * `lib/cmdq/skoring.ts`, supaya bisa di-unit test dan diverifikasi manual.
 *
 * Rumus dan aturan missing value IDENTIK dengan CMDQ — halaman resmi CHDQ
 * mengulang instruksi skoring yang sama. Yang berbeda hanya unit analisisnya:
 * 6 area × 2 tangan, dengan agregasi PER TANGAN di samping skor gabungan.
 *
 * Agregasi per tangan bukan tambahan kosmetik. Keluhan tangan pada pengguna
 * komputer kerap satu sisi saja — mengikuti tangan yang memegang tetikus —
 * dan skor gabungan kedua tangan meratakan justru pola yang paling ingin
 * ditemukan. Karena itu `perTangan` selalu dihitung, meskipun kategori risiko
 * responden diambil dari skor gabungan.
 */

import {
  AMBANG_AREA_SEDANG,
  AMBANG_AREA_TINGGI,
  AMBANG_CHDQ_SEDANG_SEMENTARA,
  AMBANG_CHDQ_TINGGI_SEMENTARA,
  BOBOT_FREKUENSI,
  FREKUENSI_MAKS,
  FREKUENSI_MIN,
  GANGGUAN_MAKS,
  GANGGUAN_MIN,
  KETIDAKNYAMANAN_MAKS,
  KETIDAKNYAMANAN_MIN,
  SKOR_CHDQ_MAKS,
  SKOR_TANGAN_MAKS,
  type KategoriRisiko,
} from './skala'
import {
  AREA_TANGAN,
  URUTAN_TANGAN,
  cariAreaTangan,
  type HurufArea,
  type Tangan,
} from './area'

export type KategoriArea = 'TIDAK_ADA' | KategoriRisiko

export interface JawabanAreaInput {
  kodeArea: string
  frekuensiKode?: number | null
  ketidaknyamananSkor?: number | null
  gangguanSkor?: number | null
}

export interface SkorArea {
  kodeArea: string
  tangan: Tangan
  huruf: HurufArea
  nama: string
  urutan: number
  frekuensiKode: number
  frekuensiBobot: number
  ketidaknyamananSkor: number | null
  gangguanSkor: number | null
  skor: number
  kategori: KategoriArea
  adaNilaiHilang: boolean
}

export interface SkorTangan {
  tangan: Tangan
  skorTotal: number
  jumlahAreaBermasalah: number
  areaTertinggi: SkorArea | null
  skorMaks: number
}

export interface RingkasanMetodeChdq {
  jumlahGejala: number
  jumlahRating: number
  jumlahFrekuensiBerbobot: number
  skorPerkalian: number
}

export interface HasilSkorChdq {
  perArea: SkorArea[]
  perTangan: SkorTangan[]
  skorTotal: number
  jumlahAreaBermasalah: number
  kategoriRisiko: KategoriRisiko
  areaTertinggi: SkorArea | null
  /**
   * Tangan dengan skor lebih tinggi; `null` bila seri (termasuk saat keduanya
   * bernilai 0). Seri sengaja tidak dipaksa memilih salah satu — pada data
   * tanpa keluhan sama sekali, "tangan kanan" yang muncul karena urutan array
   * akan terbaca sebagai temuan.
   */
  tanganDominan: Tangan | null
  skorMaks: number
  persenDariMaks: number
  ambangSedang: number
  ambangTinggi: number
  metode: RingkasanMetodeChdq
  jumlahAreaNilaiHilang: number
}

export class GalatJawabanChdq extends Error {
  constructor(
    message: string,
    readonly kodeArea?: string,
  ) {
    super(message)
    this.name = 'GalatJawabanChdq'
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

/** Lihat `PENGALI_NILAI_HILANG` di `lib/cmdq/skoring.ts` — aturan Cornell sama. */
const PENGALI_NILAI_HILANG = 1

export function hitungSkorArea(
  frekuensiKode: number | null | undefined,
  ketidaknyamananSkor: number | null | undefined,
  gangguanSkor: number | null | undefined,
): number {
  const frekuensi = frekuensiKode ?? 0

  if (!bilanganBulatDalamRentang(frekuensi, FREKUENSI_MIN, FREKUENSI_MAKS)) {
    throw new GalatJawabanChdq(
      `Tingkat frekuensi harus bilangan bulat ${FREKUENSI_MIN}–${FREKUENSI_MAKS}`,
    )
  }

  if (frekuensi === 0) return 0

  const ketidaknyamanan =
    ketidaknyamananSkor == null ? PENGALI_NILAI_HILANG : ketidaknyamananSkor
  const gangguan = gangguanSkor == null ? PENGALI_NILAI_HILANG : gangguanSkor

  if (
    !bilanganBulatDalamRentang(
      ketidaknyamanan,
      KETIDAKNYAMANAN_MIN,
      KETIDAKNYAMANAN_MAKS,
    )
  ) {
    throw new GalatJawabanChdq(
      `Tingkat ketidaknyamanan harus bilangan bulat ${KETIDAKNYAMANAN_MIN}–${KETIDAKNYAMANAN_MAKS}`,
    )
  }

  if (!bilanganBulatDalamRentang(gangguan, GANGGUAN_MIN, GANGGUAN_MAKS)) {
    throw new GalatJawabanChdq(
      `Tingkat gangguan terhadap pekerjaan harus bilangan bulat ${GANGGUAN_MIN}–${GANGGUAN_MAKS}`,
    )
  }

  const bobot = BOBOT_FREKUENSI[frekuensi]
  if (bobot === undefined) {
    throw new GalatJawabanChdq('Bobot frekuensi tidak terdefinisi')
  }

  return bulatkan(bobot * ketidaknyamanan * gangguan)
}

/** Kategori pada level satu area (rentang 0–90). */
export function kategorikanSkorArea(skor: number): KategoriArea {
  if (skor <= 0) return 'TIDAK_ADA'
  if (skor <= AMBANG_AREA_SEDANG) return 'RENDAH'
  if (skor <= AMBANG_AREA_TINGGI) return 'SEDANG'
  return 'TINGGI'
}

export function kategorikanSkorChdq(
  skorTotal: number,
  ambangSedang: number = AMBANG_CHDQ_SEDANG_SEMENTARA,
  ambangTinggi: number = AMBANG_CHDQ_TINGGI_SEMENTARA,
): KategoriRisiko {
  if (skorTotal <= ambangSedang) return 'RENDAH'
  if (skorTotal <= ambangTinggi) return 'SEDANG'
  return 'TINGGI'
}

export interface OpsiHitungChdq {
  ambangSedang?: number
  ambangTinggi?: number
}

/**
 * Menghitung seluruh hasil CHDQ dari jawaban mentah responden.
 *
 * Validasi mengikuti pola CMDQ: kode dikenal, tanpa duplikat, seluruh 12 item
 * terkirim, dan pertanyaan lanjutan harus kosong bila frekuensi = 0.
 *
 * @throws {GalatJawabanChdq}
 */
export function hitungSkorChdq(
  jawaban: readonly JawabanAreaInput[],
  opsi: OpsiHitungChdq = {},
): HasilSkorChdq {
  if (!Array.isArray(jawaban)) {
    throw new GalatJawabanChdq('Jawaban kuesioner tangan tidak valid')
  }

  const ambangSedang = opsi.ambangSedang ?? AMBANG_CHDQ_SEDANG_SEMENTARA
  const ambangTinggi = opsi.ambangTinggi ?? AMBANG_CHDQ_TINGGI_SEMENTARA

  const perKode = new Map<string, JawabanAreaInput>()

  for (const item of jawaban) {
    const area = cariAreaTangan(item?.kodeArea)
    if (!area) {
      throw new GalatJawabanChdq(
        `Area tangan "${item?.kodeArea}" tidak dikenali`,
        item?.kodeArea,
      )
    }
    if (perKode.has(area.kode)) {
      throw new GalatJawabanChdq(
        `Jawaban untuk ${area.namaEn} ${area.tangan.toLowerCase()} terkirim lebih dari sekali`,
        area.kode,
      )
    }
    perKode.set(area.kode, item)
  }

  const belumTerjawab = AREA_TANGAN.filter((a) => !perKode.has(a.kode))
  if (belumTerjawab.length > 0) {
    const daftar = belumTerjawab
      .map((a) => `${a.namaEn} (${a.tangan.toLowerCase()})`)
      .join(', ')
    throw new GalatJawabanChdq(
      `Masih ada area tangan yang belum dijawab: ${daftar}`,
      belumTerjawab[0]!.kode,
    )
  }

  const perArea: SkorArea[] = AREA_TANGAN.map((area) => {
    const item = perKode.get(area.kode)!
    const frekuensiKode = item.frekuensiKode ?? 0
    const tidakPernah = frekuensiKode === 0

    if (
      tidakPernah &&
      (item.ketidaknyamananSkor != null || item.gangguanSkor != null)
    ) {
      throw new GalatJawabanChdq(
        `${area.namaEn} ${area.tangan.toLowerCase()}: tingkat ketidaknyamanan dan gangguan tidak berlaku bila keluhan tidak pernah dirasakan`,
        area.kode,
      )
    }

    let skor: number
    try {
      skor = hitungSkorArea(
        frekuensiKode,
        item.ketidaknyamananSkor,
        item.gangguanSkor,
      )
    } catch (error) {
      const pesan =
        error instanceof Error ? error.message : 'Jawaban tidak valid'
      throw new GalatJawabanChdq(
        `${area.namaEn} ${area.tangan.toLowerCase()}: ${pesan}`,
        area.kode,
      )
    }

    return {
      kodeArea: area.kode,
      tangan: area.tangan,
      huruf: area.huruf,
      nama: area.nama,
      urutan: area.urutan,
      frekuensiKode,
      frekuensiBobot: BOBOT_FREKUENSI[frekuensiKode]!,
      ketidaknyamananSkor: tidakPernah ? null : (item.ketidaknyamananSkor ?? null),
      gangguanSkor: tidakPernah ? null : (item.gangguanSkor ?? null),
      skor,
      kategori: kategorikanSkorArea(skor),
      adaNilaiHilang:
        !tidakPernah &&
        (item.ketidaknyamananSkor == null || item.gangguanSkor == null),
    }
  })

  // Seri diselesaikan sama seperti di CMDQ: `>` (bukan `>=`) sehingga area
  // yang lebih dulu pada urutan Cornell yang menang.
  const tertinggiDari = (daftar: SkorArea[]): SkorArea | null => {
    const bermasalah = daftar.filter((a) => a.skor > 0)
    return bermasalah.length > 0
      ? bermasalah.reduce((maks, a) => (a.skor > maks.skor ? a : maks))
      : null
  }

  const perTangan: SkorTangan[] = URUTAN_TANGAN.map((tangan) => {
    const area = perArea.filter((a) => a.tangan === tangan)
    return {
      tangan,
      skorTotal: bulatkan(area.reduce((jml, a) => jml + a.skor, 0)),
      jumlahAreaBermasalah: area.filter((a) => a.skor > 0).length,
      areaTertinggi: tertinggiDari(area),
      skorMaks: SKOR_TANGAN_MAKS,
    }
  })

  const skorTotal = bulatkan(perArea.reduce((jml, a) => jml + a.skor, 0))
  const bermasalah = perArea.filter((a) => a.skor > 0)

  const [kanan, kiri] = perTangan
  const tanganDominan =
    !kanan || !kiri || kanan.skorTotal === kiri.skorTotal
      ? null
      : kanan.skorTotal > kiri.skorTotal
        ? kanan.tangan
        : kiri.tangan

  const metode: RingkasanMetodeChdq = {
    jumlahGejala: bermasalah.length,
    jumlahRating: perArea.reduce(
      (jml, a) =>
        jml +
        a.frekuensiKode +
        (a.ketidaknyamananSkor ?? 0) +
        (a.gangguanSkor ?? 0),
      0,
    ),
    jumlahFrekuensiBerbobot: bulatkan(
      perArea.reduce((jml, a) => jml + a.frekuensiBobot, 0),
    ),
    skorPerkalian: skorTotal,
  }

  return {
    perArea,
    perTangan,
    skorTotal,
    jumlahAreaBermasalah: bermasalah.length,
    kategoriRisiko: kategorikanSkorChdq(skorTotal, ambangSedang, ambangTinggi),
    areaTertinggi: tertinggiDari(perArea),
    tanganDominan,
    skorMaks: SKOR_CHDQ_MAKS,
    persenDariMaks: bulatkan((skorTotal / SKOR_CHDQ_MAKS) * 100),
    ambangSedang,
    ambangTinggi,
    metode,
    jumlahAreaNilaiHilang: perArea.filter((a) => a.adaNilaiHilang).length,
  }
}
