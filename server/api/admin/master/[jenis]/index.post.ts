/**
 * POST /api/admin/master/divisi | /api/admin/master/jabatan — menambah entri.
 */
export default defineEventHandler(async (event) => {
  await wajibAdmin(event)
  const jenis = bacaJenisMaster(event)

  const isi = skemaMaster.safeParse(await readBody(event))
  if (!isi.success) {
    throw createError({
      statusCode: 422,
      statusMessage: isi.error.issues[0]?.message ?? 'Data tidak valid.',
    })
  }

  // Entri baru diletakkan di urutan terakhir bila peneliti tidak menentukan
  // sendiri — bukan di urutan 0, yang akan menyorongkannya ke puncak daftar
  // pilihan responden hanya karena ia yang paling baru dibuat.
  const urutan =
    isi.data.urutan ??
    ((
      await tabelMaster(jenis).aggregate({ _max: { urutan: true } })
    )._max.urutan ?? 0) + 1

  try {
    const baru = await tabelMaster(jenis).create({
      data: {
        nama: isi.data.nama,
        urutan,
        aktif: isi.data.aktif ?? true,
      },
    })
    return { sukses: true, id: baru.id, nama: baru.nama }
  } catch (error) {
    galatNamaGanda(jenis, error)
  }
})
