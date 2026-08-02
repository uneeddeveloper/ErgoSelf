import ExcelJS from 'exceljs'
import { LABEL_KATEGORI_IMT } from '~~/lib/imt'
import { LABEL_KATEGORI_RISIKO } from '~~/lib/cmdq/skala'
import { ITEM_SUS } from '~~/lib/sus/item'

/**
 * GET /api/admin/ekspor?format=xlsx|csv — ekspor data mentah penelitian.
 *
 * Format sengaja dibuat "wide" (satu baris per responden) karena itulah
 * bentuk yang langsung bisa dibaca SPSS/JASP tanpa restructure. Variabel
 * kategorik disertai KODE ANGKA di samping labelnya supaya siap dipakai
 * untuk uji statistik (chi-square, korelasi, dsb.).
 *
 * Isi berkas Excel:
 *   Sheet 1 "Responden"   — profil + skor akhir CMDQ & SUS
 *   Sheet 2 "CMDQ Skor"   — 28 kolom skor per segmen (wide)
 *   Sheet 3 "CMDQ Rinci"  — long format: frekuensi, ketidaknyamanan, gangguan
 *   Sheet 4 "SUS"         — 10 kolom jawaban item + skor akhir
 *   Sheet 5 "Kamus Data"  — keterangan variabel & kode, untuk lampiran tesis
 */

const KODE_JK = { LAKI_LAKI: 1, PEREMPUAN: 2 } as const
const KODE_IMT = {
  KURUS_BERAT: 1,
  KURUS_RINGAN: 2,
  NORMAL: 3,
  GEMUK_RINGAN: 4,
  OBESITAS: 5,
} as const
const KODE_RISIKO = { RENDAH: 1, SEDANG: 2, TINGGI: 3 } as const
const KODE_SUS = { NOT_ACCEPTABLE: 1, MARGINAL: 2, ACCEPTABLE: 3 } as const

const LABEL_SUS_INTERPRETASI = {
  NOT_ACCEPTABLE: 'Tidak Dapat Diterima',
  MARGINAL: 'Marginal',
  ACCEPTABLE: 'Dapat Diterima',
} as const

