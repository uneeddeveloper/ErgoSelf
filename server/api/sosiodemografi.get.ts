import {
  NILAI_LAINNYA,
  OPSI_DURASI_KOMPUTER,
  OPSI_JENIS_KELAMIN,
  OPSI_MASA_KERJA,
  OPSI_USIA,
} from '~~/lib/sosiodemografi'

/**
 * GET /api/sosiodemografi — pilihan yang digambar sebagai tombol pada form
 * profil responden.
 *
 * Divisi & jabatan datang dari basis data karena peneliti mengelolanya lewat
 * panel admin; sisanya tetap konstanta karena merupakan bagian dari rancangan
 * penelitian (rentang usia, kategori masa kerja) dan bukan sesuatu yang boleh
 * berubah di tengah pengumpulan data.
 *
 * HANYA entri `aktif` yang dikembalikan. Entri nonaktif tetap ada di basis data
 * agar responden lama tidak kehilangan kategorinya, tetapi tidak ditawarkan
 * kepada responden baru.
 *
 * Endpoint ini TIDAK memerlukan sesi admin — form profil diisi responden.
 */
export default defineEventHandler(async () => {
  const [divisi, jabatan] = await Promise.all([
    prisma.divisi.findMany({
      where: { aktif: true },
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      select: { id: true, nama: true },
    }),
    prisma.jabatan.findMany({
      where: { aktif: true },
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      select: { id: true, nama: true },
    }),
  ])

  return {
    usia: OPSI_USIA,
    jenisKelamin: OPSI_JENIS_KELAMIN,
    masaKerja: OPSI_MASA_KERJA,
    durasiKomputer: OPSI_DURASI_KOMPUTER,
    divisi: divisi.map((d) => d.nama),
    jabatan: jabatan.map((j) => j.nama),
    nilaiLainnya: NILAI_LAINNYA,
  }
})
