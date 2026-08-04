/**
 * Tahapan alur responden — SATU sumber untuk seluruh indikator kemajuan.
 *
 * Sebelumnya tiap halaman menuliskan nomor dan penyebutnya sendiri, sehingga
 * responden melihat "Tahap 2 dari 5" di halaman profil lalu "Tahap 2 dari 4"
 * di halaman berikutnya — bilah kemajuannya menyusut saat maju. Halaman
 * penilaian bahkan menulis "Tahap 4 dari 4", garis finis palsu yang membuat
 * sebagian responden berhenti sebelum membuka ringkasan, yaitu satu-satunya
 * halaman yang mereka terima sebagai imbalan atas partisipasi.
 *
 * Halaman hasil (`/hasil`, `/sus/hasil`) BUKAN tahap tersendiri: keduanya
 * menampilkan keluaran dari tahap yang baru saja diselesaikan, sehingga memakai
 * nomor tahap yang sama.
 */

export interface Tahap {
  nomor: number
  kode: string
  label: string
}

export const TAHAP_ALUR: readonly Tahap[] = [
  { nomor: 1, kode: 'DAFTAR', label: 'Pendaftaran' },
  { nomor: 2, kode: 'PROFIL', label: 'Profil Pekerja' },
  { nomor: 3, kode: 'KUESIONER', label: 'Peta Keluhan Tubuh' },
  { nomor: 4, kode: 'SUS', label: 'Penilaian Aplikasi' },
  { nomor: 5, kode: 'RINGKASAN', label: 'Ringkasan Akhir' },
] as const

export const TOTAL_TAHAP = TAHAP_ALUR.length

const _peta = new Map(TAHAP_ALUR.map((t) => [t.kode, t]))

export function nomorTahap(kode: string): number {
  return _peta.get(kode)?.nomor ?? 1
}
