import {
  SKALA_FREKUENSI,
  SKALA_GANGGUAN,
  SKALA_KETIDAKNYAMANAN,
  SKOR_SEGMEN_MAKS,
  SKOR_TOTAL_MAKS,
} from '~~/lib/cmdq/skala'

/**
 * GET /api/segmen — katalog segmen tubuh + definisi skala jawaban.
 *
 * Dipakai body map untuk menggambar area klik dan membangun form dinamis,
 * sehingga daftar segmen di UI selalu mengikuti isi database (bukan salinan
 * yang bisa basi).
 */
export default defineEventHandler(async () => {
  const segmen = await prisma.segmenTubuh.findMany({
    where: { aktif: true },
    orderBy: { urutan: 'asc' },
    select: {
      id: true,
      kode: true,
      nama: true,
      namaEn: true,
      sisi: true,
      regio: true,
      urutan: true,
    },
  })

  return {
    segmen,
    skala: {
      frekuensi: SKALA_FREKUENSI,
      ketidaknyamanan: SKALA_KETIDAKNYAMANAN,
      gangguan: SKALA_GANGGUAN,
    },
    skorSegmenMaks: SKOR_SEGMEN_MAKS,
    skorTotalMaks: SKOR_TOTAL_MAKS,
  }
})
