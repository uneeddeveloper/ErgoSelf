import { Prisma } from '@prisma/client'
import { evaluasiImt } from '~~/lib/imt'
import { petaGalat, skemaProfilResponden } from '~~/lib/validasi/responden'

/**
 * PUT /api/responden/profil — Langkah 2 alur responden: melengkapi data
 * sosiodemografis, antropometri, dan riwayat.
 *
 * IMT selalu dihitung ulang di server dari tinggi & berat yang dikirim;
 * nilai IMT dari klien diabaikan supaya angka yang tersimpan tidak bisa
 * dimanipulasi. Endpoint ini idempoten — responden boleh memperbarui
 * profilnya berkali-kali.
 */
export default defineEventHandler(async (event) => {
  const sesi = await wajibResponden(event)
  const hasilValidasi = skemaProfilResponden.safeParse(await readBody(event))

  if (!hasilValidasi.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Data yang Anda isi belum lengkap atau tidak valid.',
      data: { galat: petaGalat(hasilValidasi.error) },
    })
  }

  const data = hasilValidasi.data

  let imt: ReturnType<typeof evaluasiImt>
  try {
    imt = evaluasiImt(data.beratBadanKg, data.tinggiBadanCm)
  } catch (error) {
    throw createError({
      statusCode: 422,
      statusMessage:
        error instanceof Error ? error.message : 'Data antropometri tidak valid.',
      data: { galat: { tinggiBadanCm: 'Periksa kembali tinggi & berat badan' } },
    })
  }

  // ── Hubungkan ke master divisi/jabatan ─────────────────────────────────
  //
  // Form mengirim NAMA, bukan id — baik ketika responden memilih dari daftar
  // maupun ketika ia mengetik sendiri lewat "Lainnya". Server yang menentukan
  // mana di antara keduanya, dengan mencocokkan ke tabel master.
  //
  // Pencocokan sengaja TIDAK dibatasi pada entri `aktif`. Responden yang
  // membuka form lalu mengisinya beberapa menit kemudian bisa mengirimkan
  // pilihan yang baru saja dinonaktifkan peneliti; menolaknya berarti
  // memaksanya mengisi ulang, dan menganggapnya "Lainnya" berarti mencatat
  // pilihan baku sebagai teks bebas. Keduanya lebih buruk daripada menautkan
  // ke entri yang memang ia lihat di layarnya.
  const [divisiRef, jabatanRef] = await Promise.all([
    prisma.divisi.findUnique({
      where: { nama: data.divisi },
      select: { id: true },
    }),
    prisma.jabatan.findUnique({
      where: { nama: data.jabatan },
      select: { id: true },
    }),
  ])

  const responden = await prisma.responden.update({
    where: { id: sesi.id },
    data: {
      usia: data.usia,
      jenisKelamin: data.jenisKelamin,
      divisi: data.divisi,
      divisiId: divisiRef?.id ?? null,
      jabatan: data.jabatan,
      jabatanId: jabatanRef?.id ?? null,
      unitKerja: data.unitKerja ?? null,
      masaKerjaTahun: data.masaKerjaTahun,
      durasiKomputerJamPerHari: data.durasiKomputerJamPerHari,
      tinggiBadanCm: new Prisma.Decimal(data.tinggiBadanCm),
      beratBadanKg: new Prisma.Decimal(data.beratBadanKg),
      imt: new Prisma.Decimal(imt.imt),
      kategoriImt: imt.kategori,
      olahraga: data.olahraga,
      frekuensiOlahragaPerMinggu: data.frekuensiOlahragaPerMinggu ?? null,
      merokok: data.merokok,
      riwayatMsds: data.riwayatMsds,
      keteranganRiwayatMsds: data.keteranganRiwayatMsds ?? null,
      statusProfil: 'SELESAI',
    },
    select: { id: true, kodeResponden: true, nama: true, email: true },
  })

  // Perbarui sesi supaya middleware langsung tahu profil sudah lengkap.
  await setUserSession(event, {
    user: {
      tipe: 'RESPONDEN',
      id: responden.id,
      nama: responden.nama,
      kodeResponden: responden.kodeResponden,
      email: responden.email,
      profilLengkap: true,
    },
  })

  return {
    sukses: true,
    responden,
    imt: {
      nilai: imt.imt,
      kategori: imt.kategori,
      label: imt.label,
      labelSingkat: imt.labelSingkat,
    },
  }
})
