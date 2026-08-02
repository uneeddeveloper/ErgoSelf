/**
 * Katalog segmen tubuh — 28 segmen Nordic Body Map (NBM), indeks baku 0–27.
 *
 * Sumber urutan & penamaan: Nordic Body Map (Kuorinka et al., 1987) versi
 * terjemahan Indonesia yang lazim dipakai di literatur K3 (Tarwaka, 2010).
 *
 * File ini adalah SATU-SATUNYA sumber kebenaran untuk daftar segmen. Dipakai
 * oleh:
 *   - prisma/seed.ts        → mengisi tabel `segmen_tubuh`
 *   - komponen body map SVG → atribut `data-kode` tiap area klik
 *   - modul skoring         → validasi kelengkapan jawaban
 *
 * Untuk berpindah ke 20 segmen CMDQ baku (Hedge et al.), cukup ganti isi
 * array ini lalu jalankan ulang `npm run db:seed` — skema database tidak
 * perlu diubah.
 */

export type Sisi = 'TENGAH' | 'KIRI' | 'KANAN'

export type RegioTubuh =
  | 'LEHER'
  | 'BAHU'
  | 'PUNGGUNG_PINGGANG'
  | 'EKSTREMITAS_ATAS'
  | 'EKSTREMITAS_BAWAH'

export interface DefinisiSegmen {
  /** Nomor segmen NBM baku (0–27), sekaligus urutan tampil */
  urutan: number
  /** Kode stabil; dipakai sebagai `data-kode` pada body map SVG */
  kode: string
  /** Label bahasa Indonesia yang dilihat responden */
  nama: string
  /** Istilah asli NBM (untuk lampiran instrumen di tesis) */
  namaEn: string
  sisi: Sisi
  regio: RegioTubuh
  /**
   * Penjelasan tambahan untuk segmen yang namanya rancu bagi pekerja awam.
   * Terjemahan NBM Indonesia memakai "bokong" dan "pantat" untuk dua segmen
   * berbeda (buttock vs bottom) — tanpa penjelasan, responden mudah keliru.
   */
  petunjuk?: string
}

