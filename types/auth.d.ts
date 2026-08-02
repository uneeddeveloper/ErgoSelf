/**
 * Perluasan tipe sesi milik `nuxt-auth-utils`.
 *
 * Aplikasi ini punya dua jenis pengguna yang berbagi satu mekanisme sesi
 * (cookie tersegel/terenkripsi):
 *   - RESPONDEN : pekerja yang mengisi kuesioner, masuk dengan kode responden
 *   - ADMIN     : peneliti, masuk dengan email + kata sandi
 */

declare module '#auth-utils' {
  interface User {
    tipe: 'RESPONDEN' | 'ADMIN'
    id: number
    nama: string
    email?: string
    /** Hanya terisi bila tipe = RESPONDEN */
    kodeResponden?: string
    /**
     * Penanda apakah langkah 2 (profil pekerja) sudah diisi. Disimpan di
     * sesi agar middleware bisa mengarahkan alur tanpa memanggil database
     * pada setiap perpindahan halaman.
     */
    profilLengkap?: boolean
  }

  interface UserSession {
    masukPada?: string
  }

  interface SecureSessionData {}
}

export {}
