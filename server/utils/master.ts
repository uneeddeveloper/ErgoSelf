import type { H3Event } from 'h3'
import { z } from 'zod'
import { MAKS_KARAKTER_SOSIODEMOGRAFI, NILAI_LAINNYA } from '~~/lib/sosiodemografi'

/**
 * Logika bersama CMS master sosiodemografi (divisi & jabatan).
 *
 * Kedua tabel berperilaku identik, jadi aturannya ditulis SEKALI di sini dan
 * dipakai oleh route `/api/admin/master/[jenis]`. Menyalinnya menjadi dua
 * berkas route yang mirip adalah cara paling mudah membuat divisi dan jabatan
 * lambat laun tunduk pada aturan berbeda — mis. satu melarang penghapusan
 * entri terpakai sementara yang lain lupa.
 */

export type JenisMaster = 'divisi' | 'jabatan'

export const JENIS_MASTER: readonly JenisMaster[] = ['divisi', 'jabatan']

export const LABEL_JENIS: Record<JenisMaster, string> = {
  divisi: 'Divisi',
  jabatan: 'Jabatan',
}

export function bacaJenisMaster(event: H3Event): JenisMaster {
  const jenis = getRouterParam(event, 'jenis')
  if (jenis !== 'divisi' && jenis !== 'jabatan') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Jenis master tidak dikenali.',
    })
  }
  return jenis
}

/** Delegasi Prisma untuk jenis yang diminta. Keduanya sebentuk. */
export function tabelMaster(jenis: JenisMaster) {
  return jenis === 'divisi' ? prisma.divisi : prisma.jabatan
}

export const skemaMaster = z.object({
  nama: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter')
    .max(
      MAKS_KARAKTER_SOSIODEMOGRAFI,
      `Nama maksimal ${MAKS_KARAKTER_SOSIODEMOGRAFI} karakter`,
    )
    // Kata "Lainnya" adalah penanda pada form profil, bukan kategori. Bila ia
    // sampai menjadi entri master, responden bisa memilihnya sebagai divisi
    // sungguhan dan kolomnya berisi "Lainnya" untuk banyak orang berbeda —
    // persis kondisi yang penanda itu dirancang untuk dicegah.
    .refine(
      (v) => v.toLowerCase() !== NILAI_LAINNYA.toLowerCase(),
      `"${NILAI_LAINNYA}" adalah penanda pada form, tidak boleh dijadikan pilihan`,
    ),
  urutan: z.number().int().min(0).max(999).optional(),
  aktif: z.boolean().optional(),
})

export type MasterInput = z.infer<typeof skemaMaster>

/**
 * Menghitung berapa responden yang memakai entri ini.
 *
 * Dipakai dua kali: untuk ditampilkan di panel, dan sebagai penjaga sebelum
 * penghapusan. Angkanya diambil dari foreign key (`divisiId`), BUKAN dari
 * pencocokan nama — responden yang mengetik nama identik lewat "Lainnya" tidak
 * boleh ikut terhitung sebagai pemakai entri master.
 */
export async function hitungPemakai(
  jenis: JenisMaster,
  id: number,
): Promise<number> {
  return prisma.responden.count({
    where: jenis === 'divisi' ? { divisiId: id } : { jabatanId: id },
  })
}

export async function daftarMaster(jenis: JenisMaster) {
  const baris = await tabelMaster(jenis).findMany({
    orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
  })

  const pemakai =
    jenis === 'divisi'
      ? await prisma.responden.groupBy({
          by: ['divisiId'],
          _count: { _all: true },
          where: { divisiId: { not: null } },
        })
      : await prisma.responden.groupBy({
          by: ['jabatanId'],
          _count: { _all: true },
          where: { jabatanId: { not: null } },
        })

  const jumlahPerId = new Map(
    pemakai.map((p) => [
      (jenis === 'divisi'
        ? (p as { divisiId: number | null }).divisiId
        : (p as { jabatanId: number | null }).jabatanId)!,
      p._count._all,
    ]),
  )

  return baris.map((b) => ({
    id: b.id,
    nama: b.nama,
    urutan: b.urutan,
    aktif: b.aktif,
    jumlahResponden: jumlahPerId.get(b.id) ?? 0,
    dibuatPada: b.dibuatPada,
  }))
}

/** Mengubah galat "nama sudah ada" dari Prisma menjadi pesan yang bisa dibaca. */
export function galatNamaGanda(jenis: JenisMaster, error: unknown): never {
  if (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage: `${LABEL_JENIS[jenis]} dengan nama itu sudah ada.`,
    })
  }
  throw error
}
