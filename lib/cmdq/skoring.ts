/**
 * Algoritma perhitungan skor CMDQ.
 *
 * Sengaja ditulis sebagai fungsi MURNI tanpa ketergantungan pada database,
 * Nuxt, maupun jaringan — supaya bisa di-unit test langsung (lihat
 * `tests/skoring-cmdq.test.ts`) dan hasilnya dapat diverifikasi manual oleh
 * penguji tesis.
 *
 * Instrumen: Cornell Musculoskeletal Discomfort Questionnaire versi pekerja
 * duduk, 18 item (`segmen.ts`), skala & bobot baku Cornell (`skala.ts`).
 *
 * KEEMPAT METODE ANALISIS CORNELL DIHITUNG SEKALIGUS, sesuai instruksi resmi
 * yang menyebut skor "can be analyzed in 4 ways":
 *
 *   1. `jumlahGejala`            — banyaknya bagian tubuh yang berkeluhan
 *   2. `jumlahRating`            — Σ nilai rating mentah (tanpa pembobotan)
 *   3. `jumlahFrekuensiBerbobot` — Σ bobot frekuensi (0/1,5/3,5/5/10)
 *   4. `skorTotal`               — Σ (bobot frekuensi × ketidaknyamanan × gangguan)
 *
 * Metode ke-4 tetap menjadi skor utama aplikasi (dipakai untuk kategori risiko
 * dan grafik), tiga sisanya dilaporkan mendampinginya karena analisis Bab IV
 * lazim menyertakannya — terutama metode 1, yang setara "angka prevalensi".
 */

import {
  AMBANG_SEGMEN_SEDANG,
  AMBANG_SEGMEN_TINGGI,
  AMBANG_TOTAL_SEDANG_SEMENTARA,
  AMBANG_TOTAL_TINGGI_SEMENTARA,
  BOBOT_FREKUENSI,
  FREKUENSI_MAKS,
  FREKUENSI_MIN,
  GANGGUAN_MAKS,
  GANGGUAN_MIN,
  KETIDAKNYAMANAN_MAKS,
  KETIDAKNYAMANAN_MIN,
  RATING_SEGMEN_MAKS,
  SKOR_TOTAL_MAKS,
  type KategoriRisiko,
} from './skala'
import { SEGMEN_TUBUH, cariSegmen, type DefinisiSegmen } from './segmen'

/** Kategori pada level satu item — termasuk "tidak ada keluhan". */
export type KategoriSegmen = 'TIDAK_ADA' | KategoriRisiko

export interface JawabanSegmenInput {
  kodeSegmen: string
  /** `null` diperlakukan sebagai 0 — lihat aturan missing value di bawah */
  frekuensiKode?: number | null
  /** Wajib kosong bila frekuensi = 0; boleh kosong bila frekuensi > 0 */
  ketidaknyamananSkor?: number | null
  /** Wajib kosong bila frekuensi = 0; boleh kosong bila frekuensi > 0 */
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
  /**
   * `true` bila responden melaporkan keluhan tetapi salah satu pertanyaan
   * lanjutan kosong, sehingga pengalinya diisi 1 mengikuti aturan Cornell.
   * Ditandai supaya kualitas data terlihat di ekspor, bukan tersamar sebagai
   * jawaban "sedikit tidak nyaman" yang sebenarnya tidak pernah diberikan.
   */
  adaNilaiHilang: boolean
}

/** Keempat metode analisis Cornell untuk satu responden. */
export interface RingkasanMetodeCmdq {
  /** Metode 1 — banyaknya bagian tubuh dengan frekuensi > 0 (0–18) */
  jumlahGejala: number
  /** Metode 2 — Σ (frekuensiKode + ketidaknyamanan + gangguan), missing = 0 */
  jumlahRating: number
  /** Metode 3 — Σ bobot frekuensi (0–180) */
  jumlahFrekuensiBerbobot: number
  /** Metode 4 — Σ skor perkalian; sama dengan `skorTotal` (0–1620) */
  skorPerkalian: number
}

