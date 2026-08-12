import { Prisma } from '@prisma/client'
import { z } from 'zod'
import {
  GalatJawabanChdq,
  hitungSkorChdq,
  type JawabanAreaInput,
} from '~~/lib/chdq/skoring'
import { LABEL_KATEGORI_RISIKO } from '~~/lib/chdq/skala'

/**
 * POST /api/chdq — menyimpan jawaban kuesioner keluhan tangan (CHDQ) &
 * menghitung skornya.
 *
 * Prinsip sama dengan `/api/cmdq`: skor TIDAK PERNAH diambil dari klien.
 * Klien hanya mengirim jawaban mentah; seluruh perhitungan diulang di server
 * memakai fungsi murni `hitungSkorChdq`.
 *
 * Pengiriman ulang diperbolehkan (responden mengoreksi jawaban): jawaban lama
 * dihapus dan diganti seluruhnya di dalam satu transaksi.
 */

const skemaJawaban = z.object({
  jawaban: z
    .array(
      z.object({
        kodeArea: z.string().min(1),
        frekuensiKode: z.number().int().nullable().optional(),
        ketidaknyamananSkor: z.number().int().nullable().optional(),
        gangguanSkor: z.number().int().nullable().optional(),
      }),
    )
    .min(1, 'Jawaban kuesioner tangan belum terisi'),
})

export default defineEventHandler(async (event) => {
  const sesi = await wajibResponden(event)
  await wajibTahapSelesai(sesi.id, { profil: true, cmdq: true })

  const isi = skemaJawaban.safeParse(await readBody(event))

  if (!isi.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Format jawaban tidak valid.',
    })
  }

  const ambang = await bacaAmbang('CHDQ')

  let hasil: ReturnType<typeof hitungSkorChdq>
  try {
    hasil = hitungSkorChdq(isi.data.jawaban as JawabanAreaInput[], {
      ambangSedang: ambang.ambangSedang,
      ambangTinggi: ambang.ambangTinggi,
    })
  } catch (error) {
    if (error instanceof GalatJawabanChdq) {
      throw createError({
        statusCode: 422,
        statusMessage: error.message,
        data: { kodeArea: error.kodeArea },
      })
    }
    throw error
  }

  const areaDb = await prisma.areaTangan.findMany({
    select: { id: true, kode: true },
  })
  const idPerKode = new Map(areaDb.map((a) => [a.kode, a.id]))

  const belumTerdaftar = hasil.perArea.filter((a) => !idPerKode.has(a.kodeArea))
  if (belumTerdaftar.length > 0) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Data area tangan di server belum lengkap. Hubungi peneliti (jalankan ulang seed database).',
    })
  }

  const kanan = hasil.perTangan.find((t) => t.tangan === 'KANAN')!
  const kiri = hasil.perTangan.find((t) => t.tangan === 'KIRI')!

  await prisma.$transaction(async (tx) => {
    await tx.chdqJawaban.deleteMany({ where: { respondenId: sesi.id } })

    await tx.chdqJawaban.createMany({
      data: hasil.perArea.map((a) => ({
        respondenId: sesi.id,
        areaId: idPerKode.get(a.kodeArea)!,
        frekuensiKode: a.frekuensiKode,
        frekuensiBobot: new Prisma.Decimal(a.frekuensiBobot),
        ketidaknyamananSkor: a.ketidaknyamananSkor,
        gangguanSkor: a.gangguanSkor,
        skor: new Prisma.Decimal(a.skor),
      })),
    })

    const rekap = {
      skorTotal: new Prisma.Decimal(hasil.skorTotal),
      skorTanganKanan: new Prisma.Decimal(kanan.skorTotal),
      skorTanganKiri: new Prisma.Decimal(kiri.skorTotal),
      tanganDominan: hasil.tanganDominan,
      jumlahAreaBermasalah: hasil.jumlahAreaBermasalah,
      kategoriRisiko: hasil.kategoriRisiko,
      areaTertinggiId: hasil.areaTertinggi
        ? idPerKode.get(hasil.areaTertinggi.kodeArea)!
        : null,
      jumlahRating: hasil.metode.jumlahRating,
      jumlahFrekuensiBerbobot: new Prisma.Decimal(
        hasil.metode.jumlahFrekuensiBerbobot,
      ),
      jumlahAreaNilaiHilang: hasil.jumlahAreaNilaiHilang,
      jumlahAreaDinilai: hasil.perArea.length,
      ambangSedang: new Prisma.Decimal(hasil.ambangSedang),
      ambangTinggi: new Prisma.Decimal(hasil.ambangTinggi),
    }

    await tx.chdqHasil.upsert({
      where: { respondenId: sesi.id },
      update: { ...rekap, selesaiPada: new Date() },
      create: { respondenId: sesi.id, ...rekap },
    })

    await tx.responden.update({
      where: { id: sesi.id },
      data: { statusChdq: 'SELESAI' },
    })
  }, BATAS_TRANSAKSI)

  return {
    sukses: true,
    hasil: {
      ...hasil,
      labelKategoriRisiko: LABEL_KATEGORI_RISIKO[hasil.kategoriRisiko],
    },
  }
})
