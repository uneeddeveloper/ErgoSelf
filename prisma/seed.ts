/**
 * Seed basis data:
 *   1. 18 item CMDQ (master data, wajib ada)
 *   2. 12 area tangan CHDQ (master data, wajib ada)
 *   3. Ambang kategori risiko awal (nilai sementara, menunggu tersil empiris)
 *   4. Satu akun admin/peneliti untuk mengakses dashboard
 *
 * Divisi & jabatan TIDAK di-seed di sini: keduanya dikelola lewat panel admin
 * dan isi awalnya sudah dimasukkan oleh migrasi
 * `20260812000000_cmdq_cornell_chdq_dan_cms_divisi_jabatan`. Menyeed ulang di
 * sini akan menghidupkan kembali entri yang sengaja dinonaktifkan peneliti.
 *
 * Jalankan dengan:  npm run db:seed
 * Aman dijalankan berulang kali (idempoten, memakai upsert).
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { SEGMEN_TUBUH } from '../lib/cmdq/segmen'
import {
  AMBANG_TOTAL_SEDANG_SEMENTARA,
  AMBANG_TOTAL_TINGGI_SEMENTARA,
  PERSENTIL_AMBANG_SEDANG,
  PERSENTIL_AMBANG_TINGGI,
} from '../lib/cmdq/skala'
import { AREA_TANGAN } from '../lib/chdq/area'
import {
  AMBANG_CHDQ_SEDANG_SEMENTARA,
  AMBANG_CHDQ_TINGGI_SEMENTARA,
} from '../lib/chdq/skala'

const prisma = new PrismaClient()

async function seedSegmenTubuh() {
  for (const segmen of SEGMEN_TUBUH) {
    await prisma.segmenTubuh.upsert({
      where: { kode: segmen.kode },
      update: {
        nama: segmen.nama,
        namaEn: segmen.namaEn,
        sisi: segmen.sisi,
        regio: segmen.regio,
        urutan: segmen.urutan,
        aktif: true,
      },
      create: {
        kode: segmen.kode,
        nama: segmen.nama,
        namaEn: segmen.namaEn,
        sisi: segmen.sisi,
        regio: segmen.regio,
        urutan: segmen.urutan,
      },
    })
  }
  console.log(`✓ ${SEGMEN_TUBUH.length} item CMDQ tersimpan`)
}

async function seedAreaTangan() {
  for (const area of AREA_TANGAN) {
    await prisma.areaTangan.upsert({
      where: { kode: area.kode },
      update: {
        tangan: area.tangan,
        huruf: area.huruf,
        nama: area.nama,
        urutan: area.urutan,
      },
      create: {
        kode: area.kode,
        tangan: area.tangan,
        huruf: area.huruf,
        nama: area.nama,
        urutan: area.urutan,
      },
    })
  }
  console.log(`✓ ${AREA_TANGAN.length} area tangan CHDQ tersimpan`)
}

/**
 * Menyiapkan baris ambang, TANPA menimpa hasil perhitungan yang sudah ada.
 *
 * `update: {}` disengaja. Bila peneliti sudah menghitung tersil empiris,
 * menjalankan ulang seed tidak boleh mengembalikannya ke nilai sementara —
 * kategori risiko seluruh responden akan bergeser tanpa ada yang menyadarinya.
 */
async function seedAmbangRisiko() {
  await prisma.ambangRisiko.upsert({
    where: { instrumen: 'CMDQ' },
    update: {},
    create: {
      instrumen: 'CMDQ',
      ambangSedang: AMBANG_TOTAL_SEDANG_SEMENTARA,
      ambangTinggi: AMBANG_TOTAL_TINGGI_SEMENTARA,
      persentilSedang: PERSENTIL_AMBANG_SEDANG,
      persentilTinggi: PERSENTIL_AMBANG_TINGGI,
      jumlahResponden: 0,
      dariData: false,
      catatan:
        'Nilai sementara bawaan. Hitung ulang dari panel admin setelah data responden mencukupi.',
    },
  })

  await prisma.ambangRisiko.upsert({
    where: { instrumen: 'CHDQ' },
    update: {},
    create: {
      instrumen: 'CHDQ',
      ambangSedang: AMBANG_CHDQ_SEDANG_SEMENTARA,
      ambangTinggi: AMBANG_CHDQ_TINGGI_SEMENTARA,
      persentilSedang: PERSENTIL_AMBANG_SEDANG,
      persentilTinggi: PERSENTIL_AMBANG_TINGGI,
      jumlahResponden: 0,
      dariData: false,
      catatan:
        'Nilai sementara bawaan. Hitung ulang dari panel admin setelah data responden mencukupi.',
    },
  })

  console.log('✓ Ambang kategori risiko siap (CMDQ & CHDQ)')
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const nama = process.env.ADMIN_NAMA ?? 'Peneliti'

  if (!email || !password) {
    console.warn(
      '! ADMIN_EMAIL / ADMIN_PASSWORD belum diisi di .env — akun admin dilewati',
    )
    return
  }

  // Akun ini membuka seluruh dataset kesehatan penelitian, sementara skema
  // validasi kata sandi responden tidak berlaku untuknya — nilainya diambil
  // langsung dari variabel lingkungan. Tanpa pemeriksaan di sini,
  // `ADMIN_PASSWORD=admin123` diterima tanpa suara.
  const PANJANG_SANDI_ADMIN_MIN = 12
  if (password.length < PANJANG_SANDI_ADMIN_MIN) {
    throw new Error(
      `ADMIN_PASSWORD terlalu pendek (${password.length} karakter). ` +
        `Gunakan minimal ${PANJANG_SANDI_ADMIN_MIN} karakter — akun ini membuka seluruh data kesehatan responden.`,
    )
  }

  // Faktor biaya disamakan dengan yang dipakai aplikasi (server/utils/sandi.ts).
  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.admin.upsert({
    where: { email },
    update: { nama, passwordHash },
    create: { email, nama, passwordHash },
  })

  console.log(`✓ Akun admin siap: ${email}`)
}

async function main() {
  await seedSegmenTubuh()
  await seedAreaTangan()
  await seedAmbangRisiko()
  await seedAdmin()
}

main()
  .catch((error) => {
    console.error('Seed gagal:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
