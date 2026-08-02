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

export const BATAS_USIA = { min: 17, maks: 70 } as const
export const BATAS_MASA_KERJA = { min: 0, maks: 50 } as const
export const BATAS_DURASI_KOMPUTER = { min: 0, maks: 24 } as const
export const BATAS_FREKUENSI_OLAHRAGA = { min: 1, maks: 14 } as const

/** Menerima "170", "170,5" maupun 170.5 → 170.5 */
const angkaLonggar = z.preprocess((nilai) => {
  if (typeof nilai === 'string') {
    const bersih = nilai.trim().replace(',', '.')
    if (bersih === '') return undefined
    const angka = Number(bersih)
    return Number.isNaN(angka) ? nilai : angka
  }
  return nilai
}, z.number())

export const skemaProfilResponden = z
  .object({
    unitKerja: z
      .string()
      .trim()
      .max(120, 'Unit kerja maksimal 120 karakter')
      .optional()
      .transform((v) => (v === '' ? undefined : v)),

    usia: angkaLonggar
      .refine(Number.isInteger, 'Usia harus bilangan bulat')
      .refine(
        (v) => v >= BATAS_USIA.min && v <= BATAS_USIA.maks,
        `Usia harus antara ${BATAS_USIA.min}–${BATAS_USIA.maks} tahun`,
      ),

    jenisKelamin: z.enum(['LAKI_LAKI', 'PEREMPUAN'], {
      error: 'Jenis kelamin wajib dipilih',
    }),

    masaKerjaTahun: angkaLonggar.refine(
      (v) => v >= BATAS_MASA_KERJA.min && v <= BATAS_MASA_KERJA.maks,
      `Masa kerja harus antara ${BATAS_MASA_KERJA.min}–${BATAS_MASA_KERJA.maks} tahun`,
    ),

    durasiKomputerJamPerHari: angkaLonggar.refine(
      (v) =>
        v >= BATAS_DURASI_KOMPUTER.min && v <= BATAS_DURASI_KOMPUTER.maks,
      `Durasi penggunaan komputer harus antara ${BATAS_DURASI_KOMPUTER.min}–${BATAS_DURASI_KOMPUTER.maks} jam per hari`,
    ),

    tinggiBadanCm: angkaLonggar.refine(
      (v) => v >= BATAS_TINGGI_CM.min && v <= BATAS_TINGGI_CM.maks,
      `Tinggi badan harus antara ${BATAS_TINGGI_CM.min}–${BATAS_TINGGI_CM.maks} cm`,
    ),

    beratBadanKg: angkaLonggar.refine(
      (v) => v >= BATAS_BERAT_KG.min && v <= BATAS_BERAT_KG.maks,
      `Berat badan harus antara ${BATAS_BERAT_KG.min}–${BATAS_BERAT_KG.maks} kg`,
    ),

    olahraga: z.boolean({ error: 'Kebiasaan olahraga wajib dipilih' }),

    frekuensiOlahragaPerMinggu: angkaLonggar
      .refine(Number.isInteger, 'Frekuensi olahraga harus bilangan bulat')
      .refine(
        (v) =>
          v >= BATAS_FREKUENSI_OLAHRAGA.min &&
          v <= BATAS_FREKUENSI_OLAHRAGA.maks,
        `Frekuensi olahraga harus antara ${BATAS_FREKUENSI_OLAHRAGA.min}–${BATAS_FREKUENSI_OLAHRAGA.maks} kali per minggu`,
      )
      .optional(),

    merokok: z.boolean({ error: 'Kebiasaan merokok wajib dipilih' }),

    riwayatMsds: z.boolean({
      error: 'Riwayat gangguan otot/rangka wajib dipilih',
    }),

    keteranganRiwayatMsds: z
      .string()
      .trim()
      .max(500, 'Keterangan maksimal 500 karakter')
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
  })
  // Frekuensi olahraga hanya wajib bila responden menjawab "ya" berolahraga.
  .refine(
    (data) => !data.olahraga || data.frekuensiOlahragaPerMinggu !== undefined,
    {
      path: ['frekuensiOlahragaPerMinggu'],
      error: 'Isi berapa kali Anda berolahraga dalam seminggu',
    },
  )
  // Keterangan riwayat hanya wajib bila menjawab "ya" punya riwayat.
  .refine((data) => !data.riwayatMsds || !!data.keteranganRiwayatMsds, {
    path: ['keteranganRiwayatMsds'],
    error: 'Jelaskan singkat riwayat gangguan yang pernah dialami',
  })
  // Bersihkan data yang tidak relevan agar tidak tersimpan menyesatkan.
  .transform((data) => ({
    ...data,
    frekuensiOlahragaPerMinggu: data.olahraga
      ? data.frekuensiOlahragaPerMinggu
      : undefined,
    keteranganRiwayatMsds: data.riwayatMsds
      ? data.keteranganRiwayatMsds
      : undefined,
  }))

export type ProfilRespondenInput = z.input<typeof skemaProfilResponden>
export type ProfilRespondenOutput = z.output<typeof skemaProfilResponden>

/**
 * Mengubah ZodError menjadi peta { namaField: pesan } supaya mudah
 * ditampilkan di bawah masing-masing input pada form.
 */
export function petaGalat(error: z.ZodError): Record<string, string> {
  const hasil: Record<string, string> = {}
  for (const isu of error.issues) {
    const kunci = isu.path.join('.') || '_'
    if (!(kunci in hasil)) hasil[kunci] = isu.message
  }
  return hasil
}
