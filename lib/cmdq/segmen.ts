/**
 * Katalog bagian tubuh CMDQ — 18 item, indeks baku 0–17.
 *
 * Sumber urutan & penamaan: Cornell Musculoskeletal Discomfort Questionnaire
 * versi pekerja duduk (Hedge, Morimoto & McCrobie, 1999), berkas resmi
 * `mmsquest.pdf` / `fmsquest.pdf` —
 * https://ergo.human.cornell.edu/ahmsquest.html
 *
 * URUTAN DI BAWAH SAMA PERSIS DENGAN FORM ASLI, termasuk kebiasaan Cornell
 * menaruh sisi KANAN di atas sisi KIRI. Jangan diurutkan ulang: nomor item
 * inilah yang dirujuk lampiran instrumen di tesis.
 *
 * CATATAN REVISI (Agustus 2026): sebelumnya berkas ini berisi 28 segmen
 * Nordic Body Map. Instrumen lama memakai metode skoring CMDQ pada daftar
 * segmen NBM — hibrida yang tidak bisa disebut "CMDQ" di metodologi. Sepuluh
 * segmen NBM yang tidak ada di CMDQ (leher atas/bawah terpisah, siku, tangan,
 * pergelangan kaki, kaki, bokong vs pantat) DIHAPUS; keluhan telapak tangan
 * kini ditangani instrumen terpisah di `lib/chdq/` (Cornell Hand Discomfort
 * Questionnaire), sesuai pembagian Cornell sendiri.
 *
 * Berkas ini adalah SATU-SATUNYA sumber kebenaran untuk daftar item. Dipakai
 * oleh:
 *   - prisma/seed.ts        → mengisi tabel `segmen_tubuh`
 *   - lib/cmdq/bodymap.ts   → atribut `data-kode` tiap area sentuh pada SVG
 *   - lib/cmdq/skoring.ts   → validasi kelengkapan jawaban
 */

export type Sisi = 'TENGAH' | 'KIRI' | 'KANAN'

export type RegioTubuh =
  | 'LEHER'
  | 'BAHU'
  | 'PUNGGUNG_PINGGANG'
  | 'EKSTREMITAS_ATAS'
  | 'EKSTREMITAS_BAWAH'

export interface DefinisiSegmen {
  /** Nomor item CMDQ (0–17), sekaligus urutan tampil */
  urutan: number
  /** Kode stabil; dipakai sebagai `data-kode` pada body map SVG */
  kode: string
  /** Label bahasa Indonesia yang dilihat responden */
  nama: string
  /** Istilah asli pada form Cornell (untuk lampiran instrumen di tesis) */
  namaEn: string
  sisi: Sisi
  regio: RegioTubuh
  /**
   * Penjelasan tambahan untuk item yang batas anatomisnya mudah keliru bagi
   * pekerja awam. CMDQ memakai regio yang lebih luas daripada NBM — satu item
   * "Lower Back" mencakup apa yang di NBM terpisah menjadi punggung bawah dan
   * pinggang — sehingga batasnya perlu dinyatakan, bukan diserahkan ke tebakan.
   */
  petunjuk?: string
}

