/**
 * Data contoh untuk mencoba dashboard sebelum pengambilan data sungguhan.
 *
 *   npm run db:contoh      → membuat 12 responden contoh
 *   npm run db:bersihkan   → menghapus seluruh responden contoh
 *
 * Kode responden contoh SELALU berawalan "DEMO-", sedangkan responden asli
 * berawalan "PTX-". Pemisahan ini disengaja: data contoh tidak akan pernah
 * tercampur ke dalam data penelitian, dan penghapusannya tidak mungkin
 * menyentuh responden asli.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { evaluasiImt } from '../lib/imt'
import { SEGMEN_TUBUH } from '../lib/cmdq/segmen'
import { hitungSkorCmdq } from '../lib/cmdq/skoring'
import { hitungSkorSus } from '../lib/sus/skoring'
import type {
  OpsiDurasiKomputer,
  OpsiMasaKerja,
  OpsiUsia,
} from '../lib/sosiodemografi'

const prisma = new PrismaClient()
const PREFIKS = 'DEMO-'

/**
 * Variabel sosiodemografis ditulis sebagai LABEL KATEGORI, persis seperti yang
 * tersimpan dari form — bukan angka. Menulisnya sebagai angka (mis. `usia: 27`)
 * membuat data contoh tidak pernah cocok dengan filter dasbor mana pun, dan
 * memunculkan kategori palsu bersisi satu responden di hasil ekspor.
 *
 * Satu responden (`Lina Marlina`) sengaja memakai divisi di luar daftar baku
 * untuk menguji jalur pilihan "Lainnya" pada tampilan dasbor dan ekspor.
 */
interface Contoh {
  nama: string
  jenisKelamin: 'LAKI_LAKI' | 'PEREMPUAN'
  usia: OpsiUsia
  tinggi: number
  berat: number
  masaKerja: OpsiMasaKerja
  durasi: OpsiDurasiKomputer
  divisi: string
  jabatan: string
  /** Sub-bagian/seksi — opsional, seperti di form */
  unitKerja: string | null
  merokok: boolean
  olahraga: number | null
  riwayat: boolean
  /** Segmen berkeluhan: kode → [frekuensi, ketidaknyamanan, gangguan] */
  keluhan: Record<string, [number, number, number]>
  sus: number[]
}

