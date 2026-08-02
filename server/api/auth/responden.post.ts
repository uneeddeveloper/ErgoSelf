import bcrypt from 'bcryptjs'
import { skemaMasukResponden } from '~~/lib/validasi/akun'

/**
 * POST /api/auth/responden — responden masuk dengan email + kata sandi.
 *
 * Pesan galat sengaja seragam untuk email tidak dikenal maupun kata sandi
 * salah, supaya tidak membocorkan email mana yang terdaftar sebagai peserta
 * penelitian.
 */

const PESAN_GAGAL = 'Email atau kata sandi salah.'

export default defineEventHandler(async (event) => {
  const hasil = skemaMasukResponden.safeParse(await readBody(event))

  if (!hasil.success) {
    throw createError({ statusCode: 422, statusMessage: PESAN_GAGAL })
  }

  const email = hasil.data.email.trim().toLowerCase()
  const responden = await prisma.responden.findUnique({
    where: { email },
    select: {
      id: true,
      nama: true,
      email: true,
      kodeResponden: true,
      passwordHash: true,
      statusProfil: true,
      statusCmdq: true,
      statusSus: true,
    },
  })

  // Tetap jalankan bcrypt.compare walau akun tidak ditemukan, agar waktu
  // respons tidak membocorkan keberadaan akun (timing attack).
  const hashPembanding =
    responden?.passwordHash ??
    '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidin'
  const cocok = await bcrypt.compare(hasil.data.password, hashPembanding)

  if (!responden || !cocok) {
    throw createError({ statusCode: 401, statusMessage: PESAN_GAGAL })
  }

  await setUserSession(event, {
    user: {
      tipe: 'RESPONDEN',
      id: responden.id,
      nama: responden.nama,
      kodeResponden: responden.kodeResponden,
      email: responden.email,
      profilLengkap: responden.statusProfil === 'SELESAI',
    },
    masukPada: new Date().toISOString(),
  })

  return {
    sukses: true,
    responden: {
      nama: responden.nama,
      kodeResponden: responden.kodeResponden,
      statusProfil: responden.statusProfil,
      statusCmdq: responden.statusCmdq,
      statusSus: responden.statusSus,
    },
  }
})
