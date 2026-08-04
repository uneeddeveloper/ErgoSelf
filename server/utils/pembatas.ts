import type { H3Event } from 'h3'

/**
 * Pembatas laju sederhana untuk endpoint autentikasi.
 *
 * Tanpa ini, satu prompt kata sandi tanpa penghalang berdiri di antara
 * internet dan ekspor lengkap rekam kesehatan bernama. Alamat surel peneliti
 * mudah ditebak (lazimnya alamat institusi, dan `.env.example` bahkan memuat
 * satu sebagai contoh), sementara bcrypt hanya membebani CPU server — bukan
 * memperlambat penyerang yang membuka 20 koneksi paralel.
 *
 * Sengaja disimpan DI MEMORI, bukan di basis data:
 *   - penelitian ini berjalan pada satu proses server, jadi penghitung
 *     bersama tidak diperlukan;
 *   - menulis setiap percobaan gagal ke basis data justru menciptakan jalur
 *     pembanjiran tulis yang baru;
 *   - kehilangan penghitung saat proses dijalankan ulang dapat diterima:
 *     dampaknya hanya mengembalikan jatah, bukan membuka akses.
 *
 * Bila aplikasi kelak berjalan multi-instance, ganti isi modul ini dengan
 * penyimpanan bersama (Redis / tabel) — antarmukanya tidak perlu berubah.
 */

interface Jendela {
  jumlah: number
  mulai: number
}

const PANJANG_JENDELA_MS = 15 * 60 * 1000
const BATAS_PER_JENDELA = 8

/** Dibersihkan sesekali supaya peta tidak tumbuh tanpa batas. */
const catatan = new Map<string, Jendela>()
let bersihTerakhir = Date.now()

function bersihkanKedaluwarsa(sekarang: number): void {
  if (sekarang - bersihTerakhir < PANJANG_JENDELA_MS) return
  bersihTerakhir = sekarang
  for (const [kunci, j] of catatan) {
    if (sekarang - j.mulai > PANJANG_JENDELA_MS) catatan.delete(kunci)
  }
}

function alamat(event: H3Event): string {
  // `xForwardedFor` dipercaya hanya bila aplikasi berada di balik proksi yang
  // menetapkannya. Untuk penelitian tertutup ini cukup; jangan jadikan dasar
  // keputusan otorisasi apa pun.
  return getRequestIP(event, { xForwardedFor: true }) ?? 'tidak-diketahui'
}

/**
 * Menaikkan penghitung percobaan dan menolak bila melewati batas.
 *
 * @param ruang Pemisah antar endpoint, mis. `'masuk-admin'`.
 * @throws 429 bila jatah dalam jendela berjalan sudah habis
 */
export function batasiPercobaan(event: H3Event, ruang: string): void {
  const sekarang = Date.now()
  bersihkanKedaluwarsa(sekarang)

  const kunci = `${ruang}:${alamat(event)}`
  const jendela = catatan.get(kunci)

  if (!jendela || sekarang - jendela.mulai > PANJANG_JENDELA_MS) {
    catatan.set(kunci, { jumlah: 1, mulai: sekarang })
    return
  }

  jendela.jumlah += 1

  if (jendela.jumlah > BATAS_PER_JENDELA) {
    const sisaDetik = Math.ceil(
      (PANJANG_JENDELA_MS - (sekarang - jendela.mulai)) / 1000,
    )
    setHeader(event, 'Retry-After', String(sisaDetik))
    throw createError({
      statusCode: 429,
      statusMessage: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(sisaDetik / 60)} menit.`,
    })
  }
}

/** Menghapus penghitung setelah masuk berhasil, agar tidak menghukum salah ketik. */
export function resetPercobaan(event: H3Event, ruang: string): void {
  catatan.delete(`${ruang}:${alamat(event)}`)
}
