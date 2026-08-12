/**
 * Katalog area telapak tangan CHDQ — 6 area × 2 tangan = 12 item.
 *
 * Instrumen: Cornell Hand Discomfort Questionnaire (Hedge, 1997), berkas resmi
 * `rhandq.pdf` (tangan kanan) & `lhandq.pdf` (tangan kiri) —
 * https://ergo.human.cornell.edu/ahhandmsquest.html
 *
 * KENAPA INSTRUMEN TERPISAH, BUKAN DUA ITEM DI CMDQ:
 * Cornell memang memisahkannya. CMDQ versi pekerja duduk berhenti di
 * "Wrist" — telapak tangan dan jari tidak ditanyakan sama sekali. Versi lama
 * aplikasi ini memakai segmen NBM "Tangan kiri/kanan" sebagai gantinya, yang
 * meringkas enam regio dengan makna klinis berbeda menjadi satu kotak.
 *
 * PENOMORAN AREA:
 * Form Cornell HANYA memberi label huruf ("Area A (shaded area)") dan
 * menyerahkan pengertiannya pada diagram telapak tangan yang diarsir; tidak ada
 * satu pun keterangan anatomis tertulis di berkas aslinya. Nama Indonesia di
 * bawah karena itu berstatus GLOSA — diambil dari deskripsi yang dipakai
 * literatur yang menggunakan CHDQ, bukan dari Cornell sendiri.
 *
 * Konsekuensinya untuk UI: huruf dan diagram arsiran adalah rujukan utama yang
 * dilihat responden; nama Indonesia hanya keterangan pendamping. Bila kelak
 * ditemukan bahwa glosa ini keliru, yang perlu diperbaiki hanya teks — nomor
 * item, kode, dan data yang sudah terkumpul tetap sah karena responden
 * menjawab berdasarkan gambar.
 *
 * Pengelompokan enam area itu sendiri mengikuti persarafan tangan, yang
 * menjelaskan mengapa jari manis dibelah dua: sisi radial jari manis mengikuti
 * nervus medianus (bersama telunjuk & jari tengah, area A) sedangkan sisi
 * ulnarisnya mengikuti nervus ulnaris (bersama kelingking, area B). Pemisahan
 * inilah yang membuat CHDQ berguna untuk penapisan sindrom terowongan karpal
 * pada pengguna komputer — dan yang hilang bila keenamnya dijadikan satu.
 */

export type Tangan = 'KANAN' | 'KIRI'

export type HurufArea = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface DefinisiAreaTangan {
  /** Nomor item CHDQ (0–11), sekaligus urutan tampil */
  urutan: number
  /** Kode stabil, mis. "KANAN_A" */
  kode: string
  tangan: Tangan
  huruf: HurufArea
  /** Glosa anatomis bahasa Indonesia — keterangan pendamping diagram */
  nama: string
  /** Label sebagaimana tertulis di form asli */
  namaEn: string
  /** Penjelasan batas area yang dibacakan di samping diagram */
  petunjuk: string
}

/** Definisi enam area, sama untuk kedua tangan. */
export const AREA_DASAR: readonly {
  huruf: HurufArea
  nama: string
  petunjuk: string
}[] = [
  {
    huruf: 'A',
    nama: 'Jari telunjuk, jari tengah & separuh jari manis',
    petunjuk: 'Seluruh panjang jari telunjuk dan jari tengah, ditambah sisi jari manis yang menghadap jari tengah',
  },
  {
    huruf: 'B',
    nama: 'Jari kelingking & separuh jari manis',
    petunjuk: 'Seluruh panjang jari kelingking, ditambah sisi jari manis yang menghadap kelingking',
  },
  {
    huruf: 'C',
    nama: 'Ibu jari',
    petunjuk: 'Seluruh ibu jari, dari ujung hingga pangkalnya',
  },
  {
    huruf: 'D',
    nama: 'Telapak tangan bagian atas',
    petunjuk: 'Bantalan telapak tepat di bawah pangkal keempat jari',
  },
  {
    huruf: 'E',
    nama: 'Pangkal ibu jari',
    petunjuk: 'Tonjolan berdaging di telapak tangan pada sisi ibu jari',
  },
  {
    huruf: 'F',
    nama: 'Pangkal telapak / pergelangan',
    petunjuk: 'Bagian telapak paling bawah, tepat sebelum pergelangan tangan',
  },
] as const

export const URUTAN_TANGAN: readonly Tangan[] = ['KANAN', 'KIRI'] as const

export const LABEL_TANGAN: Record<Tangan, string> = {
  KANAN: 'Tangan kanan',
  KIRI: 'Tangan kiri',
}

/**
 * Dua belas item, tangan KANAN lebih dulu — mengikuti urutan Cornell yang
 * menerbitkan `rhandq.pdf` sebagai berkas pertama, dan mengikuti kebiasaan
 * CMDQ menaruh sisi kanan di atas sisi kiri.
 */
export const AREA_TANGAN: readonly DefinisiAreaTangan[] = URUTAN_TANGAN.flatMap(
  (tangan, indeksTangan) =>
    AREA_DASAR.map((area, indeksArea) => ({
      urutan: indeksTangan * AREA_DASAR.length + indeksArea,
      kode: `${tangan}_${area.huruf}`,
      tangan,
      huruf: area.huruf,
      nama: area.nama,
      namaEn: `Area ${area.huruf}`,
      petunjuk: area.petunjuk,
    })),
)

export const JUMLAH_AREA_TANGAN = AREA_TANGAN.length
export const JUMLAH_AREA_PER_TANGAN = AREA_DASAR.length

const _peta = new Map(AREA_TANGAN.map((a) => [a.kode, a]))

export function cariAreaTangan(
  kode: string,
): DefinisiAreaTangan | undefined {
  return _peta.get(kode)
}

export function adalahKodeAreaValid(kode: string): boolean {
  return _peta.has(kode)
}

export function areaUntukTangan(tangan: Tangan): DefinisiAreaTangan[] {
  return AREA_TANGAN.filter((a) => a.tangan === tangan)
}
