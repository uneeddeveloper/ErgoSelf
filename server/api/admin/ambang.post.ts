import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { hitungAmbangTersil } from '~~/lib/cmdq/ambang'
import {
  AMBANG_MIN_RESPONDEN,
  PERSENTIL_AMBANG_SEDANG,
  PERSENTIL_AMBANG_TINGGI,
} from '~~/lib/cmdq/skala'
import { kategorikanSkorTotal } from '~~/lib/cmdq/skoring'
import { kategorikanSkorChdq } from '~~/lib/chdq/skoring'

/**
 * POST /api/admin/ambang — menghitung ulang ambang kategori risiko dari tersil
 * skor responden.
 *
 * Cornell tidak menyediakan cut-off, sehingga batas RENDAH/SEDANG/TINGGI
 * adalah keputusan analisis peneliti. Endpoint ini menetapkannya dari data
 * penelitian sendiri: persentil ke-33,3 dan ke-66,7 dari skor total.
 *
 * DUA HAL YANG SENGAJA DILAKUKAN SEKALIGUS:
 *
 *  1. Baris `ambang_risiko` diperbarui — dipakai untuk pengisian berikutnya.
 *  2. SELURUH hasil yang sudah tersimpan dikategorikan ulang dengan ambang
 *     baru, berikut kolom `ambangSedang`/`ambangTinggi` pada barisnya.
 *
 * Langkah kedua bukan pilihan. Kategori risiko adalah variabel ordinal yang
 * ditabulasi-silang di Bab IV; membiarkan responden lama memakai ambang lama
 * berarti satu kolom tabel berisi campuran dua definisi kategori yang berbeda,
 * dan tidak ada satu pun angka yang menunjukkan hal itu terjadi. Karena setiap
 * baris tetap merekam ambang yang dipakainya, hasilnya tetap dapat ditelusuri.
 *
 * Data contoh (`DEMO-###`) dikecualikan — lihat `server/utils/filter.ts`.
 */

const skema = z.object({
  instrumen: z.enum(['CMDQ', 'CHDQ']),
})

const TANPA_CONTOH = {
  responden: { kodeResponden: { not: { startsWith: PREFIKS_KODE_CONTOH } } },
} as const

export default defineEventHandler(async (event) => {
  await wajibAdmin(event)

  const isi = skema.safeParse(await readBody(event))
  if (!isi.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Instrumen harus CMDQ atau CHDQ.',
    })
  }

  const { instrumen } = isi.data

  const skor =
    instrumen === 'CMDQ'
      ? (
          await prisma.cmdqHasil.findMany({
            where: TANPA_CONTOH,
            select: { skorTotal: true },
          })
        ).map((r) => r.skorTotal.toNumber())
      : (
          await prisma.chdqHasil.findMany({
            where: TANPA_CONTOH,
            select: { skorTotal: true },
          })
        ).map((r) => r.skorTotal.toNumber())

  if (skor.length < AMBANG_MIN_RESPONDEN) {
    throw createError({
      statusCode: 409,
      statusMessage: `Baru ${skor.length} responden yang menyelesaikan kuesioner ini. Tersil baru stabil pada minimal ${AMBANG_MIN_RESPONDEN} responden.`,
    })
  }

  const hasil = hitungAmbangTersil(skor)

  const kategorikan =
    instrumen === 'CMDQ' ? kategorikanSkorTotal : kategorikanSkorChdq

  await prisma.$transaction(async (tx) => {
    await tx.ambangRisiko.upsert({
      where: { instrumen },
      update: {
        ambangSedang: new Prisma.Decimal(hasil.ambangSedang),
        ambangTinggi: new Prisma.Decimal(hasil.ambangTinggi),
        persentilSedang: new Prisma.Decimal(PERSENTIL_AMBANG_SEDANG),
        persentilTinggi: new Prisma.Decimal(PERSENTIL_AMBANG_TINGGI),
        jumlahResponden: hasil.jumlahResponden,
        dariData: hasil.dariData,
        catatan: hasil.peringatan.join(' ') || null,
        dihitungPada: new Date(),
      },
      create: {
        instrumen,
        ambangSedang: new Prisma.Decimal(hasil.ambangSedang),
        ambangTinggi: new Prisma.Decimal(hasil.ambangTinggi),
        persentilSedang: new Prisma.Decimal(PERSENTIL_AMBANG_SEDANG),
        persentilTinggi: new Prisma.Decimal(PERSENTIL_AMBANG_TINGGI),
        jumlahResponden: hasil.jumlahResponden,
        dariData: hasil.dariData,
        catatan: hasil.peringatan.join(' ') || null,
      },
    })

    // Kategorisasi ulang. Dikelompokkan menjadi tiga UPDATE massal alih-alih
    // satu per responden: pada n≈50 selisihnya tak terasa, tetapi transaksi ini
    // memegang kunci tulis atas seluruh tabel hasil, dan 50 perjalanan
    // bolak-balik cukup untuk menyentuh batas waktu transaksi.
    const tabel = instrumen === 'CMDQ' ? tx.cmdqHasil : tx.chdqHasil
    const kolomAmbang = {
      ambangSedang: new Prisma.Decimal(hasil.ambangSedang),
      ambangTinggi: new Prisma.Decimal(hasil.ambangTinggi),
    }

    await tabel.updateMany({
      where: { ...TANPA_CONTOH, skorTotal: { lte: hasil.ambangSedang } },
      data: { ...kolomAmbang, kategoriRisiko: 'RENDAH' },
    })
    await tabel.updateMany({
      where: {
        ...TANPA_CONTOH,
        skorTotal: { gt: hasil.ambangSedang, lte: hasil.ambangTinggi },
      },
      data: { ...kolomAmbang, kategoriRisiko: 'SEDANG' },
    })
    await tabel.updateMany({
      where: { ...TANPA_CONTOH, skorTotal: { gt: hasil.ambangTinggi } },
      data: { ...kolomAmbang, kategoriRisiko: 'TINGGI' },
    })
  }, BATAS_TRANSAKSI)

  // Pemeriksaan silang: ketiga UPDATE di atas memakai perbandingan SQL,
  // sedangkan aplikasi memakai `kategorikan...()`. Keduanya harus setuju —
  // kalau tidak, ada responden yang kategorinya berubah tanpa skornya berubah.
  const contohBatas = kategorikan(
    hasil.ambangSedang,
    hasil.ambangSedang,
    hasil.ambangTinggi,
  )
  if (contohBatas !== 'RENDAH') {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Aturan batas kategori tidak konsisten antara SQL dan aplikasi. Hubungi pengembang.',
    })
  }

  return {
    sukses: true,
    instrumen,
    ...hasil,
  }
})
