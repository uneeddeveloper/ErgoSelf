import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { GalatJawabanSus, hitungSkorSus } from '~~/lib/sus/skoring'

/**
 * POST /api/sus — menyimpan jawaban SUS & menghitung skor usability.
 *
 * Sama seperti CMDQ: klien hanya mengirim jawaban mentah 1–5, seluruh
 * perhitungan dijalankan ulang di server memakai fungsi murni `hitungSkorSus`.
 * Pengiriman ulang menimpa jawaban lama di dalam satu transaksi.
 */

const skema = z.object({
  jawaban: z
    .array(
      z.object({
        itemNomor: z.number().int(),
        skorJawaban: z.number().int(),
      }),
    )
    .min(1, 'Jawaban kuesioner belum terisi'),
})

export default defineEventHandler(async (event) => {
  const sesi = await wajibResponden(event)
  await wajibTahapSelesai(sesi.id, { profil: true, cmdq: true })

  const isi = skema.safeParse(await readBody(event))

  if (!isi.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Format jawaban tidak valid.',
    })
  }

  let hasil: ReturnType<typeof hitungSkorSus>
  try {
    hasil = hitungSkorSus(isi.data.jawaban)
  } catch (error) {
    if (error instanceof GalatJawabanSus) {
      throw createError({
        statusCode: 422,
        statusMessage: error.message,
        data: { nomorItem: error.nomorItem },
      })
    }
    throw error
  }

  // Batas waktu dinaikkan dari bawaan Prisma (maxWait 2 dtk / timeout 5 dtk).
  // Transaksi ini beberapa kali bolak-balik ke basis data lintas wilayah AWS;
  // pada TiDB Serverless yang baru bangun dari suspensi, atau lewat koneksi
  // seluler yang buruk saat pengambilan data di lapangan, bawaannya bisa habis
  // dan seluruh jawaban dibatalkan.
  await prisma.$transaction(async (tx) => {
    await tx.susJawaban.deleteMany({ where: { respondenId: sesi.id } })

    await tx.susJawaban.createMany({
      data: hasil.perItem.map((i) => ({
        respondenId: sesi.id,
        itemNomor: i.nomor,
        skorJawaban: i.skorJawaban,
      })),
    })

    const rekap = {
      skorTotal: new Prisma.Decimal(hasil.skorTotal),
      interpretasi: hasil.interpretasi,
      gradeHuruf: hasil.gradeHuruf,
      adjektif: hasil.adjektif,
      memenuhiTarget: hasil.memenuhiTarget,
    }

    await tx.susHasil.upsert({
      where: { respondenId: sesi.id },
      update: { ...rekap, selesaiPada: new Date() },
      create: { respondenId: sesi.id, ...rekap },
    })

    await tx.responden.update({
      where: { id: sesi.id },
      data: { statusSus: 'SELESAI' },
    })
  }, BATAS_TRANSAKSI)

  return { sukses: true, hasil }
})
