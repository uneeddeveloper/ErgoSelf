/**
 * Pembeda antara "data memang belum ada" dan "gagal memuat data".
 *
 * Ketiga halaman hasil sebelumnya menampilkan pesan yang sama untuk keduanya:
 * "Belum ada hasil — Anda belum mengisi kuesioner". Artinya satu gangguan
 * jaringan sesaat setelah pengiriman BERHASIL akan memberi tahu responden
 * bahwa jawabannya tidak pernah masuk, dan mengundangnya mengisi ulang seluruh
 * kuesioner. Bagi penelitian, itu satu kasus yang datanya tertimpa isian
 * terburu-buru.
 *
 * API memakai 404 ("belum pernah mengisi") dan 409 ("prasyarat belum
 * terpenuhi") untuk keadaan kosong yang wajar. Kode lain — termasuk galat
 * jaringan yang tidak punya `statusCode` sama sekali — berarti gagal memuat.
 */

const KODE_BELUM_ADA = [404, 409]

export function belumAdaData(galat: unknown): boolean {
  const kode = (galat as { statusCode?: number } | null)?.statusCode
  return typeof kode === 'number' && KODE_BELUM_ADA.includes(kode)
}
