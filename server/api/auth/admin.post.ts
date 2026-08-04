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
  // Akun ini membuka seluruh dataset kesehatan penelitian. Pembatasan
  // percobaan di sini adalah satu-satunya penghalang antara internet dan
  // ekspor lengkap rekam kesehatan responden.
  batasiPercobaan(event, 'masuk-admin')

  const hasil = skema.safeParse(await readBody(event))

  if (!hasil.success) {
    throw createError({ statusCode: 422, statusMessage: PESAN_GAGAL })
  }

  const email = hasil.data.email.trim().toLowerCase()
  const admin = await prisma.admin.findUnique({ where: { email } })

  // Perbandingan selalu dijalankan penuh — lihat `server/utils/sandi.ts`.
  const cocok = await cocokkanSandi(hasil.data.password, admin?.passwordHash)

  if (!admin || !cocok) {
    throw createError({ statusCode: 401, statusMessage: PESAN_GAGAL })
  }

  resetPercobaan(event, 'masuk-admin')

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