export default defineEventHandler(async (event) => {
  await wajibAdmin(event)

  const { where } = bacaFilter(event)
  const format = getQuery(event).format === 'csv' ? 'csv' : 'xlsx'

  const [segmen, responden] = await Promise.all([
    prisma.segmenTubuh.findMany({
      orderBy: { urutan: 'asc' },
      select: { id: true, kode: true, nama: true, urutan: true },
    }),
    prisma.responden.findMany({
      where,
      orderBy: { kodeResponden: 'asc' },
      include: {
        cmdqHasil: { include: { segmenTertinggi: { select: { nama: true } } } },
        cmdqJawaban: { select: {
          segmenId: true,
          frekuensiKode: true,
          ketidaknyamananSkor: true,
          gangguanSkor: true,
          skor: true,
        } },
        susJawaban: { orderBy: { itemNomor: 'asc' } },
        susHasil: true,
      },
    }),
  ])

  const stempel = new Date().toISOString().slice(0, 10)

  // ── Baris utama (dipakai Excel sheet 1 maupun CSV) ─────────────────────
  // Sel dikosongkan (bukan diisi 0) bila responden belum melengkapi profil —
  // SPSS membacanya sebagai missing value, bukan nilai nol yang menyesatkan.
  const bool01 = (v: boolean | null) => (v === null ? '' : v ? 1 : 0)

  const barisResponden = responden.map((r) => ({
    Kode: r.kodeResponden,
    Nama: r.nama,
    Email: r.email,
    Unit_Kerja: r.unitKerja ?? '',
    Setuju_Etik: r.setujuEtik ? 1 : 0,
    Tanggal_Persetujuan: r.tanggalPersetujuan?.toISOString().slice(0, 10) ?? '',
    Usia: r.usia ?? '',
    JK_Kode: r.jenisKelamin ? KODE_JK[r.jenisKelamin] : '',
    JK_Label: r.jenisKelamin
      ? r.jenisKelamin === 'LAKI_LAKI'
        ? 'Laki-laki'
        : 'Perempuan'
      : '',
    Masa_Kerja_Tahun: r.masaKerjaTahun?.toNumber() ?? '',
    Durasi_Komputer_Jam: r.durasiKomputerJamPerHari?.toNumber() ?? '',
    Tinggi_cm: r.tinggiBadanCm?.toNumber() ?? '',
    Berat_kg: r.beratBadanKg?.toNumber() ?? '',
    IMT: r.imt?.toNumber() ?? '',
    IMT_Kode: r.kategoriImt ? KODE_IMT[r.kategoriImt] : '',
    IMT_Label: r.kategoriImt ? LABEL_KATEGORI_IMT[r.kategoriImt] : '',
    Olahraga: bool01(r.olahraga),
    Frekuensi_Olahraga_per_Minggu: r.frekuensiOlahragaPerMinggu ?? '',
    Merokok: bool01(r.merokok),
    Riwayat_MSDs: bool01(r.riwayatMsds),
    Keterangan_Riwayat: r.keteranganRiwayatMsds ?? '',
    Status_Profil: r.statusProfil,
    Status_CMDQ: r.statusCmdq,
    Status_SUS: r.statusSus,
    CMDQ_Skor_Total: r.cmdqHasil?.skorTotal.toNumber() ?? '',
    CMDQ_Skor_Rata2: r.cmdqHasil?.skorRataRata.toNumber() ?? '',
    CMDQ_Segmen_Bermasalah: r.cmdqHasil?.jumlahSegmenBermasalah ?? '',
    CMDQ_Risiko_Kode: r.cmdqHasil ? KODE_RISIKO[r.cmdqHasil.kategoriRisiko] : '',
    CMDQ_Risiko_Label: r.cmdqHasil
      ? LABEL_KATEGORI_RISIKO[r.cmdqHasil.kategoriRisiko]
      : '',
    CMDQ_Segmen_Tertinggi: r.cmdqHasil?.segmenTertinggi?.nama ?? '',
    SUS_Skor: r.susHasil?.skorTotal.toNumber() ?? '',
    SUS_Interpretasi_Kode: r.susHasil ? KODE_SUS[r.susHasil.interpretasi] : '',
    SUS_Interpretasi_Label: r.susHasil
      ? LABEL_SUS_INTERPRETASI[r.susHasil.interpretasi]
      : '',
    SUS_Grade: r.susHasil?.gradeHuruf ?? '',
    SUS_Memenuhi_Target: r.susHasil ? (r.susHasil.memenuhiTarget ? 1 : 0) : '',
    Tanggal_Isi: r.dibuatPada.toISOString().slice(0, 10),
  }))

  // ── CSV: cukup sheet utama ─────────────────────────────────────────────
  if (format === 'csv') {
    const kolom = Object.keys(barisResponden[0] ?? { Kode: '' })
    const escape = (v: unknown) => {
      const s = String(v ?? '')
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const isi = [
      kolom.join(','),
      ...barisResponden.map((b) =>
        kolom.map((k) => escape((b as Record<string, unknown>)[k])).join(','),
      ),
    ].join('\r\n')

    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="ergoself-responden-${stempel}.csv"`,
    )
    // BOM agar Excel membaca karakter Indonesia dengan benar
    return `﻿${isi}`
  }

  // ── Excel ──────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ErgoSelf'
  wb.created = new Date()

  function tulisSheet(nama: string, baris: Record<string, unknown>[]) {
    const ws = wb.addWorksheet(nama)
    if (baris.length === 0) {
      ws.addRow(['(tidak ada data yang sesuai filter)'])
      return ws
    }
    const kolom = Object.keys(baris[0]!)
    ws.columns = kolom.map((k) => ({
      header: k,
      key: k,
      width: Math.min(28, Math.max(12, k.length + 3)),
    }))
    baris.forEach((b) => ws.addRow(b))
    ws.getRow(1).font = { bold: true }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: kolom.length },
    }
    return ws
  }

  tulisSheet('Responden', barisResponden)

  // Sheet 2 — skor CMDQ per segmen (wide, 28 kolom)
  tulisSheet(
    'CMDQ Skor',
    responden.map((r) => {
      const perSegmen = new Map(r.cmdqJawaban.map((j) => [j.segmenId, j]))
      const baris: Record<string, unknown> = { Kode: r.kodeResponden }
      for (const s of segmen) {
        baris[`S${String(s.urutan).padStart(2, '0')}_${s.kode}`] =
          perSegmen.get(s.id)?.skor.toNumber() ?? ''
      }
      baris.Total = r.cmdqHasil?.skorTotal.toNumber() ?? ''
      return baris
    }),
  )

  // Sheet 3 — rincian tiga dimensi CMDQ (long format)
  tulisSheet(
    'CMDQ Rinci',
    responden.flatMap((r) => {
      const namaSegmen = new Map(segmen.map((s) => [s.id, s]))
      return r.cmdqJawaban
        .map((j) => {
          const s = namaSegmen.get(j.segmenId)
          return {
            Kode: r.kodeResponden,
            Segmen_No: s?.urutan ?? '',
            Segmen_Kode: s?.kode ?? '',
            Segmen_Nama: s?.nama ?? '',
            Frekuensi: j.frekuensiKode,
            Ketidaknyamanan: j.ketidaknyamananSkor ?? '',
            Gangguan: j.gangguanSkor ?? '',
            Skor: j.skor.toNumber(),
          }
        })
        .sort((a, b) => Number(a.Segmen_No) - Number(b.Segmen_No))
    }),
  )

  // Sheet 4 — SUS (wide, 10 item)
  tulisSheet(
    'SUS',
    responden
      .filter((r) => r.susJawaban.length > 0)
      .map((r) => {
        const baris: Record<string, unknown> = { Kode: r.kodeResponden }
        const perItem = new Map(r.susJawaban.map((j) => [j.itemNomor, j]))
        for (const item of ITEM_SUS) {
          baris[`SUS${String(item.nomor).padStart(2, '0')}`] =
            perItem.get(item.nomor)?.skorJawaban ?? ''
        }
        baris.SUS_Skor = r.susHasil?.skorTotal.toNumber() ?? ''
        baris.SUS_Grade = r.susHasil?.gradeHuruf ?? ''
        baris.SUS_Interpretasi = r.susHasil
          ? LABEL_SUS_INTERPRETASI[r.susHasil.interpretasi]
          : ''
        return baris
      }),
  )

  // Sheet 5 — kamus data, siap dilampirkan di tesis
  tulisSheet('Kamus Data', [
    { Variabel: 'Setuju_Etik', Keterangan: 'Persetujuan etik penelitian (informed consent)', Kode: '0 = Tidak; 1 = Ya. Kolom Tanggal_Persetujuan merekam waktunya.' },
    { Variabel: 'Status_Profil / CMDQ / SUS', Keterangan: 'Kemajuan pengisian tiap instrumen', Kode: 'BELUM; BERLANGSUNG; SELESAI' },
    { Variabel: '(sel kosong)', Keterangan: 'Missing value', Kode: 'Responden sudah mendaftar tetapi belum melengkapi profil pekerja' },
    { Variabel: 'JK_Kode', Keterangan: 'Jenis kelamin', Kode: '1 = Laki-laki; 2 = Perempuan' },
    { Variabel: 'IMT_Kode', Keterangan: 'Kategori IMT (Kemenkes RI)', Kode: '1 = Kurus berat; 2 = Kurus ringan; 3 = Normal; 4 = Gemuk ringan; 5 = Obesitas' },
    { Variabel: 'Olahraga / Merokok / Riwayat_MSDs', Keterangan: 'Kebiasaan & riwayat', Kode: '0 = Tidak; 1 = Ya' },
    { Variabel: 'Frekuensi', Keterangan: 'Frekuensi keluhan CMDQ', Kode: '0 = Tidak pernah; 1 = 1–2×/minggu; 2 = 3–4×/minggu; 3 = Setiap hari' },
    { Variabel: 'Ketidaknyamanan', Keterangan: 'Tingkat ketidaknyamanan', Kode: '1 = Sedikit; 2 = Agak; 3 = Sangat (kosong bila Frekuensi = 0)' },
    { Variabel: 'Gangguan', Keterangan: 'Gangguan terhadap pekerjaan', Kode: '1 = Tidak sama sekali; 2 = Sedikit; 3 = Sangat (kosong bila Frekuensi = 0)' },
    { Variabel: 'Skor', Keterangan: 'Skor segmen = Frekuensi × Ketidaknyamanan × Gangguan', Kode: 'Rentang 0–27' },
    { Variabel: 'CMDQ_Skor_Total', Keterangan: 'Jumlah skor 28 segmen', Kode: 'Rentang 0–756' },
    { Variabel: 'CMDQ_Risiko_Kode', Keterangan: 'Kategori risiko MSDs', Kode: '1 = Rendah (≤252); 2 = Sedang (>252–504); 3 = Tinggi (>504)' },
    { Variabel: 'SUS01–SUS10', Keterangan: 'Jawaban item SUS (Likert)', Kode: '1 = Sangat Tidak Setuju … 5 = Sangat Setuju' },
    { Variabel: 'SUS_Skor', Keterangan: 'Skor SUS = Σ kontribusi × 2,5', Kode: 'Rentang 0–100; target ≥ 68' },
    { Variabel: 'SUS_Interpretasi_Kode', Keterangan: 'Akseptabilitas (Bangor et al., 2009)', Kode: '1 = Not acceptable (<50); 2 = Marginal (50–70); 3 = Acceptable (>70)' },
  ])

  const buffer = await wb.xlsx.writeBuffer()

  setHeader(
    event,
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="ergoself-data-${stempel}.xlsx"`,
  )

  return Buffer.from(buffer)
})