const DATA: Contoh[] = [
  {
    nama: 'Ahmad Riyadi', jenisKelamin: 'LAKI_LAKI', usia: '23-28 Thn', tinggi: 172, berat: 64,
    masaKerja: '< 5 Thn', durasi: '> 6 Jam',
    divisi: 'Keuangan & Akuntansi', jabatan: 'Staf / Pelaksana', unitKerja: 'Seksi Pajak',
    merokok: true, olahraga: 2, riwayat: false,
    keluhan: { LEHER_ATAS: [2, 2, 1], BAHU_KANAN: [1, 2, 1] },
    sus: [4, 2, 5, 1, 4, 2, 5, 2, 4, 3],
  },
  {
    nama: 'Siti Aminah', jenisKelamin: 'PEREMPUAN', usia: '29-34 Thn', tinggi: 156, berat: 68,
    masaKerja: '> 5 Thn', durasi: '> 6 Jam',
    divisi: 'Administrasi & Umum', jabatan: 'Supervisor / Koordinator', unitKerja: null,
    merokok: false, olahraga: null, riwayat: true,
    keluhan: { LEHER_ATAS: [3, 3, 2], LEHER_BAWAH: [3, 2, 2], PUNGGUNG: [2, 2, 2], PINGGANG: [3, 3, 3] },
    sus: [5, 1, 5, 1, 4, 2, 4, 2, 5, 2],
  },
  {
    nama: 'Budi Hartono', jenisKelamin: 'LAKI_LAKI', usia: '41-46 Thn', tinggi: 168, berat: 88,
    masaKerja: '> 10 Thn', durasi: '> 6 Jam',
    divisi: 'Produksi / Operasional', jabatan: 'Kepala Seksi / Manajer', unitKerja: null,
    merokok: true, olahraga: null, riwayat: true,
    keluhan: {
      LEHER_ATAS: [3, 3, 3], LEHER_BAWAH: [3, 3, 2], BAHU_KIRI: [2, 2, 2], BAHU_KANAN: [3, 3, 2],
      PUNGGUNG: [3, 3, 3], PINGGANG: [3, 3, 3], BOKONG: [2, 2, 1], PANTAT: [3, 2, 2],
      LUTUT_KANAN: [2, 2, 2], PERGELANGAN_TANGAN_KANAN: [3, 2, 2],
    },
    sus: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  },
  {
    nama: 'Dewi Lestari', jenisKelamin: 'PEREMPUAN', usia: '29-34 Thn', tinggi: 160, berat: 50,
    masaKerja: '< 5 Thn', durasi: '> 6 Jam',
    divisi: 'Pemasaran & Penjualan', jabatan: 'Staf / Pelaksana', unitKerja: null,
    merokok: false, olahraga: 4, riwayat: false,
    keluhan: { LEHER_ATAS: [1, 1, 1] },
    sus: [4, 2, 4, 2, 4, 2, 5, 1, 4, 2],
  },
  {
    nama: 'Eko Prasetyo', jenisKelamin: 'LAKI_LAKI', usia: '47-52 Thn', tinggi: 170, berat: 79,
    masaKerja: '> 10 Thn', durasi: '> 6 Jam',
    divisi: 'Produksi / Operasional', jabatan: 'Kepala Bagian / Direksi', unitKerja: null,
    merokok: true, olahraga: 1, riwayat: true,
    keluhan: {
      PINGGANG: [3, 3, 3], PUNGGUNG: [3, 2, 2], LUTUT_KIRI: [2, 2, 2], LUTUT_KANAN: [3, 3, 2],
      BETIS_KIRI: [2, 1, 1], BETIS_KANAN: [2, 2, 1], LEHER_BAWAH: [2, 2, 2],
    },
    sus: [2, 4, 3, 4, 2, 3, 3, 4, 2, 4],
  },
  {
    nama: 'Fitri Handayani', jenisKelamin: 'PEREMPUAN', usia: '35-40 Thn', tinggi: 158, berat: 45,
    masaKerja: '> 10 Thn', durasi: '< 6 Jam',
    divisi: 'Administrasi & Umum', jabatan: 'Staf / Pelaksana', unitKerja: 'Seksi Arsip',
    merokok: false, olahraga: 5, riwayat: false,
    keluhan: {},
    sus: [5, 1, 5, 2, 5, 1, 5, 1, 5, 1],
  },
  {
    nama: 'Gunawan Saputra', jenisKelamin: 'LAKI_LAKI', usia: '29-34 Thn', tinggi: 175, berat: 72,
    masaKerja: '> 5 Thn', durasi: '> 6 Jam',
    divisi: 'Teknologi Informasi', jabatan: 'Supervisor / Koordinator', unitKerja: null,
    merokok: false, olahraga: 3, riwayat: false,
    keluhan: { PERGELANGAN_TANGAN_KANAN: [3, 2, 2], TANGAN_KANAN: [2, 2, 1], LEHER_ATAS: [2, 1, 1] },
    sus: [4, 3, 4, 2, 4, 2, 4, 2, 4, 3],
  },
  {
    nama: 'Hesti Wulandari', jenisKelamin: 'PEREMPUAN', usia: '23-28 Thn', tinggi: 163, berat: 55,
    masaKerja: '< 5 Thn', durasi: '> 6 Jam',
    divisi: 'Teknologi Informasi', jabatan: 'Staf / Pelaksana', unitKerja: null,
    merokok: false, olahraga: 2, riwayat: false,
    keluhan: { LEHER_ATAS: [2, 2, 1], BAHU_KIRI: [1, 1, 1] },
    sus: [3, 3, 4, 3, 3, 3, 4, 3, 3, 3],
  },
  {
    nama: 'Irfan Maulana', jenisKelamin: 'LAKI_LAKI', usia: '41-46 Thn', tinggi: 166, berat: 76,
    masaKerja: '> 10 Thn', durasi: '> 6 Jam',
    divisi: 'Keuangan & Akuntansi', jabatan: 'Kepala Seksi / Manajer', unitKerja: null,
    merokok: true, olahraga: null, riwayat: false,
    keluhan: { PINGGANG: [2, 2, 2], PUNGGUNG: [2, 2, 1], BAHU_KANAN: [2, 2, 2], LEHER_BAWAH: [3, 2, 2] },
    sus: [4, 2, 4, 2, 3, 3, 4, 2, 4, 3],
  },
  {
    nama: 'Julia Ramadhani', jenisKelamin: 'PEREMPUAN', usia: '23-28 Thn', tinggi: 165, berat: 46,
    masaKerja: '< 5 Thn', durasi: '> 6 Jam',
    divisi: 'Pemasaran & Penjualan', jabatan: 'Staf / Pelaksana', unitKerja: null,
    merokok: false, olahraga: 3, riwayat: false,
    keluhan: { LEHER_ATAS: [1, 2, 1] },
    sus: [5, 2, 4, 1, 5, 1, 5, 2, 4, 2],
  },
  {
    nama: 'Kurnia Adi', jenisKelamin: 'LAKI_LAKI', usia: '35-40 Thn', tinggi: 178, berat: 95,
    masaKerja: '> 10 Thn', durasi: '> 6 Jam',
    divisi: 'Logistik & Pengadaan', jabatan: 'Supervisor / Koordinator', unitKerja: 'Gudang Bahan Baku',
    merokok: true, olahraga: null, riwayat: true,
    keluhan: {
      PINGGANG: [3, 3, 3], BOKONG: [3, 2, 2], PANTAT: [3, 3, 2], PUNGGUNG: [3, 3, 2],
      LEHER_ATAS: [2, 2, 2], LEHER_BAWAH: [3, 2, 2], PAHA_KIRI: [2, 1, 1], PAHA_KANAN: [2, 2, 1],
      LUTUT_KIRI: [2, 2, 2], LUTUT_KANAN: [2, 2, 2], KAKI_KIRI: [1, 1, 1], KAKI_KANAN: [2, 1, 1],
    },
    sus: [3, 4, 3, 3, 3, 4, 3, 3, 2, 4],
  },
  {
    nama: 'Lina Marlina', jenisKelamin: 'PEREMPUAN', usia: '47-52 Thn', tinggi: 154, berat: 65,
    masaKerja: '> 10 Thn', durasi: '> 6 Jam',
    // Nilai di luar `OPSI_DIVISI` — meniru responden yang memilih "Lainnya".
    divisi: 'Perpustakaan', jabatan: 'Staf / Pelaksana', unitKerja: null,
    merokok: false, olahraga: 1, riwayat: true,
    keluhan: {
      LEHER_ATAS: [3, 2, 2], BAHU_KIRI: [2, 2, 2], BAHU_KANAN: [3, 3, 2],
      PERGELANGAN_TANGAN_KANAN: [2, 2, 2], PINGGANG: [2, 2, 1],
    },
    sus: [4, 2, 4, 3, 4, 2, 4, 2, 3, 4],
  },
]

