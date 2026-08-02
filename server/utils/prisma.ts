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
