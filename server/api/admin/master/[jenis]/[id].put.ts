import { LABEL_JENIS } from '~~/server/utils/master'

/**
 * PUT /api/admin/master/divisi/:id — mengubah nama, urutan, atau status aktif.
 *
 * PENGGANTIAN NAMA TIDAK MERAMBAT KE RESPONDEN LAMA, dan itu disengaja.
 * Kolom `responden.divisi` menyimpan nama yang berlaku SAAT responden mengisi;
 * kalau ikut berubah surut, dua kelompok responden yang dikumpulkan pada
 * struktur organisasi berbeda tergabung diam-diam menjadi satu sel tabulasi
 * silang. Foreign key `divisiId` tetap terhubung, jadi keduanya masih bisa
 * dianalisis bersama bila peneliti memang menghendakinya.
 *
 * Peneliti diberi tahu hal ini lewat `peringatan` pada respons.
 */
export default defineEventHandler(async (event) => {
  await wajibAdmin(event)
  const jenis = bacaJenisMaster(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Id tidak valid.' })
  }

  const isi = skemaMaster.partial().safeParse(await readBody(event))
  if (!isi.success) {
    throw createError({
      statusCode: 422,
      statusMessage: isi.error.issues[0]?.message ?? 'Data tidak valid.',
    })
  }

  const lama = await tabelMaster(jenis).findUnique({ where: { id } })
  if (!lama) {
    throw createError({
      statusCode: 404,
      statusMessage: `${LABEL_JENIS[jenis]} tidak ditemukan.`,
    })
  }

  const jumlahPemakai = await hitungPemakai(jenis, id)
  const peringatan: string[] = []

  if (isi.data.nama && isi.data.nama !== lama.nama && jumlahPemakai > 0) {
    peringatan.push(
      `${jumlahPemakai} responden sudah tercatat dengan nama "${lama.nama}". Nama lama itu tetap tersimpan pada data mereka agar tabulasi silang tidak mencampur dua struktur organisasi; responden baru akan memakai nama yang sekarang.`,
    )
  }

  if (isi.data.aktif === false && jumlahPemakai > 0) {
    peringatan.push(
      `${jumlahPemakai} responden memakai pilihan ini. Menonaktifkannya hanya menyembunyikannya dari form responden baru — data yang sudah terkumpul tidak berubah.`,
    )
  }

  try {
    const baru = await tabelMaster(jenis).update({
      where: { id },
      data: {
        ...(isi.data.nama !== undefined && { nama: isi.data.nama }),
        ...(isi.data.urutan !== undefined && { urutan: isi.data.urutan }),
        ...(isi.data.aktif !== undefined && { aktif: isi.data.aktif }),
      },
    })
    return {
      sukses: true,
      id: baru.id,
      nama: baru.nama,
      aktif: baru.aktif,
      urutan: baru.urutan,
      jumlahResponden: jumlahPemakai,
      peringatan,
    }
  } catch (error) {
    galatNamaGanda(jenis, error)
  }
})
