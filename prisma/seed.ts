/**
 * Seed basis data:
 *   1. 28 segmen tubuh Nordic Body Map (master data, wajib ada)
 *   2. Satu akun admin/peneliti untuk mengakses dashboard
 *
 * Jalankan dengan:  npm run db:seed
 * Aman dijalankan berulang kali (idempoten, memakai upsert).
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { SEGMEN_TUBUH } from '../lib/cmdq/segmen'

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
  console.log(`✓ ${SEGMEN_TUBUH.length} segmen tubuh tersimpan`)
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

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.admin.upsert({
    where: { email },
    update: { nama, passwordHash },
    create: { email, nama, passwordHash },
  })

  console.log(`✓ Akun admin siap: ${email}`)
}

async function main() {
  await seedSegmenTubuh()
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
