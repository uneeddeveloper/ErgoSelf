import { cariItemSus } from '~~/lib/sus/item'
import {
  LABEL_INTERPRETASI,
  TARGET_SUS,
  hitungKontribusiItem,
} from '~~/lib/sus/skoring'

/**
 * GET /api/sus/saya — hasil SUS responden yang sedang masuk.
 * Dipakai halaman hasil dan untuk mengisi ulang form bila responden
 * ingin mengoreksi jawabannya.
 */
export default defineEventHandler(async (event) => {
  const sesi = await wajibResponden(event)

  const rekap = await prisma.susHasil.findUnique({
    where: { respondenId: sesi.id },
  })

  if (!rekap) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Anda belum mengisi kuesioner SUS.',
    })
  }

  const jawaban = await prisma.susJawaban.findMany({
    where: { respondenId: sesi.id },
    orderBy: { itemNomor: 'asc' },
  })

  const skorTotal = rekap.skorTotal.toNumber()

  return {
    perItem: jawaban.map((j) => ({
      nomor: j.itemNomor,
      pernyataan: cariItemSus(j.itemNomor)?.pernyataan ?? '',
      nada: cariItemSus(j.itemNomor)?.nada ?? 'POSITIF',
      skorJawaban: j.skorJawaban,
      kontribusi: hitungKontribusiItem(j.itemNomor, j.skorJawaban),
    })),
    skorTotal,
    interpretasi: rekap.interpretasi,
    labelInterpretasi: LABEL_INTERPRETASI[rekap.interpretasi],
    gradeHuruf: rekap.gradeHuruf,
    adjektif: rekap.adjektif,
    memenuhiTarget: rekap.memenuhiTarget,
    target: TARGET_SUS,
    selisihTarget: Number((skorTotal - TARGET_SUS).toFixed(2)),
    selesaiPada: rekap.selesaiPada,
  }
})
