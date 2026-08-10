export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    // nuxt-auth-utils memanggil onSuccess tanpa try/catch di dalamnya, jadi
    // error apa pun di sini (Prisma, setUserSession) jadi 500 mentah dan
    // onError di bawah tidak pernah terpanggil. Bungkus sendiri supaya
    // pengguna tetap diarahkan balik ke /masuk dan errornya ter-log.
    try {
      const email = user.email.trim().toLowerCase()

      // 1. Cari responden berdasarkan email Google
      let responden = await prisma.responden.findUnique({
        where: { email },
        select: {
          id: true,
          nama: true,
          email: true,
          kodeResponden: true,
          statusProfil: true,
        },
      })

      // 2. Jika belum terdaftar, buat akun baru
      if (!responden) {
        const kodeAcak = `RSP-${Math.floor(100000 + Math.random() * 900000)}`

        responden = await prisma.responden.create({
          data: {
            email,
            nama: user.name || user.email.split('@')[0],
            kodeResponden: kodeAcak,
            passwordHash: null,
          },
          select: {
            id: true,
            nama: true,
            email: true,
            kodeResponden: true,
            statusProfil: true,
          },
        })
      }

      // 3. Simpan data sesi PERSIS sesuai dengan responden.post.ts
      await setUserSession(event, {
        user: {
          tipe: 'RESPONDEN',
          id: responden.id,
          nama: responden.nama,
          kodeResponden: responden.kodeResponden,
          email: responden.email,
          profilLengkap: responden.statusProfil === 'SELESAI',
        },
        masukPada: new Date().toISOString(),
      })

      // 4. Arahkan pengguna sesuai status pengisian profil
      const tujuan = responden.statusProfil === 'SELESAI' ? '/beranda' : '/profil'
      return sendRedirect(event, tujuan)
    } catch (error) {
      console.error('Google Auth onSuccess Error:', error)
      return sendRedirect(event, '/masuk?galat=google')
    }
  },

  onError(event, error) {
    console.error('Google Auth Error:', error)
    return sendRedirect(event, '/masuk?galat=google')
  },
})