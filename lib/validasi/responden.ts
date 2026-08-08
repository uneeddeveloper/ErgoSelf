/**
 * Skema validasi data profil pekerja (langkah 2 alur responden).
 *
 * Nama dan email TIDAK ada di sini — keduanya sudah tersimpan saat registrasi
 * akun (lihat `lib/validasi/akun.ts`). File ini hanya mengurus data
 * demografi, pekerjaan, antropometri, dan riwayat.
 *
 * Dipakai DUA KALI:
 *   - di server (`server/api/responden/profil.put.ts`) sebagai penjaga
 *     terakhir sebelum data masuk database;
 *   - di klien (`pages/profil.vue`) untuk menampilkan pesan galat per field.
 *
 * Semua pesan galat berbahasa Indonesia karena dibaca langsung oleh pekerja.
 */

import { z } from 'zod'
import { BATAS_BERAT_KG, BATAS_TINGGI_CM } from '../imt'

export const BATAS_FREKUENSI_OLAHRAGA = { min: 1, maks: 14 } as const

/** Helper universal untuk menangani data wajib diisi (string/boolean/angka) */
const wajibDiisi = (pesan: string) =>
  z.preprocess((val, ctx) => {
    if (val === undefined || val === null || val === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: pesan })
      return z.NEVER
    }
    return val
  }, z.any())

/** Helper khusus untuk input angka dari form */
const angkaLonggar = (pesanWajib: string) =>
  z.preprocess((val, ctx) => {
    if (val === undefined || val === null || val === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: pesanWajib })
      return z.NEVER
    }
    const bersih = typeof val === 'string' ? val.trim().replace(',', '.') : val
    const angka = Number(bersih)
    if (Number.isNaN(angka)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: pesanWajib })
      return z.NEVER
    }
    return angka
  }, z.number())

export const skemaProfilResponden = z
  .object({
    unitKerja: z
      .string()
      .trim()
      .max(120, 'Unit kerja maksimal 120 karakter')
      .optional()
      .transform((v) => (v === '' ? undefined : v)),

    usia: wajibDiisi('Usia wajib dipilih'),

    jenisKelamin: wajibDiisi('Jenis kelamin wajib dipilih').refine(
      (v) => v === 'LAKI_LAKI' || v === 'PEREMPUAN',
      { message: 'Jenis kelamin wajib dipilih' }
    ),

    masaKerjaTahun: wajibDiisi('Masa kerja wajib dipilih'),

    durasiKomputerJamPerHari: wajibDiisi('Durasi penggunaan komputer wajib dipilih'),

    tinggiBadanCm: angkaLonggar('Tinggi badan wajib diisi').refine(
      (v) => v >= BATAS_TINGGI_CM.min && v <= BATAS_TINGGI_CM.maks,
      `Tinggi badan harus antara ${BATAS_TINGGI_CM.min}–${BATAS_TINGGI_CM.maks} cm`
    ),

    beratBadanKg: angkaLonggar('Berat badan wajib diisi').refine(
      (v) => v >= BATAS_BERAT_KG.min && v <= BATAS_BERAT_KG.maks,
      `Berat badan harus antara ${BATAS_BERAT_KG.min}–${BATAS_BERAT_KG.maks} kg`
    ),

    olahraga: wajibDiisi('Kebiasaan olahraga wajib dipilih'),

    frekuensiOlahragaPerMinggu: angkaLonggar('Frekuensi olahraga wajib diisi')
      .optional()
      .refine(
        (v) => v === undefined || Number.isInteger(v),
        'Frekuensi olahraga harus bilangan bulat'
      )
      .refine(
        (v) =>
          v === undefined ||
          (v >= BATAS_FREKUENSI_OLAHRAGA.min && v <= BATAS_FREKUENSI_OLAHRAGA.maks),
        `Frekuensi olahraga harus antara ${BATAS_FREKUENSI_OLAHRAGA.min}–${BATAS_FREKUENSI_OLAHRAGA.maks} kali per minggu`
      ),

    merokok: wajibDiisi('Kebiasaan merokok wajib dipilih'),

    riwayatMsds: wajibDiisi('Riwayat gangguan otot/rangka wajib dipilih'),

    keteranganRiwayatMsds: z
      .string()
      .trim()
      .max(500, 'Keterangan maksimal 500 karakter')
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
  })
  .refine(
    (data) => !data.olahraga || data.frekuensiOlahragaPerMinggu !== undefined,
    {
      path: ['frekuensiOlahragaPerMinggu'],
      message: 'Isi berapa kali Anda berolahraga dalam seminggu',
    }
  )
  .refine((data) => !data.riwayatMsds || !!data.keteranganRiwayatMsds, {
    path: ['keteranganRiwayatMsds'],
    message: 'Jelaskan singkat riwayat gangguan yang pernah dialami',
  })
  .transform((data) => ({
    ...data,
    frekuensiOlahragaPerMinggu: data.olahraga ? data.frekuensiOlahragaPerMinggu : undefined,
    keteranganRiwayatMsds: data.riwayatMsds ? data.keteranganRiwayatMsds : undefined,
  }))

export type ProfilRespondenInput = z.input<typeof skemaProfilResponden>
export type ProfilRespondenOutput = z.output<typeof skemaProfilResponden>

export function petaGalat(error: z.ZodError): Record<string, string> {
  const hasil: Record<string, string> = {}
  for (const isu of error.issues) {
    const kunci = isu.path.join('.') || '_'
    if (!(kunci in hasil)) hasil[kunci] = isu.message
  }
  return hasil
}