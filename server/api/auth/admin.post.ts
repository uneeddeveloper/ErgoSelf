import bcrypt from 'bcryptjs'
import { z } from 'zod'

/**
 * POST /api/auth/admin — login peneliti untuk mengakses dashboard.
 *
 * Pesan galat sengaja dibuat sama untuk email salah maupun kata sandi salah,
 * supaya tidak membocorkan email mana yang terdaftar.
 */

const skema = z.object({
  email: z.email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
})

const PESAN_GAGAL = 'Email atau kata sandi salah.'

export default defineEventHandler(async (event) => {
  const hasil = skema.safeParse(await readBody(event))

  if (!hasil.success) {
    throw createError({ statusCode: 422, statusMessage: PESAN_GAGAL })
  }

  const email = hasil.data.email.trim().toLowerCase()
  const admin = await prisma.admin.findUnique({ where: { email } })

  // Tetap jalankan bcrypt.compare walau admin tidak ditemukan, agar waktu
  // respons tidak membocorkan keberadaan akun (timing attack).
  const hashPembanding =
    admin?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidin'
  const cocok = await bcrypt.compare(hasil.data.password, hashPembanding)

  if (!admin || !cocok) {
    throw createError({ statusCode: 401, statusMessage: PESAN_GAGAL })
  }

  await setUserSession(event, {
    user: {
      tipe: 'ADMIN',
      id: admin.id,
      nama: admin.nama,
      email: admin.email,
    },
    masukPada: new Date().toISOString(),
  })

  return { sukses: true, admin: { nama: admin.nama, email: admin.email } }
})
