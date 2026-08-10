import type { H3Event } from 'h3'
import type { Prisma } from '@prisma/client'
import { OPSI_DIVISI, OPSI_JABATAN, OPSI_USIA } from '~~/lib/sosiodemografi'

/**
 * Filter dashboard peneliti — dipakai bersama oleh endpoint rekapitulasi,
 * statistik, dan ekspor, supaya angka di tabel, grafik, dan file Excel
 * selalu berasal dari himpunan responden yang sama.
 *
 * Query string yang dikenali:
 *   ?jenisKelamin=LAKI_LAKI|PEREMPUAN
 *   ?usia=23-28 Thn,29-34 Thn         (boleh lebih dari satu, dipisah koma)
 *   ?divisi=Teknologi Informasi       (boleh lebih dari satu, dipisah koma)
 *   ?jabatan=Staf / Pelaksana         (boleh lebih dari satu, dipisah koma)
 *   ?kategoriImt=NORMAL,OBESITAS      (boleh lebih dari satu, dipisah koma)
 *   ?statusProfil=SELESAI|BELUM
 *   ?statusCmdq=SELESAI|BELUM
 *   ?statusSus=SELESAI|BELUM
 *   ?cari=budi                        (nama atau kode responden)
 *   ?sertakanContoh=1                 (ikutkan responden demo — lihat di bawah)
 *
 * DATA CONTOH DIKECUALIKAN SECARA BAWAAN.
 * `prisma/contoh.ts` membuat responden berkode `DEMO-###` dengan jawaban CMDQ
 * dan SUS lengkap untuk menguji tampilan dasbor. Data itu FIKTIF. Bila ikut
 * terhitung, ia mencemari statistik deskriptif, tabulasi silang, dan berkas
 * ekspor yang menjadi dataset tesis — pada n≈50 kontaminasinya mencapai ~19%.
 * Mengandalkan ingatan untuk menjalankan `npm run db:bersihkan` bukan kendali
 * yang memadai, jadi pengecualiannya ditegakkan di sini.
 */

/** Awalan kode responden yang dibuat `prisma/contoh.ts`. */
export const PREFIKS_KODE_CONTOH = 'DEMO-'

const JENIS_KELAMIN = ['LAKI_LAKI', 'PEREMPUAN'] as const
const KATEGORI_IMT = [
  'KURUS_BERAT',
  'KURUS_RINGAN',
  'NORMAL',
  'GEMUK_RINGAN',
  'OBESITAS',
] as const
const STATUS = ['BELUM', 'BERLANGSUNG', 'SELESAI'] as const

/**
 * Membaca parameter "boleh lebih dari satu, dipisah koma" dan MEMBUANG nilai
 * yang tidak ada di daftar sah.
 *
 * Penyaringan terhadap daftar sah bukan sekadar kerapian: tanpa itu, siapa pun
 * yang menyusun query string bisa menitipkan ribuan nilai ke klausa `IN` satu
 * kueri. Nilai bebas yang diketik responden lewat pilihan "Lainnya" memang
 * tidak bisa difilter dari sini — untuk itu tersedia kotak pencarian `?cari=`
 * yang juga menyisir kolom divisi dan jabatan.
 */
function daftarValid<T extends readonly string[]>(
  nilai: unknown,
  daftar: T,
): T[number][] | undefined {
  if (typeof nilai !== 'string' || nilai.trim() === '') return undefined
  const terpilih = nilai
    .split(',')
    .map((k) => k.trim())
    .filter((k): k is T[number] => (daftar as readonly string[]).includes(k))
  return terpilih.length > 0 ? terpilih : undefined
}

function pilihanValid<T extends readonly string[]>(
  nilai: unknown,
  daftar: T,
): T[number] | undefined {
  return typeof nilai === 'string' && (daftar as readonly string[]).includes(nilai)
    ? (nilai as T[number])
    : undefined
}

export interface FilterDashboard {
  where: Prisma.RespondenWhereInput
  /** Bentuk filter yang sudah dinormalisasi — dikirim balik ke UI */
  aktif: Record<string, unknown>
}

export function bacaFilter(event: H3Event): FilterDashboard {
  const q = getQuery(event)

  const sertakanContoh = q.sertakanContoh === '1'
  const jenisKelamin = pilihanValid(q.jenisKelamin, JENIS_KELAMIN)
  const statusProfil = pilihanValid(q.statusProfil, STATUS)
  const statusCmdq = pilihanValid(q.statusCmdq, STATUS)
  const statusSus = pilihanValid(q.statusSus, STATUS)
  // Usia adalah KATEGORI rentang ("23-28 Thn"), bukan angka. Sebelumnya
  // parameter ini dibaca sebagai `usiaMin`/`usiaMaks` lalu dibandingkan dengan
  // `gte`/`lte` — perbandingan yang pada kolom VARCHAR berjalan secara
  // leksikografis, sehingga "> 52 Thn" terhitung lebih kecil dari "17-22 Thn".
  const usia = daftarValid(q.usia, OPSI_USIA)
  const divisi = daftarValid(q.divisi, OPSI_DIVISI)
  const jabatan = daftarValid(q.jabatan, OPSI_JABATAN)
  const kategoriImt = daftarValid(q.kategoriImt, KATEGORI_IMT)

  const cari =
    typeof q.cari === 'string' && q.cari.trim() !== '' ? q.cari.trim() : undefined

  const where: Prisma.RespondenWhereInput = {}

  if (!sertakanContoh) {
    where.kodeResponden = { not: { startsWith: PREFIKS_KODE_CONTOH } }
  }

  if (jenisKelamin) where.jenisKelamin = jenisKelamin
  if (statusProfil) where.statusProfil = statusProfil
  if (statusCmdq) where.statusCmdq = statusCmdq
  if (statusSus) where.statusSus = statusSus
  if (kategoriImt?.length) where.kategoriImt = { in: kategoriImt }
  if (usia?.length) where.usia = { in: usia }
  if (divisi?.length) where.divisi = { in: divisi }
  if (jabatan?.length) where.jabatan = { in: jabatan }

  if (cari) {
    where.OR = [
      { nama: { contains: cari } },
      { kodeResponden: { contains: cari } },
      { divisi: { contains: cari } },
      { jabatan: { contains: cari } },
      { unitKerja: { contains: cari } },
    ]
  }

  return {
    where,
    aktif: {
      jenisKelamin: jenisKelamin ?? null,
      usia: usia ?? null,
      divisi: divisi ?? null,
      jabatan: jabatan ?? null,
      kategoriImt: kategoriImt ?? null,
      statusProfil: statusProfil ?? null,
      statusCmdq: statusCmdq ?? null,
      statusSus: statusSus ?? null,
      cari: cari ?? null,
      sertakanContoh,
    },
  }
}
