/**
 * DELETE /api/responden/saya — responden menarik diri dari penelitian.
 *
 * Lembar persetujuan (`components/PersetujuanEtik.vue`) menjanjikan
 * "Anda boleh berhenti kapan saja". Sebelum endpoint ini ada, janji itu tidak
 * bisa dipenuhi perangkat lunaknya: tidak ada satu pun handler DELETE di
 * seluruh API, dan penghapusan hanya mungkin dilakukan peneliti secara manual
 * lewat Prisma Studio. UU PDP No. 27/2022 memberi subjek data hak penghapusan
 * dan hak menarik persetujuan atas data kesehatannya.
 *
 * Penghapusan bersifat PERMANEN dan menyeluruh. Relasi `CmdqJawaban`,
 * `CmdqHasil`, `SusJawaban`, dan `SusHasil` sudah ber-`onDelete: Cascade`,
 * sehingga satu operasi menghapus seluruh jejak responden.
 *
 * Tidak ada penanda "dicabut" yang disimpan: menyimpan catatan tentang orang
 * yang datanya baru saja dihapus akan bertentangan dengan penghapusan itu
 * sendiri. Bila komisi etik meminta jejak audit, catat jumlah penarikan diri
 * secara agregat di luar basis data ini.
 */
export default defineEventHandler(async (event) => {
  const sesi = await wajibResponden(event)

  // Konfirmasi eksplisit di badan permintaan. Menghapus data penelitian
  // seseorang tidak boleh terjadi karena satu permintaan nyasar.
  const badan = await readBody(event).catch(() => null)
  if (badan?.konfirmasi !== 'HAPUS DATA SAYA') {
    throw createError({
      statusCode: 422,
      statusMessage:
        'Konfirmasi penghapusan tidak sesuai. Ketik persis: HAPUS DATA SAYA',
    })
  }

  try {
    await prisma.responden.delete({ where: { id: sesi.id } })
  } catch {
    // Sudah terhapus lebih dulu (mis. oleh peneliti). Tetap akhiri sesinya.
  }

  await clearUserSession(event)

  return {
    sukses: true,
    pesan:
      'Seluruh data Anda telah dihapus permanen dari penelitian ini. Terima kasih atas partisipasi Anda.',
  }
})
