import { LABEL_JENIS } from '~~/server/utils/master'

/**
 * DELETE /api/admin/master/divisi/:id — menghapus entri master divisi/jabatan.
 *
 * Entri yang sudah dirujuk responden tetap BISA dihapus. Sebelum dihapus,
 * `divisiId`/`jabatanId` pada seluruh responden yang memakainya di-set NULL
 * dalam satu transaksi. Kolom teks `divisi`/`jabatan` TIDAK disentuh — nama
 * yang dipilih responden pada saat pengisian tetap tersimpan, sehingga data
 * historis tidak hilang. Yang hilang hanya tautan ke entri master.
 *
 * Dampak ini dikomunikasikan ke admin lewat dialog konfirmasi di panel.
 *
 * Untuk sekadar menyembunyikan pilihan dari form tanpa mengubah data apa pun,
 * pakai tombol nonaktifkan (PUT dengan `aktif: false`).
 */
export default defineEventHandler(async (event) => {
  await wajibAdmin(event)
  const jenis = bacaJenisMaster(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Id tidak valid.' })
  }

  const ada = await tabelMaster(jenis).findUnique({ where: { id } })
  if (!ada) {
    throw createError({
      statusCode: 404,
      statusMessage: `${LABEL_JENIS[jenis]} tidak ditemukan.`,
    })
  }

  const jumlahPemakai = await hitungPemakai(jenis, id)

  // Hapus dalam satu transaksi: putus FK responden dulu, baru hapus master.
  // Urutan ini wajib karena relasi memakai onDelete: Restrict.
  await prisma.$transaction(async (tx) => {
    if (jumlahPemakai > 0) {
      await tx.responden.updateMany({
        where: jenis === 'divisi' ? { divisiId: id } : { jabatanId: id },
        data: jenis === 'divisi' ? { divisiId: null } : { jabatanId: null },
      })
    }
    await (jenis === 'divisi' ? tx.divisi : tx.jabatan).delete({ where: { id } })
  })

  return { sukses: true, id, nama: ada.nama, jumlahPemakai }
})
