import { LABEL_KATEGORI_IMT } from '~~/lib/imt'

/**
 * GET /api/responden/saya — profil lengkap responden yang sedang masuk,
 * termasuk status tiap langkah (profil → CMDQ → SUS) untuk menentukan
 * langkah berikutnya pada beranda.
 */
export default defineEventHandler(async (event) => {
  const sesi = await wajibResponden(event)

  const responden = await prisma.responden.findUnique({
    where: { id: sesi.id },
    select: {
      id: true,
      kodeResponden: true,
      nama: true,
      email: true,
      usia: true,
      jenisKelamin: true,
      divisi: true,
      jabatan: true,
      unitKerja: true,
      masaKerjaTahun: true,
      durasiKomputerJamPerHari: true,
      tinggiBadanCm: true,
      beratBadanKg: true,
      imt: true,
      kategoriImt: true,
      olahraga: true,
      frekuensiOlahragaPerMinggu: true,
      merokok: true,
      riwayatMsds: true,
      keteranganRiwayatMsds: true,
      setujuEtik: true,
      tanggalPersetujuan: true,
      statusProfil: true,
      statusCmdq: true,
      statusSus: true,
      dibuatPada: true,
    },
  })

  if (!responden) {
    // Sesi masih ada tapi datanya sudah dihapus peneliti — bersihkan sesi.
    await clearUserSession(event)
    throw createError({
      statusCode: 404,
      statusMessage: 'Data responden tidak ditemukan.',
    })
  }

  return {
    ...keAngka(responden),
    labelKategoriImt: responden.kategoriImt
      ? LABEL_KATEGORI_IMT[responden.kategoriImt]
      : null,
  }
})
