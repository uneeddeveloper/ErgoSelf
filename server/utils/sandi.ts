import bcrypt from 'bcryptjs'

/**
 * Utilitas kata sandi terpusat.
 *
 * Sebelumnya kedua route masuk memakai hash pembanding literal
 * `'$2a$10$invalidinvalidinvalidinvalidinvalidinvalidin'`. String itu panjangnya
 * 51 karakter, sedangkan hash bcrypt yang sah selalu 60. bcryptjs menolaknya
 * karena panjang SEBELUM melakukan pekerjaan turunan kunci apa pun, sehingga
 * perbandingan kembali dalam ~0 ms — sementara hash yang sah memakan ~58 ms.
 *
 * Akibatnya justru kebalikan dari maksud kodenya: satu permintaan masuk dengan
 * surel sembarang membocorkan apakah surel itu terdaftar. Untuk penelitian
 * keluhan muskuloskeletal di satu tempat kerja, "apakah karyawan ini menjadi
 * partisipan" sendiri merupakan informasi yang dijanjikan rahasia pada lembar
 * persetujuan.
 *
 * `HASH_UMPAN` di bawah adalah hash bcrypt sungguhan atas string acak, dibuat
 * sekali saat modul dimuat, sehingga `bcrypt.compare` menghabiskan waktu yang
 * sama seperti pada akun yang benar-benar ada.
 */

/**
 * Faktor biaya bcrypt. 12 ≈ 4× lebih mahal daripada 10 — masih tak terasa bagi
 * satu pengguna yang sedang masuk, tetapi melipatempatkan biaya penebakan.
 */
export const BIAYA_BCRYPT = 12

/** Hash pembanding untuk akun yang tidak ditemukan. Sah, jadi tetap dihitung. */
const HASH_UMPAN = bcrypt.hashSync(
  `umpan-${Math.random().toString(36).slice(2)}-${Date.now()}`,
  BIAYA_BCRYPT,
)

export function hashSandi(sandi: string): Promise<string> {
  return bcrypt.hash(sandi, BIAYA_BCRYPT)
}

/**
 * Memeriksa kata sandi dengan waktu yang tidak bergantung pada ada/tidaknya
 * akun. Selalu panggil ini — jangan pernah melewatkan `bcrypt.compare` saat
 * akun tidak ditemukan.
 */
export function cocokkanSandi(
  sandi: string,
  hashTersimpan: string | null | undefined,
): Promise<boolean> {
  return bcrypt.compare(sandi, hashTersimpan || HASH_UMPAN)
}
