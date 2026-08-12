import {
  AMBANG_MIN_RESPONDEN,
  PERSENTIL_AMBANG_SEDANG,
  PERSENTIL_AMBANG_TINGGI,
  SKOR_TOTAL_MAKS,
} from '~~/lib/cmdq/skala'
import { SKOR_CHDQ_MAKS } from '~~/lib/chdq/skala'

/**
 * GET /api/admin/ambang — ambang kategori risiko yang sedang berlaku, beserta
 * kesiapan datanya.
 *
 * `jumlahRespondenSiap` sengaja dilaporkan terpisah dari `jumlahResponden`
 * yang tersimpan di baris ambang: yang pertama adalah keadaan data SEKARANG,
 * yang kedua keadaan saat ambang terakhir dihitung. Selisih keduanya itulah
 * yang memberi tahu peneliti bahwa ambangnya sudah tertinggal.
 */
export default defineEventHandler(async (event) => {
  await wajibAdmin(event)

  const [cmdq, chdq, siapCmdq, siapChdq] = await Promise.all([
    bacaAmbang('CMDQ'),
    bacaAmbang('CHDQ'),
    prisma.cmdqHasil.count({
      where: {
        responden: { kodeResponden: { not: { startsWith: PREFIKS_KODE_CONTOH } } },
      },
    }),
    prisma.chdqHasil.count({
      where: {
        responden: { kodeResponden: { not: { startsWith: PREFIKS_KODE_CONTOH } } },
      },
    }),
  ])

  return {
    minResponden: AMBANG_MIN_RESPONDEN,
    persentilSedang: PERSENTIL_AMBANG_SEDANG,
    persentilTinggi: PERSENTIL_AMBANG_TINGGI,
    instrumen: [
      {
        kode: 'CMDQ' as const,
        label: 'Keluhan tubuh (CMDQ)',
        skorMaks: SKOR_TOTAL_MAKS,
        jumlahRespondenSiap: siapCmdq,
        dapatDihitung: siapCmdq >= AMBANG_MIN_RESPONDEN,
        ...cmdq,
      },
      {
        kode: 'CHDQ' as const,
        label: 'Keluhan tangan (CHDQ)',
        skorMaks: SKOR_CHDQ_MAKS,
        jumlahRespondenSiap: siapChdq,
        dapatDihitung: siapChdq >= AMBANG_MIN_RESPONDEN,
        ...chdq,
      },
    ],
  }
})
