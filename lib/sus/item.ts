/**
 * Butir kuesioner System Usability Scale (SUS).
 *
 * Teks asli: Brooke, J. (1996). "SUS: A quick and dirty usability scale".
 * Terjemahan Indonesia: Sharfina, Z. & Santoso, H. B. (2016). "An Indonesian
 * adaptation of the System Usability Scale (SUS)", ICACSIS 2016 — versi yang
 * sudah diuji validitas & reliabilitasnya, sehingga layak dikutip di tesis.
 *
 * URUTAN DAN NADA KALIMAT TIDAK BOLEH DIUBAH. Rumus skor SUS bergantung pada
 * pola selang-seling: item ganjil bernada positif, item genap bernada negatif.
 */

export type NadaItem = 'POSITIF' | 'NEGATIF'

export interface ItemSus {
  /** 1–10, sesuai urutan baku kuesioner SUS */
  nomor: number
  /** Pernyataan bahasa Indonesia yang dibaca responden */
  pernyataan: string
  /** Teks asli Brooke (1996), untuk lampiran instrumen di tesis */
  pernyataanEn: string
  nada: NadaItem
}

export const ITEM_SUS: readonly ItemSus[] = [
  {
    nomor: 1,
    pernyataan: 'Saya berpikir akan menggunakan aplikasi ini lagi.',
    pernyataanEn: 'I think that I would like to use this system frequently.',
    nada: 'POSITIF',
  },
  {
    nomor: 2,
    pernyataan: 'Saya merasa aplikasi ini rumit untuk digunakan.',
    pernyataanEn: 'I found the system unnecessarily complex.',
    nada: 'NEGATIF',
  },
  {
    nomor: 3,
    pernyataan: 'Saya merasa aplikasi ini mudah digunakan.',
    pernyataanEn: 'I thought the system was easy to use.',
    nada: 'POSITIF',
  },
  {
    nomor: 4,
    pernyataan:
      'Saya membutuhkan bantuan orang lain atau teknisi dalam menggunakan aplikasi ini.',
    pernyataanEn:
      'I think that I would need the support of a technical person to be able to use this system.',
    nada: 'NEGATIF',
  },
  {
    nomor: 5,
    pernyataan: 'Saya merasa fitur-fitur aplikasi ini berjalan dengan semestinya.',
    pernyataanEn: 'I found the various functions in this system were well integrated.',
    nada: 'POSITIF',
  },
  {
    nomor: 6,
    pernyataan:
      'Saya merasa ada banyak hal yang tidak konsisten (tidak serasi) pada aplikasi ini.',
    pernyataanEn: 'I thought there was too much inconsistency in this system.',
    nada: 'NEGATIF',
  },
  {
    nomor: 7,
    pernyataan:
      'Saya merasa orang lain akan memahami cara menggunakan aplikasi ini dengan cepat.',
    pernyataanEn:
      'I would imagine that most people would learn to use this system very quickly.',
    nada: 'POSITIF',
  },
  {
    nomor: 8,
    pernyataan: 'Saya merasa aplikasi ini membingungkan.',
    pernyataanEn: 'I found the system very cumbersome to use.',
    nada: 'NEGATIF',
  },
  {
    nomor: 9,
    pernyataan: 'Saya merasa tidak ada hambatan dalam menggunakan aplikasi ini.',
    pernyataanEn: 'I felt very confident using the system.',
    nada: 'POSITIF',
  },
  {
    nomor: 10,
    pernyataan:
      'Saya perlu membiasakan diri terlebih dahulu sebelum menggunakan aplikasi ini.',
    pernyataanEn:
      'I needed to learn a lot of things before I could get going with this system.',
    nada: 'NEGATIF',
  },
] as const

export const JUMLAH_ITEM_SUS = ITEM_SUS.length

/** Skala Likert 5 titik — nilai 1 s.d. 5 */
export const SKALA_SUS = [
  { nilai: 1, label: 'Sangat Tidak Setuju' },
  { nilai: 2, label: 'Tidak Setuju' },
  { nilai: 3, label: 'Netral' },
  { nilai: 4, label: 'Setuju' },
  { nilai: 5, label: 'Sangat Setuju' },
] as const

export const SKOR_JAWABAN_MIN = 1
export const SKOR_JAWABAN_MAKS = 5

const _peta = new Map(ITEM_SUS.map((i) => [i.nomor, i]))

export function cariItemSus(nomor: number): ItemSus | undefined {
  return _peta.get(nomor)
}
