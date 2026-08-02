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