export interface HasilSkorCmdq {
  perSegmen: SkorSegmen[]
  skorTotal: number
  skorRataRata: number
  /** Jumlah item dengan skor > 0 */
  jumlahSegmenBermasalah: number
  kategoriRisiko: KategoriRisiko
  /** Item dengan skor tertinggi; null bila semua item bernilai 0 */
  segmenTertinggi: SkorSegmen | null
  jumlahSegmenDinilai: number
  skorTotalMaks: number
  /** Persentase skor total terhadap skor maksimum, 2 desimal */
  persenDariMaks: number
  ambangSedang: number
  ambangTinggi: number
  metode: RingkasanMetodeCmdq
  /** Banyaknya item dengan pertanyaan lanjutan yang kosong */
  jumlahSegmenNilaiHilang: number
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
 * Pengali pengganti untuk pertanyaan lanjutan yang kosong.
 *
 * Aturan Cornell, verbatim: "if the missing value is in the Discomfort or
 * Frequency score then treat it as missing so that the multiplied score will
 * be at least the value of the Frequency score." Pengali 1 adalah satu-satunya
 * nilai yang memenuhi syarat "minimal setara skor frekuensi" tanpa mengarang
 * keparahan yang tidak dilaporkan responden.
 *
 * Versi sebelumnya aplikasi ini MENOLAK jawaban semacam itu dengan HTTP 422 —
 * seluruh pengisian gagal terkirim gara-gara satu pertanyaan lanjutan kosong.
 */
const PENGALI_NILAI_HILANG = 1

/**
 * Menghitung skor satu item.
 * Bila frekuensi = 0 (tidak pernah mengalami keluhan), skor otomatis 0 dan
 * dua pertanyaan lanjutan tidak berlaku.
 */
export function hitungSkorSegmen(
  frekuensiKode: number | null | undefined,
  ketidaknyamananSkor: number | null | undefined,
  gangguanSkor: number | null | undefined,
): number {
  // Frekuensi kosong = 0, sesuai aturan Cornell: "If the missing value is for
  // the frequency score then use this as a zero in multiplying, i.e. all
  // combinations of Frequency, Discomfort and Interference become 0."
  const frekuensi = frekuensiKode ?? 0

  if (!bilanganBulatDalamRentang(frekuensi, FREKUENSI_MIN, FREKUENSI_MAKS)) {
    throw new GalatJawabanCmdq(
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
    throw new GalatJawabanCmdq(
      `Tingkat ketidaknyamanan harus bilangan bulat ${KETIDAKNYAMANAN_MIN}–${KETIDAKNYAMANAN_MAKS}`,
    )
  }

  if (!bilanganBulatDalamRentang(gangguan, GANGGUAN_MIN, GANGGUAN_MAKS)) {
    throw new GalatJawabanCmdq(
      `Tingkat gangguan terhadap pekerjaan harus bilangan bulat ${GANGGUAN_MIN}–${GANGGUAN_MAKS}`,
    )
  }

  const bobot = BOBOT_FREKUENSI[frekuensi]
  if (bobot === undefined) {
    throw new GalatJawabanCmdq('Bobot frekuensi tidak terdefinisi')
  }

  return bulatkan(bobot * ketidaknyamanan * gangguan)
}

/** Kategori risiko pada level satu item (rentang 0–90). */
export function kategorikanSkorSegmen(skor: number): KategoriSegmen {
  if (skor <= 0) return 'TIDAK_ADA'
  if (skor <= AMBANG_SEGMEN_SEDANG) return 'RENDAH'
  if (skor <= AMBANG_SEGMEN_TINGGI) return 'SEDANG'
  return 'TINGGI'
}

/**
 * Kategori risiko pada level responden, berdasarkan skor total.
 *
 * Ambang WAJIB dianggap sebagai parameter, bukan konstanta: nilainya berasal
 * dari tersil empiris di tabel `ambang_risiko` dan berubah setiap kali peneliti
 * menghitung ulang. Nilai bawaan di bawah hanyalah ambang sementara yang
 * berlaku sebelum data mencukupi (lihat `skala.ts`), dan setiap hasil yang
 * tersimpan merekam ambang yang dipakainya sendiri supaya bisa dihitung ulang.
 */
export function kategorikanSkorTotal(
  skorTotal: number,
  ambangSedang: number = AMBANG_TOTAL_SEDANG_SEMENTARA,
  ambangTinggi: number = AMBANG_TOTAL_TINGGI_SEMENTARA,
): KategoriRisiko {
  if (skorTotal <= ambangSedang) return 'RENDAH'
  if (skorTotal <= ambangTinggi) return 'SEDANG'
  return 'TINGGI'
}

export interface OpsiHitungCmdq {
  /** Ambang tersil yang berlaku; default = ambang sementara */
  ambangSedang?: number
  ambangTinggi?: number
}

/**
 * Menghitung seluruh hasil CMDQ dari jawaban mentah responden.
 *
 * Validasi yang diterapkan:
 *   - setiap kode item harus dikenal;
 *   - tidak boleh ada item ganda;
 *   - seluruh 18 item wajib TERKIRIM (kelengkapan instrumen);
 *   - bila frekuensi = 0, dua pertanyaan lanjutan harus kosong.
 *
 * Yang TIDAK lagi divalidasi, karena aturan Cornell mengaturnya sebagai
 * missing value dan bukan sebagai galat: pertanyaan lanjutan yang kosong
 * padahal frekuensi > 0. Kelengkapan 18 item tetap diwajibkan karena setiap
 * pengiriman berasal dari form yang selalu merender semuanya — item yang
 * hilang menandakan cacat pada klien, bukan responden yang melewatkan soal.
 *
 * @throws {GalatJawabanCmdq}
 */
export function hitungSkorCmdq(
  jawaban: readonly JawabanSegmenInput[],
  opsi: OpsiHitungCmdq = {},
): HasilSkorCmdq {
  if (!Array.isArray(jawaban)) {
    throw new GalatJawabanCmdq('Jawaban kuesioner tidak valid')
  }

  const ambangSedang = opsi.ambangSedang ?? AMBANG_TOTAL_SEDANG_SEMENTARA
  const ambangTinggi = opsi.ambangTinggi ?? AMBANG_TOTAL_TINGGI_SEMENTARA

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
    const frekuensiKode = item.frekuensiKode ?? 0
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

    const adaNilaiHilang =
      !tidakPernah &&
      (item.ketidaknyamananSkor == null || item.gangguanSkor == null)

    return {
      kodeSegmen: segmen.kode,
      nama: segmen.nama,
      regio: segmen.regio,
      urutan: segmen.urutan,
      frekuensiKode,
      frekuensiBobot: BOBOT_FREKUENSI[frekuensiKode]!,
      // Nilai yang hilang tetap disimpan sebagai null, TIDAK diganti angka
      // pengganti. Pengali 1 hanya dipakai saat menghitung; menuliskannya ke
      // basis data berarti mengarang jawaban responden.
      ketidaknyamananSkor: tidakPernah ? null : (item.ketidaknyamananSkor ?? null),
      gangguanSkor: tidakPernah ? null : (item.gangguanSkor ?? null),
      skor,
      kategori: kategorikanSkorSegmen(skor),
      adaNilaiHilang,
    }
  })

