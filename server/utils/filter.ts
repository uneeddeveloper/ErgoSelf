import type { H3Event } from 'h3'
import type { Prisma } from '@prisma/client'

/**
 * Filter dashboard peneliti — dipakai bersama oleh endpoint rekapitulasi,
 * statistik, dan ekspor, supaya angka di tabel, grafik, dan file Excel
 * selalu berasal dari himpunan responden yang sama.
 *
 * Query string yang dikenali:
 *   ?jenisKelamin=LAKI_LAKI|PEREMPUAN
 *   ?usiaMin=20&usiaMaks=40
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

function angkaOpsional(nilai: unknown): number | undefined {
  if (typeof nilai !== 'string' || nilai.trim() === '') return undefined
  const angka = Number(nilai)
  return Number.isFinite(angka) ? angka : undefined
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
  const usiaMin = angkaOpsional(q.usiaMin)
  const usiaMaks = angkaOpsional(q.usiaMaks)

  const kategoriImt =
    typeof q.kategoriImt === 'string' && q.kategoriImt.trim() !== ''
      ? q.kategoriImt
          .split(',')
          .map((k) => k.trim())
          .filter((k): k is (typeof KATEGORI_IMT)[number] =>
            (KATEGORI_IMT as readonly string[]).includes(k),
          )
      : undefined

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

  if (usiaMin !== undefined || usiaMaks !== undefined) {
    where.usia = {
      ...(usiaMin !== undefined ? { gte: usiaMin } : {}),
      ...(usiaMaks !== undefined ? { lte: usiaMaks } : {}),
    }
  }

  if (cari) {
    where.OR = [
      { nama: { contains: cari } },
      { kodeResponden: { contains: cari } },
      { unitKerja: { contains: cari } },
    ]
  }

  return {
    where,
    aktif: {
      jenisKelamin: jenisKelamin ?? null,
      usiaMin: usiaMin ?? null,
      usiaMaks: usiaMaks ?? null,
      kategoriImt: kategoriImt ?? null,
      statusProfil: statusProfil ?? null,
      statusCmdq: statusCmdq ?? null,
      statusSus: statusSus ?? null,
      cari: cari ?? null,
      sertakanContoh,
    },
  }
}
