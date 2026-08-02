import { LABEL_SINGKAT_KATEGORI_IMT, URUTAN_KATEGORI_IMT } from '~~/lib/imt'
import {
  LABEL_KATEGORI_RISIKO,
  SKOR_SEGMEN_MAKS,
  SKOR_TOTAL_MAKS,
} from '~~/lib/cmdq/skala'
import { LABEL_REGIO } from '~~/lib/cmdq/segmen'
import { TARGET_SUS } from '~~/lib/sus/skoring'

/**
 * GET /api/admin/statistik — agregat untuk grafik dashboard.
 *
 * Semua angka dihitung di database (bukan di klien) supaya tetap ringan
 * walau jumlah responden bertambah, dan supaya nilai yang tampil di grafik
 * identik dengan nilai yang diekspor ke Excel.
 */
export default defineEventHandler(async (event) => {
  await wajibAdmin(event)
  const { where, aktif } = bacaFilter(event)

  // Himpunan responden yang lolos filter — dipakai semua agregat di bawah.
  const responden = await prisma.responden.findMany({
    where,
    select: { id: true },
  })
  const idResponden = responden.map((r) => r.id)

  if (idResponden.length === 0) {
    return {
      filter: aktif,
      jumlahResponden: 0,
      progres: { profilSelesai: 0, cmdqSelesai: 0, susSelesai: 0, keduanya: 0 },
      keluhanPerSegmen: [],
      keluhanPerRegio: [],
      distribusiRisiko: [],
      distribusiImt: [],
      distribusiJenisKelamin: [],
      cmdq: null,
      sus: null,
    }
  }

  const [
    profilSelesai,
    cmdqSelesai,
    susSelesai,
    keduanya,
    perSegmen,
    segmenMaster,
    agregatCmdq,
    distribusiRisiko,
    agregatSus,
    distribusiSus,
    distribusiImt,
    distribusiJk,
  ] = await Promise.all([
    prisma.responden.count({ where: { ...where, statusProfil: 'SELESAI' } }),
    prisma.responden.count({ where: { ...where, statusCmdq: 'SELESAI' } }),
    prisma.responden.count({ where: { ...where, statusSus: 'SELESAI' } }),
    prisma.responden.count({
      where: { ...where, statusCmdq: 'SELESAI', statusSus: 'SELESAI' },
    }),

    // Rata-rata & total skor keluhan tiap segmen tubuh (agregat semua responden)
    prisma.cmdqJawaban.groupBy({
      by: ['segmenId'],
      where: { respondenId: { in: idResponden } },
      _avg: { skor: true },
      _sum: { skor: true },
      _max: { skor: true },
      _count: { _all: true },
    }),
    prisma.segmenTubuh.findMany({
      orderBy: { urutan: 'asc' },
      select: { id: true, kode: true, nama: true, regio: true, urutan: true },
    }),

    prisma.cmdqHasil.aggregate({
      where: { respondenId: { in: idResponden } },
      _avg: { skorTotal: true, jumlahSegmenBermasalah: true },
      _min: { skorTotal: true },
      _max: { skorTotal: true },
      _count: { _all: true },
    }),
    prisma.cmdqHasil.groupBy({
      by: ['kategoriRisiko'],
      where: { respondenId: { in: idResponden } },
      _count: { _all: true },
    }),

    prisma.susHasil.aggregate({
      where: { respondenId: { in: idResponden } },
      _avg: { skorTotal: true },
      _min: { skorTotal: true },
      _max: { skorTotal: true },
      _count: { _all: true },
    }),
    prisma.susHasil.groupBy({
      by: ['interpretasi'],
      where: { respondenId: { in: idResponden } },
      _count: { _all: true },
    }),

    prisma.responden.groupBy({
      by: ['kategoriImt'],
      where,
      _count: { _all: true },
    }),
    prisma.responden.groupBy({
      by: ['jenisKelamin'],
      where,
      _count: { _all: true },
    }),
  ])

  // ── Keluhan per segmen tubuh ────────────────────────────────────────────
  const perSegmenById = new Map(perSegmen.map((s) => [s.segmenId, s]))

  const keluhanPerSegmen = segmenMaster.map((seg) => {
    const agg = perSegmenById.get(seg.id)
    return {
      kode: seg.kode,
      nama: seg.nama,
      regio: seg.regio,
      urutan: seg.urutan,
      skorRataRata: Number((agg?._avg.skor?.toNumber() ?? 0).toFixed(2)),
      skorTotal: Number((agg?._sum.skor?.toNumber() ?? 0).toFixed(2)),
      skorTertinggi: Number((agg?._max.skor?.toNumber() ?? 0).toFixed(2)),
      skorSegmenMaks: SKOR_SEGMEN_MAKS,
    }
  })

  // Jumlah responden yang mengeluh (skor > 0) tiap segmen — untuk bar chart
  // "distribusi keluhan per segmen tubuh".
  const jumlahMengeluh = await prisma.cmdqJawaban.groupBy({
    by: ['segmenId'],
    where: { respondenId: { in: idResponden }, skor: { gt: 0 } },
    _count: { _all: true },
  })
  const mengeluhById = new Map(
    jumlahMengeluh.map((s) => [s.segmenId, s._count._all]),
  )

  const keluhanLengkap = keluhanPerSegmen.map((s, i) => {
    const seg = segmenMaster[i]!
    const jumlah = mengeluhById.get(seg.id) ?? 0
    return {
      ...s,
      jumlahMengeluh: jumlah,
      persenMengeluh:
        cmdqSelesai > 0 ? Number(((jumlah / cmdqSelesai) * 100).toFixed(2)) : 0,
    }
  })

  // ── Agregat per regio tubuh ─────────────────────────────────────────────
  const perRegio = new Map<string, { total: number; jumlahSegmen: number }>()
  for (const s of keluhanLengkap) {
    const kini = perRegio.get(s.regio) ?? { total: 0, jumlahSegmen: 0 }
    perRegio.set(s.regio, {
      total: kini.total + s.skorTotal,
      jumlahSegmen: kini.jumlahSegmen + 1,
    })
  }

  const keluhanPerRegio = [...perRegio.entries()].map(([regio, v]) => ({
    regio,
    label: LABEL_REGIO[regio as keyof typeof LABEL_REGIO] ?? regio,
    skorTotal: Number(v.total.toFixed(2)),
    skorRataRataPerResponden:
      cmdqSelesai > 0 ? Number((v.total / cmdqSelesai).toFixed(2)) : 0,
    jumlahSegmen: v.jumlahSegmen,
  }))

  return {
    filter: aktif,
    jumlahResponden: idResponden.length,
    progres: { profilSelesai, cmdqSelesai, susSelesai, keduanya },

    keluhanPerSegmen: keluhanLengkap,
    keluhanPerRegio,

    distribusiRisiko: (['RENDAH', 'SEDANG', 'TINGGI'] as const).map((k) => ({
      kategori: k,
      label: LABEL_KATEGORI_RISIKO[k],
      jumlah:
        distribusiRisiko.find((d) => d.kategoriRisiko === k)?._count._all ?? 0,
    })),

    // Responden yang belum menyelesaikan profil punya kategoriImt = null;
    // dihitung terpisah agar tidak tersamar sebagai salah satu kategori.
    distribusiImt: [
      ...URUTAN_KATEGORI_IMT.map((k) => ({
        kategori: k as string,
        label: LABEL_SINGKAT_KATEGORI_IMT[k],
        jumlah: distribusiImt.find((d) => d.kategoriImt === k)?._count._all ?? 0,
      })),
      {
        kategori: 'BELUM_DIISI',
        label: 'Belum diisi',
        jumlah: distribusiImt.find((d) => d.kategoriImt === null)?._count._all ?? 0,
      },
    ].filter((d) => d.kategori !== 'BELUM_DIISI' || d.jumlah > 0),

    distribusiJenisKelamin: [
      ...(['LAKI_LAKI', 'PEREMPUAN'] as const).map((k) => ({
        kategori: k as string,
        label: k === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
        jumlah: distribusiJk.find((d) => d.jenisKelamin === k)?._count._all ?? 0,
      })),
      {
        kategori: 'BELUM_DIISI',
        label: 'Belum diisi',
        jumlah: distribusiJk.find((d) => d.jenisKelamin === null)?._count._all ?? 0,
      },
    ].filter((d) => d.kategori !== 'BELUM_DIISI' || d.jumlah > 0),

    cmdq:
      agregatCmdq._count._all > 0
        ? {
            n: agregatCmdq._count._all,
            skorRataRata: Number(
              (agregatCmdq._avg.skorTotal?.toNumber() ?? 0).toFixed(2),
            ),
            skorTerendah: Number(
              (agregatCmdq._min.skorTotal?.toNumber() ?? 0).toFixed(2),
            ),
            skorTertinggi: Number(
              (agregatCmdq._max.skorTotal?.toNumber() ?? 0).toFixed(2),
            ),
            rataSegmenBermasalah: Number(
              (agregatCmdq._avg.jumlahSegmenBermasalah ?? 0).toFixed(2),
            ),
            skorTotalMaks: SKOR_TOTAL_MAKS,
          }
        : null,

    sus:
      agregatSus._count._all > 0
        ? {
            n: agregatSus._count._all,
            skorRataRata: Number(
              (agregatSus._avg.skorTotal?.toNumber() ?? 0).toFixed(2),
            ),
            skorTerendah: Number(
              (agregatSus._min.skorTotal?.toNumber() ?? 0).toFixed(2),
            ),
            skorTertinggi: Number(
              (agregatSus._max.skorTotal?.toNumber() ?? 0).toFixed(2),
            ),
            target: TARGET_SUS,
            memenuhiTarget:
              (agregatSus._avg.skorTotal?.toNumber() ?? 0) >= TARGET_SUS,
            distribusi: (
              ['NOT_ACCEPTABLE', 'MARGINAL', 'ACCEPTABLE'] as const
            ).map((k) => ({
              kategori: k,
              jumlah:
                distribusiSus.find((d) => d.interpretasi === k)?._count._all ?? 0,
            })),
          }
        : null,
  }
})
