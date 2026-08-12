/**
 * GET /api/admin/master/divisi | /api/admin/master/jabatan
 *
 * Daftar lengkap untuk panel admin — termasuk entri nonaktif, berikut jumlah
 * responden yang memakainya. Berbeda dari `/api/sosiodemografi` yang dipakai
 * form responden dan hanya memuat entri aktif.
 */
export default defineEventHandler(async (event) => {
  await wajibAdmin(event)
  const jenis = bacaJenisMaster(event)

  return { jenis, daftar: await daftarMaster(jenis) }
})
