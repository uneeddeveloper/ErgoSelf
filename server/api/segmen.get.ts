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
 * Dipakai body map untuk menggambar area klik dan membangun form dinamis.
 *
 * SENGAJA TIDAK menyaring `aktif`. Otoritas kelengkapan instrumen adalah
 * `SEGMEN_TUBUH` di `lib/cmdq/segmen.ts`, yang mewajibkan seluruh 28 segmen
 * terjawab (lihat `hitungSkorCmdq`). Bila endpoint ini mengembalikan lebih
 * sedikit segmen daripada konstanta itu, form akan menampilkan jumlah yang
 * kurang dan SETIAP pengiriman CMDQ ditolak 422 secara permanen — untuk semua
 * responden sekaligus. Kolom `aktif` dipertahankan di skema hanya sebagai
 * penanda dokumentasi.
 */
export default defineEventHandler(async () => {
  const segmen = await prisma.segmenTubuh.findMany({
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
