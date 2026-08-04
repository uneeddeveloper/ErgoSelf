import { PrismaClient } from '@prisma/client'

/**
 * Satu instance PrismaClient dipakai bersama seluruh route API.
 * Disimpan di globalThis supaya hot-reload Nuxt saat `npm run dev` tidak
 * membuka koneksi baru berulang kali sampai kehabisan connection pool.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Batas waktu untuk transaksi interaktif penulisan kuesioner.
 *
 * Bawaan Prisma (maxWait 2 detik, timeout 5 detik) diukur untuk basis data
 * lokal. Aplikasi ini menyasar TiDB Cloud Serverless lintas wilayah: satu
 * transaksi berisi beberapa perjalanan bolak-balik ber-TLS, dan klaster yang
 * baru bangun dari suspensi otomatis menambah jeda di awal. Bila batas waktu
 * terlampaui, seluruh 28 jawaban dibatalkan dan responden hanya melihat galat
 * tanpa tahu apakah datanya tersimpan — tepat pada momen ia paling mungkin
 * menyerah.
 */
export const BATAS_TRANSAKSI = { maxWait: 10_000, timeout: 20_000 } as const
