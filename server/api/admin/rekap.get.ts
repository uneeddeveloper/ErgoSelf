import { LABEL_SINGKAT_KATEGORI_IMT } from '~~/lib/imt'
import { LABEL_KATEGORI_RISIKO } from '~~/lib/cmdq/skala'

/**
 * GET /api/admin/rekap — tabel rekapitulasi seluruh responden.
 *
 * Menampilkan progress pengisian (CMDQ & SUS), skor, dan kategori risiko
 * dalam satu baris per responden. Mendukung filter (lihat `bacaFilter`)
 * dan penomoran halaman.
 */
export default defineEventHandler(async (event) => {
  await wajibAdmin(event)

  const { where, aktif } = await bacaFilter(event)
  const q = getQuery(event)

  // `Math.trunc` wajib: Prisma menuntut Int untuk skip/take, dan `?halaman=1.5`
  // menghasilkan `skip: 12.5` yang melempar PrismaClientValidationError tak
  // tertangani — satu-satunya tempat di API ini query string mencapai Prisma
  // tanpa daftar-putih. `Math.min` menahan `?halaman=1e999` (Infinity).
  const halaman = Math.min(1e6, Math.max(1, Math.trunc(Number(q.halaman)) || 1))
  const perHalaman = Math.min(
    200,
    Math.max(10, Math.trunc(Number(q.perHalaman)) || 25),
  )

  const [total, baris] = await Promise.all([
    prisma.responden.count({ where }),
    prisma.responden.findMany({
      where,
      orderBy: { kodeResponden: 'asc' },
      skip: (halaman - 1) * perHalaman,
      take: perHalaman,
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
        imt: true,
        kategoriImt: true,
        statusProfil: true,
        statusCmdq: true,
        statusChdq: true,
        statusSus: true,
        dibuatPada: true,
        cmdqHasil: {
          select: {
            skorTotal: true,
            kategoriRisiko: true,
            jumlahSegmenBermasalah: true,
            segmenTertinggi: { select: { nama: true } },
          },
        },
        chdqHasil: {
          select: {
            skorTotal: true,
            kategoriRisiko: true,
            skorTanganKanan: true,
            skorTanganKiri: true,
            tanganDominan: true,
            jumlahAreaBermasalah: true,
          },
        },
        susHasil: {
          select: {
            skorTotal: true,
            interpretasi: true,
            gradeHuruf: true,
            memenuhiTarget: true,
          },
        },
      },
    }),
  ])

  return {
    total,
    halaman,
    perHalaman,
    totalHalaman: Math.max(1, Math.ceil(total / perHalaman)),
    filter: aktif,
    baris: baris.map((r) => ({
      id: r.id,
      kodeResponden: r.kodeResponden,
      nama: r.nama,
      email: r.email,
      usia: r.usia,
      jenisKelamin: r.jenisKelamin,
      divisi: r.divisi,
      jabatan: r.jabatan,
      unitKerja: r.unitKerja,
      // Kolom profil bernilai null selama responden belum menyelesaikan
      // langkah 2 — dashboard menampilkannya sebagai "—".
      // Kategori teks, bukan angka — lihat `lib/sosiodemografi.ts`.
      masaKerjaTahun: r.masaKerjaTahun,
      durasiKomputerJamPerHari: r.durasiKomputerJamPerHari,
      imt: r.imt?.toNumber() ?? null,
      kategoriImt: r.kategoriImt,
      labelKategoriImt: r.kategoriImt
        ? LABEL_SINGKAT_KATEGORI_IMT[r.kategoriImt]
        : null,
      statusProfil: r.statusProfil,
      statusCmdq: r.statusCmdq,
      statusChdq: r.statusChdq,
      statusSus: r.statusSus,
      dibuatPada: r.dibuatPada,
      cmdq: r.cmdqHasil
        ? {
            skorTotal: r.cmdqHasil.skorTotal.toNumber(),
            kategoriRisiko: r.cmdqHasil.kategoriRisiko,
            labelKategoriRisiko:
              LABEL_KATEGORI_RISIKO[r.cmdqHasil.kategoriRisiko],
            jumlahSegmenBermasalah: r.cmdqHasil.jumlahSegmenBermasalah,
            segmenTertinggi: r.cmdqHasil.segmenTertinggi?.nama ?? null,
          }
        : null,
      chdq: r.chdqHasil
        ? {
            skorTotal: r.chdqHasil.skorTotal.toNumber(),
            kategoriRisiko: r.chdqHasil.kategoriRisiko,
            labelKategoriRisiko:
              LABEL_KATEGORI_RISIKO[r.chdqHasil.kategoriRisiko],
            skorTanganKanan: r.chdqHasil.skorTanganKanan.toNumber(),
            skorTanganKiri: r.chdqHasil.skorTanganKiri.toNumber(),
            tanganDominan: r.chdqHasil.tanganDominan,
            jumlahAreaBermasalah: r.chdqHasil.jumlahAreaBermasalah,
          }
        : null,
      sus: r.susHasil
        ? {
            skorTotal: r.susHasil.skorTotal.toNumber(),
            interpretasi: r.susHasil.interpretasi,
            gradeHuruf: r.susHasil.gradeHuruf,
            memenuhiTarget: r.susHasil.memenuhiTarget,
          }
        : null,
    })),
  }
})
