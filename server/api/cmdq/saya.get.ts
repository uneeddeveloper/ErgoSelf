import {
  LABEL_KATEGORI_RISIKO,
  SARAN_KATEGORI_RISIKO,
  SKOR_SEGMEN_MAKS,
  SKOR_TOTAL_MAKS,
} from '~~/lib/cmdq/skala'
import { kategorikanSkorSegmen } from '~~/lib/cmdq/skoring'

/**
 * GET /api/cmdq/saya — hasil CMDQ responden yang sedang masuk.
 * Dipakai halaman hasil dan untuk mengisi ulang form saat responden
 * ingin mengoreksi jawabannya.
 */
export default defineEventHandler(async (event) => {
  const sesi = await wajibResponden(event)

  const rekap = await prisma.cmdqHasil.findUnique({
    where: { respondenId: sesi.id },
    include: { segmenTertinggi: { select: { kode: true, nama: true } } },
  })

  if (!rekap) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Anda belum mengisi kuesioner keluhan tubuh.',
    })
  }

  const jawaban = await prisma.cmdqJawaban.findMany({
    where: { respondenId: sesi.id },
    orderBy: { segmen: { urutan: 'asc' } },
    include: {
      segmen: { select: { kode: true, nama: true, regio: true, urutan: true } },
    },
  })

  const perSegmen = jawaban.map((j) => {
    const skor = j.skor.toNumber()
    return {
      kodeSegmen: j.segmen.kode,
      nama: j.segmen.nama,
      regio: j.segmen.regio,
      urutan: j.segmen.urutan,
      frekuensiKode: j.frekuensiKode,
      frekuensiBobot: j.frekuensiBobot.toNumber(),
      ketidaknyamananSkor: j.ketidaknyamananSkor,
      gangguanSkor: j.gangguanSkor,
      skor,
      kategori: kategorikanSkorSegmen(skor),
    }
  })

  const skorTotal = rekap.skorTotal.toNumber()

  return {
    perSegmen,
    skorTotal,
    skorRataRata: rekap.skorRataRata.toNumber(),
    jumlahSegmenBermasalah: rekap.jumlahSegmenBermasalah,
    kategoriRisiko: rekap.kategoriRisiko,
    labelKategoriRisiko: LABEL_KATEGORI_RISIKO[rekap.kategoriRisiko],
    saran: SARAN_KATEGORI_RISIKO[rekap.kategoriRisiko],
    segmenTertinggi: rekap.segmenTertinggi
      ? {
          kodeSegmen: rekap.segmenTertinggi.kode,
          nama: rekap.segmenTertinggi.nama,
        }
      : null,
    jumlahSegmenDinilai: rekap.jumlahSegmenDinilai,
    skorSegmenMaks: SKOR_SEGMEN_MAKS,
    skorTotalMaks: SKOR_TOTAL_MAKS,
    persenDariMaks: Number(((skorTotal / SKOR_TOTAL_MAKS) * 100).toFixed(2)),
    ambangSedang: rekap.ambangSedang.toNumber(),
    ambangTinggi: rekap.ambangTinggi.toNumber(),
    selesaiPada: rekap.selesaiPada,
  }
})
