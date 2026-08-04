import { Prisma } from '@prisma/client'
import { z } from 'zod'
import {
  GalatJawabanCmdq,
  hitungSkorCmdq,
  type JawabanSegmenInput,
} from '~~/lib/cmdq/skoring'
import {
  LABEL_KATEGORI_RISIKO,
  SARAN_KATEGORI_RISIKO,
} from '~~/lib/cmdq/skala'

/**
 * POST /api/cmdq — menyimpan jawaban kuesioner keluhan tubuh & menghitung skor.
 *
 * Prinsip: skor TIDAK PERNAH diambil dari klien. Klien hanya mengirim jawaban
 * mentah; seluruh perhitungan dilakukan ulang di server memakai fungsi murni
 * `hitungSkorCmdq`, sehingga angka yang tersimpan di database dijamin
 * konsisten dan tidak dapat dimanipulasi.
 *
 * Pengiriman ulang diperbolehkan (responden mengoreksi jawaban): jawaban lama
 * dihapus dan diganti seluruhnya di dalam satu transaksi.
 */

const skemaJawaban = z.object({
  jawaban: z
    .array(
      z.object({
        kodeSegmen: z.string().min(1),
        frekuensiKode: z.number().int(),
        ketidaknyamananSkor: z.number().int().nullable().optional(),
        gangguanSkor: z.number().int().nullable().optional(),
      }),
    )
    .min(1, 'Jawaban kuesioner belum terisi'),
})

export default defineEventHandler(async (event) => {
  const sesi = await wajibResponden(event)
  await wajibTahapSelesai(sesi.id, { profil: true })

  const isi = skemaJawaban.safeParse(await readBody(event))

  if (!isi.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Format jawaban tidak valid.',
    })
  }

  // ── Hitung & validasi (fungsi murni, tanpa sentuhan database) ──────────
  let hasil: ReturnType<typeof hitungSkorCmdq>
  try {
    hasil = hitungSkorCmdq(isi.data.jawaban as JawabanSegmenInput[])
  } catch (error) {
    if (error instanceof GalatJawabanCmdq) {
      throw createError({
        statusCode: 422,
        statusMessage: error.message,
        data: { kodeSegmen: error.kodeSegmen },
      })
    }
    throw error
  }

  // ── Petakan kode segmen → id database ──────────────────────────────────
  const segmenDb = await prisma.segmenTubuh.findMany({
    select: { id: true, kode: true },
  })
  const idPerKode = new Map(segmenDb.map((s) => [s.kode, s.id]))

  const belumTerdaftar = hasil.perSegmen.filter(
    (s) => !idPerKode.has(s.kodeSegmen),
  )
  if (belumTerdaftar.length > 0) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Data segmen tubuh di server belum lengkap. Hubungi peneliti (jalankan ulang seed database).',
    })
  }

  // ── Simpan dalam satu transaksi ────────────────────────────────────────
  // Batas waktu dinaikkan dari bawaan Prisma: transaksi ini menulis 28 baris
  // plus rekap lewat beberapa perjalanan bolak-balik. Bila bawaan 5 detik
  // terlampaui, seluruh jawaban responden dibatalkan dan ia melihat galat 500
  // tanpa tahu apakah datanya tersimpan.
  await prisma.$transaction(async (tx) => {
    await tx.cmdqJawaban.deleteMany({ where: { respondenId: sesi.id } })

    await tx.cmdqJawaban.createMany({
      data: hasil.perSegmen.map((s) => ({
        respondenId: sesi.id,
        segmenId: idPerKode.get(s.kodeSegmen)!,
        frekuensiKode: s.frekuensiKode,
        frekuensiBobot: new Prisma.Decimal(s.frekuensiBobot),
        ketidaknyamananSkor: s.ketidaknyamananSkor,
        gangguanSkor: s.gangguanSkor,
        skor: new Prisma.Decimal(s.skor),
      })),
    })

    const rekap = {
      skorTotal: new Prisma.Decimal(hasil.skorTotal),
      skorRataRata: new Prisma.Decimal(hasil.skorRataRata),
      jumlahSegmenBermasalah: hasil.jumlahSegmenBermasalah,
      kategoriRisiko: hasil.kategoriRisiko,
      segmenTertinggiId: hasil.segmenTertinggi
        ? idPerKode.get(hasil.segmenTertinggi.kodeSegmen)!
        : null,
      jumlahSegmenDinilai: hasil.jumlahSegmenDinilai,
      ambangSedang: new Prisma.Decimal(hasil.ambangSedang),
      ambangTinggi: new Prisma.Decimal(hasil.ambangTinggi),
    }

    await tx.cmdqHasil.upsert({
      where: { respondenId: sesi.id },
      update: { ...rekap, selesaiPada: new Date() },
      create: { respondenId: sesi.id, ...rekap },
    })

    await tx.responden.update({
      where: { id: sesi.id },
      data: { statusCmdq: 'SELESAI' },
    })
  }, BATAS_TRANSAKSI)

  return {
    sukses: true,
    hasil: {
      ...hasil,
      labelKategoriRisiko: LABEL_KATEGORI_RISIKO[hasil.kategoriRisiko],
      saran: SARAN_KATEGORI_RISIKO[hasil.kategoriRisiko],
    },
  }
})