export const SEGMEN_TUBUH: readonly DefinisiSegmen[] = [
  { urutan: 0,  kode: 'LEHER',                     nama: 'Leher',                    namaEn: 'Neck',            sisi: 'TENGAH', regio: 'LEHER' },
  { urutan: 1,  kode: 'BAHU_KANAN',                nama: 'Bahu kanan',               namaEn: 'Shoulder (Right)',sisi: 'KANAN',  regio: 'BAHU' },
  { urutan: 2,  kode: 'BAHU_KIRI',                 nama: 'Bahu kiri',                namaEn: 'Shoulder (Left)', sisi: 'KIRI',   regio: 'BAHU' },
  { urutan: 3,  kode: 'PUNGGUNG_ATAS',             nama: 'Punggung atas',            namaEn: 'Upper Back',      sisi: 'TENGAH', regio: 'PUNGGUNG_PINGGANG', petunjuk: 'Antara pangkal leher dan garis pinggang belakang' },
  { urutan: 4,  kode: 'LENGAN_ATAS_KANAN',         nama: 'Lengan atas kanan',        namaEn: 'Upper Arm (Right)',sisi: 'KANAN', regio: 'EKSTREMITAS_ATAS' },
  { urutan: 5,  kode: 'LENGAN_ATAS_KIRI',          nama: 'Lengan atas kiri',         namaEn: 'Upper Arm (Left)', sisi: 'KIRI',  regio: 'EKSTREMITAS_ATAS' },
  { urutan: 6,  kode: 'PUNGGUNG_BAWAH',            nama: 'Punggung bawah',           namaEn: 'Lower Back',      sisi: 'TENGAH', regio: 'PUNGGUNG_PINGGANG', petunjuk: 'Area pinggang, di bawah tulang rusuk hingga atas panggul' },
  { urutan: 7,  kode: 'LENGAN_BAWAH_KANAN',        nama: 'Lengan bawah kanan',       namaEn: 'Forearm (Right)', sisi: 'KANAN',  regio: 'EKSTREMITAS_ATAS', petunjuk: 'Antara siku dan pergelangan tangan' },
  { urutan: 8,  kode: 'LENGAN_BAWAH_KIRI',         nama: 'Lengan bawah kiri',        namaEn: 'Forearm (Left)',  sisi: 'KIRI',   regio: 'EKSTREMITAS_ATAS', petunjuk: 'Antara siku dan pergelangan tangan' },
  { urutan: 9,  kode: 'PERGELANGAN_TANGAN_KANAN',  nama: 'Pergelangan tangan kanan', namaEn: 'Wrist (Right)',   sisi: 'KANAN',  regio: 'EKSTREMITAS_ATAS' },
  { urutan: 10, kode: 'PERGELANGAN_TANGAN_KIRI',   nama: 'Pergelangan tangan kiri',  namaEn: 'Wrist (Left)',    sisi: 'KIRI',   regio: 'EKSTREMITAS_ATAS' },
  { urutan: 11, kode: 'PINGGUL_BOKONG',            nama: 'Pinggul / bokong',         namaEn: 'Hip/Buttocks',    sisi: 'TENGAH', regio: 'PUNGGUNG_PINGGANG', petunjuk: 'Termasuk bagian yang menempel ke kursi saat duduk' },
  { urutan: 12, kode: 'PAHA_KANAN',                nama: 'Paha kanan',               namaEn: 'Thigh (Right)',   sisi: 'KANAN',  regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 13, kode: 'PAHA_KIRI',                 nama: 'Paha kiri',                namaEn: 'Thigh (Left)',    sisi: 'KIRI',   regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 14, kode: 'LUTUT_KANAN',               nama: 'Lutut kanan',              namaEn: 'Knee (Right)',    sisi: 'KANAN',  regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 15, kode: 'LUTUT_KIRI',                nama: 'Lutut kiri',               namaEn: 'Knee (Left)',     sisi: 'KIRI',   regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 16, kode: 'TUNGKAI_BAWAH_KANAN',       nama: 'Tungkai bawah kanan',      namaEn: 'Lower Leg (Right)',sisi: 'KANAN', regio: 'EKSTREMITAS_BAWAH', petunjuk: 'Betis dan tulang kering' },
  { urutan: 17, kode: 'TUNGKAI_BAWAH_KIRI',        nama: 'Tungkai bawah kiri',       namaEn: 'Lower Leg (Left)', sisi: 'KIRI',  regio: 'EKSTREMITAS_BAWAH', petunjuk: 'Betis dan tulang kering' },
] as const

export const JUMLAH_SEGMEN = SEGMEN_TUBUH.length

export const LABEL_REGIO: Record<RegioTubuh, string> = {
  LEHER: 'Leher',
  BAHU: 'Bahu',
  PUNGGUNG_PINGGANG: 'Punggung & Panggul',
  EKSTREMITAS_ATAS: 'Ekstremitas Atas',
  EKSTREMITAS_BAWAH: 'Ekstremitas Bawah',
}

const _peta = new Map(SEGMEN_TUBUH.map((s) => [s.kode, s]))

export function cariSegmen(kode: string): DefinisiSegmen | undefined {
  return _peta.get(kode)
}

export function adalahKodeSegmenValid(kode: string): boolean {
  return _peta.has(kode)
}
