import { LABEL_KATEGORI_IMT } from '~~/lib/imt'
import {
  LABEL_KATEGORI_RISIKO,
  SARAN_KATEGORI_RISIKO,
  SKALA_FREKUENSI,
  SKOR_TOTAL_MAKS,
} from '~~/lib/cmdq/skala'
import { LABEL_REGIO, type RegioTubuh } from '~~/lib/cmdq/segmen'
import { kategorikanSkorSegmen } from '~~/lib/cmdq/skoring'
import { LABEL_INTERPRETASI, TARGET_SUS } from '~~/lib/sus/skoring'
import { susunRekomendasi } from '~~/lib/rekomendasi'

/**
 * GET /api/ringkasan — Langkah 6 alur responden: laporan akhir.
 *
 * Menggabungkan hasil CMDQ, hasil SUS, dan rekomendasi ergonomi yang disusun
 * dari regio tubuh yang benar-benar dikeluhkan responden.
 */
export default defineEventHandler(async (event) => {
  const sesi = await wajibResponden(event)

  const responden = await prisma.responden.findUnique({
    where: { id: sesi.id },
    select: {
      kodeResponden: true,
      nama: true,
      durasiKomputerJamPerHari: true,
      kategoriImt: true,
      imt: true,
      olahraga: true,
      statusProfil: true,
      statusCmdq: true,
      statusSus: true,
      cmdqHasil: {
        include: { segmenTertinggi: { select: { kode: true, nama: true } } },
      },
      susHasil: true,
    },
  })

  if (!responden) {
    await clearUserSession(event)
    throw createError({ statusCode: 404, statusMessage: 'Data tidak ditemukan.' })
  }

  if (!responden.cmdqHasil) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Ringkasan baru bisa dibuat setelah Anda menyelesaikan kuesioner keluhan tubuh.',
    })
  }

  // Segmen berkeluhan + regio yang terdampak
  const jawaban = await prisma.cmdqJawaban.findMany({
    where: { respondenId: sesi.id, skor: { gt: 0 } },
    orderBy: { skor: 'desc' },
    include: { segmen: { select: { kode: true, nama: true, regio: true } } },
  })

  const regioBermasalah = [
    ...new Set(jawaban.map((j) => j.segmen.regio)),
  ] as RegioTubuh[]

  const skorTotal = responden.cmdqHasil.skorTotal.toNumber()
  const durasi = responden.durasiKomputerJamPerHari?.toNumber() ?? null

  const rekomendasi = susunRekomendasi({
    kategoriRisiko: responden.cmdqHasil.kategoriRisiko,
    regioBermasalah,
    durasiKomputerJamPerHari: durasi,
    kategoriImt: responden.kategoriImt,
    olahraga: responden.olahraga,
  })

  // Dua sorotan temuan untuk ditampilkan sebagai poin bercentang
  const frekuensiTertinggi = jawaban.reduce(
    (maks, j) => Math.max(maks, j.frekuensiKode),
    0,
  )
  const ketidaknyamananTertinggi = jawaban.reduce(
    (maks, j) => Math.max(maks, j.ketidaknyamananSkor ?? 0),
    0,
  )
  const LABEL_INTENSITAS = ['—', 'ringan', 'sedang', 'berat']

  return {
    responden: {
      kodeResponden: responden.kodeResponden,
      nama: responden.nama,
      imt: responden.imt?.toNumber() ?? null,
      labelKategoriImt: responden.kategoriImt
        ? LABEL_KATEGORI_IMT[responden.kategoriImt]
        : null,
      durasiKomputerJamPerHari: durasi,
    },

    cmdq: {
      skorTotal,
      skorTotalMaks: SKOR_TOTAL_MAKS,
      persenDariMaks: Number(((skorTotal / SKOR_TOTAL_MAKS) * 100).toFixed(2)),
      kategoriRisiko: responden.cmdqHasil.kategoriRisiko,
      labelKategoriRisiko: LABEL_KATEGORI_RISIKO[responden.cmdqHasil.kategoriRisiko],
      saran: SARAN_KATEGORI_RISIKO[responden.cmdqHasil.kategoriRisiko],
      jumlahSegmenBermasalah: responden.cmdqHasil.jumlahSegmenBermasalah,
      jumlahSegmenDinilai: responden.cmdqHasil.jumlahSegmenDinilai,
      segmenTertinggi: responden.cmdqHasil.segmenTertinggi?.nama ?? null,
      /** Tiga area prioritas untuk ditampilkan pada kartu "titik ketidaknyamanan" */
      areaPrioritas: jawaban.slice(0, 3).map((j) => ({
        kode: j.segmen.kode,
        nama: j.segmen.nama,
        skor: j.skor.toNumber(),
        kategori: kategorikanSkorSegmen(j.skor.toNumber()),
      })),
      regioBermasalah: regioBermasalah.map((r) => ({
        kode: r,
        label: LABEL_REGIO[r],
      })),
      sorotan: [
        `Frekuensi keluhan tertinggi: ${
          SKALA_FREKUENSI.find((o) => o.nilai === frekuensiTertinggi)?.label ??
          'tidak ada keluhan'
        }`,
        `Intensitas ketidaknyamanan tertinggi: kategori ${
          LABEL_INTENSITAS[ketidaknyamananTertinggi] ?? 'tidak ada'
        }`,
        `${responden.cmdqHasil.jumlahSegmenBermasalah} dari ${responden.cmdqHasil.jumlahSegmenDinilai} bagian tubuh dilaporkan bermasalah`,
      ],
      /** Skor tiap segmen untuk mewarnai peta tubuh pada laporan */
      skorPerSegmen: Object.fromEntries(
        jawaban.map((j) => [j.segmen.kode, j.skor.toNumber()]),
      ),
    },

    sus: responden.susHasil
      ? {
          skorTotal: responden.susHasil.skorTotal.toNumber(),
          interpretasi: responden.susHasil.interpretasi,
          labelInterpretasi: LABEL_INTERPRETASI[responden.susHasil.interpretasi],
          gradeHuruf: responden.susHasil.gradeHuruf,
          adjektif: responden.susHasil.adjektif,
          memenuhiTarget: responden.susHasil.memenuhiTarget,
          target: TARGET_SUS,
        }
      : null,

    rekomendasi,
    lengkap: responden.statusCmdq === 'SELESAI' && responden.statusSus === 'SELESAI',
  }
})
