import { Prisma } from '@prisma/client'
import { skemaDaftarAkun } from '~~/lib/validasi/akun'
import { petaGalat } from '~~/lib/validasi/responden'

/**
 * POST /api/auth/daftar — Langkah 1 alur responden: registrasi akun.
 *
 * Yang dibuat di sini hanyalah AKUN (nama, email, kata sandi) beserta
 * rekaman persetujuan etik. Data demografi & antropometri diisi terpisah
 * pada langkah 2 (`PUT /api/responden/profil`).
 *
 * Kode responden anonim dibuat otomatis di sini agar peneliti bisa memakainya
 * sejak awal, meskipun kredensial masuk adalah email + kata sandi.
 */

const MAKS_PERCOBAAN_KODE = 5

export default defineEventHandler(async (event) => {
  // Balasan 409 di bawah membocorkan apakah sebuah surel sudah terdaftar
  // sebagai partisipan. Pesan itu dibutuhkan responden yang lupa sudah
  // mendaftar, jadi yang dibatasi adalah lajunya: menyapu daftar surel satu
  // perusahaan menjadi tidak praktis.
  batasiPercobaan(event, 'daftar')

  const hasil = skemaDaftarAkun.safeParse(await readBody(event))

  if (!hasil.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Data pendaftaran belum lengkap atau tidak valid.',
      data: { galat: petaGalat(hasil.error) },
    })
  }

  const data = hasil.data
  const email = data.email.trim().toLowerCase()

  const sudahAda = await prisma.responden.findUnique({
    where: { email },
    select: { id: true },
  })
  if (sudahAda) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email ini sudah terdaftar. Silakan masuk.',
      data: { galat: { email: 'Email ini sudah terdaftar' } },
    })
  }

  const passwordHash = await hashSandi(data.password)

  for (let percobaan = 1; percobaan <= MAKS_PERCOBAAN_KODE; percobaan++) {
    const kodeResponden = await kodeRespondenBerikutnya()

    try {
      const responden = await prisma.responden.create({
        data: {
          kodeResponden,
          nama: data.nama,
          email,
          passwordHash,
          setujuEtik: true,
          tanggalPersetujuan: new Date(),
        },
        select: { id: true, kodeResponden: true, nama: true, email: true },
      })

      await setUserSession(event, {
        user: {
          tipe: 'RESPONDEN',
          id: responden.id,
          nama: responden.nama,
          kodeResponden: responden.kodeResponden,
          email: responden.email,
          profilLengkap: false,
        },
        masukPada: new Date().toISOString(),
      })

      setResponseStatus(event, 201)
      return { sukses: true, responden }
    } catch (error) {
      const bentrok =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'

      // Bentrok pada email berarti ada pendaftaran bersamaan — jangan diulang.
      const targetEmail =
        bentrok && String((error as Prisma.PrismaClientKnownRequestError).meta?.target ?? '').includes('email')

      if (targetEmail) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Email ini sudah terdaftar. Silakan masuk.',
          data: { galat: { email: 'Email ini sudah terdaftar' } },
        })
      }

      if (bentrok && percobaan < MAKS_PERCOBAAN_KODE) continue

      throw createError({
        statusCode: 500,
        statusMessage: 'Gagal membuat akun. Silakan coba lagi beberapa saat lagi.',
      })
    }
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Gagal membuat kode responden unik. Silakan coba lagi.',
  })
})