export const SEGMEN_TUBUH: readonly DefinisiSegmen[] = [
  { urutan: 0,  kode: 'LEHER_ATAS',               nama: 'Leher bagian atas',        namaEn: 'Upper neck',    sisi: 'TENGAH', regio: 'LEHER' },
  { urutan: 1,  kode: 'LEHER_BAWAH',              nama: 'Leher bagian bawah',       namaEn: 'Lower neck',    sisi: 'TENGAH', regio: 'LEHER' },
  { urutan: 2,  kode: 'BAHU_KIRI',                nama: 'Bahu kiri',                namaEn: 'Left shoulder', sisi: 'KIRI',   regio: 'BAHU' },
  { urutan: 3,  kode: 'BAHU_KANAN',               nama: 'Bahu kanan',               namaEn: 'Right shoulder',sisi: 'KANAN',  regio: 'BAHU' },
  { urutan: 4,  kode: 'LENGAN_ATAS_KIRI',         nama: 'Lengan atas kiri',         namaEn: 'Left upper arm', sisi: 'KIRI',  regio: 'EKSTREMITAS_ATAS' },
  { urutan: 5,  kode: 'PUNGGUNG',                 nama: 'Punggung',                 namaEn: 'Back',          sisi: 'TENGAH', regio: 'PUNGGUNG_PINGGANG' },
  { urutan: 6,  kode: 'LENGAN_ATAS_KANAN',        nama: 'Lengan atas kanan',        namaEn: 'Right upper arm',sisi: 'KANAN', regio: 'EKSTREMITAS_ATAS' },
  { urutan: 7,  kode: 'PINGGANG',                 nama: 'Pinggang',                 namaEn: 'Waist',         sisi: 'TENGAH', regio: 'PUNGGUNG_PINGGANG' },
  { urutan: 8,  kode: 'BOKONG',                   nama: 'Bokong',                   namaEn: 'Buttock',       sisi: 'TENGAH', regio: 'PUNGGUNG_PINGGANG', petunjuk: 'Bagian atas pantat, tepat di bawah pinggang' },
  { urutan: 9,  kode: 'PANTAT',                   nama: 'Pantat',                   namaEn: 'Bottom',        sisi: 'TENGAH', regio: 'PUNGGUNG_PINGGANG', petunjuk: 'Bagian bawah pantat yang menempel ke kursi saat duduk' },
  { urutan: 10, kode: 'SIKU_KIRI',                nama: 'Siku kiri',                namaEn: 'Left elbow',    sisi: 'KIRI',   regio: 'EKSTREMITAS_ATAS' },
  { urutan: 11, kode: 'SIKU_KANAN',               nama: 'Siku kanan',               namaEn: 'Right elbow',   sisi: 'KANAN',  regio: 'EKSTREMITAS_ATAS' },
  { urutan: 12, kode: 'LENGAN_BAWAH_KIRI',        nama: 'Lengan bawah kiri',        namaEn: 'Left forearm',  sisi: 'KIRI',   regio: 'EKSTREMITAS_ATAS' },
  { urutan: 13, kode: 'LENGAN_BAWAH_KANAN',       nama: 'Lengan bawah kanan',       namaEn: 'Right forearm', sisi: 'KANAN',  regio: 'EKSTREMITAS_ATAS' },
  { urutan: 14, kode: 'PERGELANGAN_TANGAN_KIRI',  nama: 'Pergelangan tangan kiri',  namaEn: 'Left wrist',    sisi: 'KIRI',   regio: 'EKSTREMITAS_ATAS' },
  { urutan: 15, kode: 'PERGELANGAN_TANGAN_KANAN', nama: 'Pergelangan tangan kanan', namaEn: 'Right wrist',   sisi: 'KANAN',  regio: 'EKSTREMITAS_ATAS' },
  { urutan: 16, kode: 'TANGAN_KIRI',              nama: 'Tangan kiri',              namaEn: 'Left hand',     sisi: 'KIRI',   regio: 'EKSTREMITAS_ATAS' },
  { urutan: 17, kode: 'TANGAN_KANAN',             nama: 'Tangan kanan',             namaEn: 'Right hand',    sisi: 'KANAN',  regio: 'EKSTREMITAS_ATAS' },
  { urutan: 18, kode: 'PAHA_KIRI',                nama: 'Paha kiri',                namaEn: 'Left thigh',    sisi: 'KIRI',   regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 19, kode: 'PAHA_KANAN',               nama: 'Paha kanan',               namaEn: 'Right thigh',   sisi: 'KANAN',  regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 20, kode: 'LUTUT_KIRI',               nama: 'Lutut kiri',               namaEn: 'Left knee',     sisi: 'KIRI',   regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 21, kode: 'LUTUT_KANAN',              nama: 'Lutut kanan',              namaEn: 'Right knee',    sisi: 'KANAN',  regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 22, kode: 'BETIS_KIRI',               nama: 'Betis kiri',               namaEn: 'Left calf',     sisi: 'KIRI',   regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 23, kode: 'BETIS_KANAN',              nama: 'Betis kanan',              namaEn: 'Right calf',    sisi: 'KANAN',  regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 24, kode: 'PERGELANGAN_KAKI_KIRI',    nama: 'Pergelangan kaki kiri',    namaEn: 'Left ankle',    sisi: 'KIRI',   regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 25, kode: 'PERGELANGAN_KAKI_KANAN',   nama: 'Pergelangan kaki kanan',   namaEn: 'Right ankle',   sisi: 'KANAN',  regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 26, kode: 'KAKI_KIRI',                nama: 'Kaki kiri',                namaEn: 'Left foot',     sisi: 'KIRI',   regio: 'EKSTREMITAS_BAWAH' },
  { urutan: 27, kode: 'KAKI_KANAN',               nama: 'Kaki kanan',               namaEn: 'Right foot',    sisi: 'KANAN',  regio: 'EKSTREMITAS_BAWAH' },
] as const

export const JUMLAH_SEGMEN = SEGMEN_TUBUH.length

export const LABEL_REGIO: Record<RegioTubuh, string> = {
  LEHER: 'Leher',
  BAHU: 'Bahu',
  PUNGGUNG_PINGGANG: 'Punggung & Pinggang',
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