async function bersihkan() {
  const { count } = await prisma.responden.deleteMany({
    where: { kodeResponden: { startsWith: PREFIKS } },
  })
  console.log(`✓ ${count} responden contoh dihapus`)
}

/** Kata sandi seragam untuk seluruh akun contoh — memudahkan uji coba masuk. */
const SANDI_CONTOH = 'demo12345'

async function buat() {
  const segmenDb = await prisma.segmenTubuh.findMany({ select: { id: true, kode: true } })
  if (segmenDb.length === 0) {
    console.error('! Tabel segmen_tubuh masih kosong. Jalankan `npm run db:seed` dulu.')
    process.exitCode = 1
    return
  }
  const idPerKode = new Map(segmenDb.map((s) => [s.kode, s.id]))
  const passwordHash = await bcrypt.hash(SANDI_CONTOH, 10)

  for (const [i, c] of DATA.entries()) {
    const kodeResponden = `${PREFIKS}${String(i + 1).padStart(3, '0')}`
    const email = `demo${String(i + 1).padStart(3, '0')}@contoh.test`
    const imt = evaluasiImt(c.berat, c.tinggi)

    // Skor dihitung memakai fungsi yang sama dengan aplikasi, sehingga data
    // contoh selalu konsisten dengan aturan skoring yang berlaku.
    const hasilCmdq = hitungSkorCmdq(
      SEGMEN_TUBUH.map((s) => {
        const k = c.keluhan[s.kode]
        return k
          ? { kodeSegmen: s.kode, frekuensiKode: k[0], ketidaknyamananSkor: k[1], gangguanSkor: k[2] }
          : { kodeSegmen: s.kode, frekuensiKode: 0, ketidaknyamananSkor: null, gangguanSkor: null }
      }),
    )
    const hasilSus = hitungSkorSus(
      c.sus.map((n, idx) => ({ itemNomor: idx + 1, skorJawaban: n })),
    )

    await prisma.responden.deleteMany({
      where: { OR: [{ kodeResponden }, { email }] },
    })

    await prisma.responden.create({
      data: {
        kodeResponden,
        nama: c.nama,
        email,
        passwordHash,
        setujuEtik: true,
        tanggalPersetujuan: new Date(),
        usia: c.usia,
        jenisKelamin: c.jenisKelamin,
        divisi: c.divisi,
        jabatan: c.jabatan,
        unitKerja: c.unitKerja,
        masaKerjaTahun: c.masaKerja,
        durasiKomputerJamPerHari: c.durasi,
        tinggiBadanCm: new Prisma.Decimal(c.tinggi),
        beratBadanKg: new Prisma.Decimal(c.berat),
        imt: new Prisma.Decimal(imt.imt),
        kategoriImt: imt.kategori,
        olahraga: c.olahraga !== null,
        frekuensiOlahragaPerMinggu: c.olahraga,
        merokok: c.merokok,
        riwayatMsds: c.riwayat,
        keteranganRiwayatMsds: c.riwayat ? 'Data contoh — riwayat nyeri berulang' : null,
        statusProfil: 'SELESAI',
        statusCmdq: 'SELESAI',
        statusSus: 'SELESAI',
        cmdqJawaban: {
          create: hasilCmdq.perSegmen.map((s) => ({
            segmenId: idPerKode.get(s.kodeSegmen)!,
            frekuensiKode: s.frekuensiKode,
            frekuensiBobot: new Prisma.Decimal(s.frekuensiBobot),
            ketidaknyamananSkor: s.ketidaknyamananSkor,
            gangguanSkor: s.gangguanSkor,
            skor: new Prisma.Decimal(s.skor),
          })),
        },
        cmdqHasil: {
          create: {
            skorTotal: new Prisma.Decimal(hasilCmdq.skorTotal),
            skorRataRata: new Prisma.Decimal(hasilCmdq.skorRataRata),
            jumlahSegmenBermasalah: hasilCmdq.jumlahSegmenBermasalah,
            kategoriRisiko: hasilCmdq.kategoriRisiko,
            segmenTertinggiId: hasilCmdq.segmenTertinggi
              ? idPerKode.get(hasilCmdq.segmenTertinggi.kodeSegmen)!
              : null,
            jumlahSegmenDinilai: hasilCmdq.jumlahSegmenDinilai,
            ambangSedang: new Prisma.Decimal(hasilCmdq.ambangSedang),
            ambangTinggi: new Prisma.Decimal(hasilCmdq.ambangTinggi),
          },
        },
        susJawaban: {
          create: hasilSus.perItem.map((it) => ({
            itemNomor: it.nomor,
            skorJawaban: it.skorJawaban,
          })),
        },
        susHasil: {
          create: {
            skorTotal: new Prisma.Decimal(hasilSus.skorTotal),
            interpretasi: hasilSus.interpretasi,
            gradeHuruf: hasilSus.gradeHuruf,
            adjektif: hasilSus.adjektif,
            memenuhiTarget: hasilSus.memenuhiTarget,
          },
        },
      },
    })

    console.log(
      `  ${kodeResponden}  ${c.nama.padEnd(18)} IMT ${String(imt.imt).padStart(5)} ${imt.labelSingkat.padEnd(13)}` +
        ` CMDQ ${String(hasilCmdq.skorTotal).padStart(3)} ${hasilCmdq.kategoriRisiko.padEnd(7)}` +
        ` SUS ${String(hasilSus.skorTotal).padStart(5)} ${hasilSus.gradeHuruf}`,
    )
  }

  console.log(`\n✓ ${DATA.length} responden contoh dibuat (awalan ${PREFIKS})`)
  console.log(`  Masuk sebagai contoh: demo001@contoh.test … / sandi "${SANDI_CONTOH}"`)
  console.log('  Hapus kapan saja dengan: npm run db:bersihkan')
}

const perintah = process.argv[2] === 'bersihkan' ? bersihkan : buat

perintah()
  .catch((e) => {
    console.error('Gagal:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
