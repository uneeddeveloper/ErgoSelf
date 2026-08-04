import type { H3Event } from 'h3'
import type { User } from '#auth-utils'

/**
 * Penjaga akses untuk route API.
 * `requireUserSession` hanya memastikan ada sesi; dua fungsi di bawah
 * memastikan sesi tersebut bertipe yang benar, supaya responden tidak bisa
 * memanggil endpoint dashboard dan sebaliknya.
 */

export async function wajibResponden(event: H3Event): Promise<User> {
  const { user } = await requireUserSession(event, {
    statusMessage: 'Silakan masuk terlebih dahulu dengan kode responden Anda.',
  })

  if (user.tipe !== 'RESPONDEN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Halaman ini hanya untuk responden.',
    })
  }

  return user
}

/**
 * Memastikan tahap sebelumnya benar-benar selesai sebelum instrumen diisi.
 *
 * `middleware/responden.ts` sudah mengarahkan alur, tetapi ia berjalan di
 * peramban dan karenanya bukan kendali. Responden yang mengirim langsung ke
 * `/api/cmdq` tanpa melewati halaman profil menghasilkan baris dengan `usia`,
 * `jenisKelamin`, `imt`, dan `durasiKomputerJamPerHari` kosong namun
 * berstatus SELESAI: skornya terhitung, demografinya tidak ada, dan dua dari
 * enam aturan rekomendasi diam-diam tidak berjalan. Pada n≈50 satu kasus
 * seperti itu tidak bisa dianggap remeh.
 *
 * Untuk SUS ada alasan tambahan yang lebih tajam: responden tidak boleh
 * menilai usabilitas aplikasi yang belum ia pakai. Skor SUS adalah variabel
 * terikat penelitian ini.
 */
export async function wajibTahapSelesai(
  respondenId: number,
  syarat: { profil?: boolean; cmdq?: boolean },
): Promise<void> {
  const status = await prisma.responden.findUnique({
    where: { id: respondenId },
    select: { statusProfil: true, statusCmdq: true },
  })

  if (!status) {
    throw createError({ statusCode: 404, statusMessage: 'Data tidak ditemukan.' })
  }

  if (syarat.profil && status.statusProfil !== 'SELESAI') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Lengkapi profil pekerja terlebih dahulu.',
    })
  }

  if (syarat.cmdq && status.statusCmdq !== 'SELESAI') {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Isi kuesioner keluhan tubuh terlebih dahulu, agar penilaian aplikasi mencerminkan pengalaman Anda memakainya.',
    })
  }
}

export async function wajibAdmin(event: H3Event): Promise<User> {
  const { user } = await requireUserSession(event, {
    statusMessage: 'Silakan masuk sebagai peneliti terlebih dahulu.',
  })

  if (user.tipe !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Halaman ini hanya untuk peneliti/admin.',
    })
  }

  return user
}