  const skorTotal = bulatkan(perSegmen.reduce((jml, s) => jml + s.skor, 0))
  const jumlahSegmenDinilai = perSegmen.length
  const bermasalah = perSegmen.filter((s) => s.skor > 0)

  // Pemenang seri: perbandingan memakai `>` (bukan `>=`), sehingga bila dua
  // item berskor sama yang menang adalah yang lebih dulu pada urutan CMDQ.
  // Aturan ini dinyatakan eksplisit karena seri adalah kasus LAZIM di data
  // ergonomi kantor — bahu kiri/kanan atau kedua pergelangan tangan sering
  // dilaporkan identik. Mengganti `>` menjadi `>=` akan membalik setiap seri
  // tanpa mengubah satu pun angka lain; uji di `tests/skoring-cmdq.test.ts`
  // menjaga agar perubahan itu tidak lolos diam-diam.
  const segmenTertinggi =
    bermasalah.length > 0
      ? bermasalah.reduce((maks, s) => (s.skor > maks.skor ? s : maks))
      : null

  const metode: RingkasanMetodeCmdq = {
    jumlahGejala: bermasalah.length,
    jumlahRating: perSegmen.reduce(
      (jml, s) =>
        jml +
        s.frekuensiKode +
        (s.ketidaknyamananSkor ?? 0) +
        (s.gangguanSkor ?? 0),
      0,
    ),
    jumlahFrekuensiBerbobot: bulatkan(
      perSegmen.reduce((jml, s) => jml + s.frekuensiBobot, 0),
    ),
    skorPerkalian: skorTotal,
  }

  return {
    perSegmen,
    skorTotal,
    skorRataRata: bulatkan(skorTotal / jumlahSegmenDinilai),
    jumlahSegmenBermasalah: bermasalah.length,
    kategoriRisiko: kategorikanSkorTotal(skorTotal, ambangSedang, ambangTinggi),
    segmenTertinggi,
    jumlahSegmenDinilai,
    skorTotalMaks: SKOR_TOTAL_MAKS,
    persenDariMaks: bulatkan((skorTotal / SKOR_TOTAL_MAKS) * 100),
    ambangSedang,
    ambangTinggi,
    metode,
    jumlahSegmenNilaiHilang: perSegmen.filter((s) => s.adaNilaiHilang).length,
  }
}

/** Skor rating mentah maksimum seorang responden (metode 2). */
export const RATING_TOTAL_MAKS = RATING_SEGMEN_MAKS * SEGMEN_TUBUH.length
