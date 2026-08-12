import { LABEL_JENIS } from '~~/server/utils/master'

/**
 * DELETE /api/admin/master/divisi/:id — menghapus entri yang BELUM dipakai.
 *
 * Entri yang sudah dirujuk responden TIDAK BOLEH dihapus, dan penolakannya
 * ditegakkan di sini alih-alih dibiarkan menjadi galat foreign key. Alasannya
 * bukan sekadar pesan yang lebih ramah: kalau penghapusan berhasil, satu-satunya
 * jejak yang tersisa adalah teks `responden.divisi`, dan pertanyaan "responden
 * ini memilih dari daftar atau mengetik sendiri lewat Lainnya?" tidak bisa
 * dijawab lagi. Perbedaan itu menentukan apakah kategorinya sah dianalisis.
 *
 * Untuk menyingkirkan pilihan dari form tanpa menghapus data, panel admin
 * menyediakan tombol nonaktifkan (PUT dengan `aktif: false`).
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
  if (jumlahPemakai > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `"${ada.nama}" sudah dipakai ${jumlahPemakai} responden dan tidak bisa dihapus. Nonaktifkan saja agar tidak lagi muncul pada form responden baru.`,
    })
  }

  await tabelMaster(jenis).delete({ where: { id } })

  return { sukses: true, id, nama: ada.nama }
})
