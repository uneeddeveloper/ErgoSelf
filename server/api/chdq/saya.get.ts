import {
  LABEL_KATEGORI_RISIKO,
  SKOR_AREA_MAKS,
  SKOR_CHDQ_MAKS,
  SKOR_TANGAN_MAKS,
} from '~~/lib/chdq/skala'
import { kategorikanSkorArea } from '~~/lib/chdq/skoring'

/**
 * GET /api/chdq/saya — hasil CHDQ responden yang sedang masuk.
 * Dipakai halaman hasil dan untuk mengisi ulang form saat responden ingin
 * mengoreksi jawabannya.
 */
export default defineEventHandler(async (event) => {
  const sesi = await wajibResponden(event)

  const rekap = await prisma.chdqHasil.findUnique({
    where: { respondenId: sesi.id },
    include: {
      areaTertinggi: { select: { kode: true, nama: true, huruf: true, tangan: true } },
    },
  })

  if (!rekap) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Anda belum mengisi kuesioner keluhan tangan.',
    })
  }

  const jawaban = await prisma.chdqJawaban.findMany({
    where: { respondenId: sesi.id },
    orderBy: { area: { urutan: 'asc' } },
    include: {
      area: {
        select: {
          kode: true,
          nama: true,
          huruf: true,
          tangan: true,
          urutan: true,
        },
      },
    },
  })

  const perArea = jawaban.map((j) => {
    const skor = j.skor.toNumber()
    return {
      kodeArea: j.area.kode,
      nama: j.area.nama,
      huruf: j.area.huruf,
      tangan: j.area.tangan,
      urutan: j.area.urutan,
      frekuensiKode: j.frekuensiKode,
      frekuensiBobot: j.frekuensiBobot.toNumber(),
      ketidaknyamananSkor: j.ketidaknyamananSkor,
      gangguanSkor: j.gangguanSkor,
      skor,
      kategori: kategorikanSkorArea(skor),
    }
  })

  const skorTotal = rekap.skorTotal.toNumber()

  return {
    perArea,
    perTangan: [
      {
        tangan: 'KANAN' as const,
        skorTotal: rekap.skorTanganKanan.toNumber(),
        skorMaks: SKOR_TANGAN_MAKS,
      },
      {
        tangan: 'KIRI' as const,
        skorTotal: rekap.skorTanganKiri.toNumber(),
        skorMaks: SKOR_TANGAN_MAKS,
      },
    ],
    skorTotal,
    tanganDominan: rekap.tanganDominan,
    jumlahAreaBermasalah: rekap.jumlahAreaBermasalah,
    kategoriRisiko: rekap.kategoriRisiko,
    labelKategoriRisiko: LABEL_KATEGORI_RISIKO[rekap.kategoriRisiko],
    areaTertinggi: rekap.areaTertinggi
      ? {
          kodeArea: rekap.areaTertinggi.kode,
          nama: rekap.areaTertinggi.nama,
          huruf: rekap.areaTertinggi.huruf,
          tangan: rekap.areaTertinggi.tangan,
        }
      : null,
    jumlahAreaDinilai: rekap.jumlahAreaDinilai,
    skorAreaMaks: SKOR_AREA_MAKS,
    skorTotalMaks: SKOR_CHDQ_MAKS,
    persenDariMaks: Number(((skorTotal / SKOR_CHDQ_MAKS) * 100).toFixed(2)),
    ambangSedang: rekap.ambangSedang.toNumber(),
    ambangTinggi: rekap.ambangTinggi.toNumber(),
    metode: {
      jumlahGejala: rekap.jumlahAreaBermasalah,
      jumlahRating: rekap.jumlahRating,
      jumlahFrekuensiBerbobot: rekap.jumlahFrekuensiBerbobot.toNumber(),
      skorPerkalian: skorTotal,
    },
    jumlahAreaNilaiHilang: rekap.jumlahAreaNilaiHilang,
    selesaiPada: rekap.selesaiPada,
  }
})
