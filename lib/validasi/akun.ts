/**
 * Skema validasi registrasi & masuk akun responden.
 * Dipakai bersama oleh klien (pesan galat per field) dan server (penjaga
 * terakhir sebelum data masuk database).
 */

import { z } from 'zod'

export const PANJANG_SANDI_MIN = 8

export const skemaDaftarAkun = z
  .object({
    nama: z
      .string({ error: 'Nama lengkap wajib diisi' })
      .trim()
      .min(2, 'Nama minimal 2 karakter')
      .max(120, 'Nama maksimal 120 karakter'),

    email: z.email('Format email tidak valid'),

    password: z
      .string({ error: 'Kata sandi wajib diisi' })
      .min(PANJANG_SANDI_MIN, `Kata sandi minimal ${PANJANG_SANDI_MIN} karakter`)
      .max(200, 'Kata sandi terlalu panjang'),

    konfirmasiPassword: z.string({ error: 'Konfirmasi kata sandi wajib diisi' }),

    /**
     * Persetujuan etik penelitian. Wajib bernilai true — responden tidak
     * boleh terdaftar tanpa informed consent yang terekam.
     */
    setujuEtik: z.literal(true, {
      error: 'Anda harus menyetujui ketentuan penelitian untuk melanjutkan',
    }),
  })
  .refine((d) => d.password === d.konfirmasiPassword, {
    path: ['konfirmasiPassword'],
    error: 'Konfirmasi kata sandi tidak sama',
  })

export const skemaMasukResponden = z.object({
  email: z.email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
})

export type DaftarAkunInput = z.input<typeof skemaDaftarAkun>
