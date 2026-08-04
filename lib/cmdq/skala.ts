/**
 * Definisi skala pengukuran & ambang batas risiko.
 *
 * PENTING (untuk Bab III tesis): instrumen yang dipakai aplikasi ini adalah
 * MODIFIKASI — daftar segmen mengikuti Nordic Body Map (28 segmen) sedangkan
 * metode skoring mengikuti pendekatan tiga dimensi CMDQ (frekuensi ×
 * ketidaknyamanan × gangguan). Bobot frekuensi memakai skala linier 0–3,
 * bukan bobot asli CMDQ (0 / 1,5 / 3,5 / 5 / 10). Semua nilai di bawah ini
 * terpusat di satu file agar mudah diaudit dan diubah bila pembimbing
 * meminta penyesuaian.
 */

import { JUMLAH_SEGMEN } from './segmen'

export interface OpsiSkala {
  /** Nilai yang disimpan & dipakai perhitungan */
  nilai: number
  /** Label yang dibaca responden */
  label: string
  /** Keterangan pendek opsional (ditampilkan kecil di bawah label) */
  keterangan?: string
}

/** Pertanyaan 1 — seberapa sering keluhan dirasakan */
export const SKALA_FREKUENSI: readonly OpsiSkala[] = [
  { nilai: 0, label: 'Tidak pernah' },
  { nilai: 1, label: '1–2 kali seminggu' },
  { nilai: 2, label: '3–4 kali seminggu' },
  { nilai: 3, label: 'Setiap hari' },
] as const

/** Pertanyaan 2 — seberapa tidak nyaman keluhan tersebut */
export const SKALA_KETIDAKNYAMANAN: readonly OpsiSkala[] = [
  { nilai: 1, label: 'Sedikit tidak nyaman' },
  { nilai: 2, label: 'Agak tidak nyaman' },
  { nilai: 3, label: 'Sangat tidak nyaman' },
] as const

/** Pertanyaan 3 — seberapa besar keluhan mengganggu pekerjaan */
export const SKALA_GANGGUAN: readonly OpsiSkala[] = [
  { nilai: 1, label: 'Tidak mengganggu sama sekali' },
  { nilai: 2, label: 'Sedikit mengganggu' },
  { nilai: 3, label: 'Sangat mengganggu' },
] as const

// ── Batas nilai (dipakai validasi server-side) ─────────────────────────────

export const FREKUENSI_MIN = 0
export const FREKUENSI_MAKS = 3
export const KETIDAKNYAMANAN_MIN = 1
export const KETIDAKNYAMANAN_MAKS = 3
export const GANGGUAN_MIN = 1
export const GANGGUAN_MAKS = 3

/**
 * Bobot frekuensi. Saat ini linier (bobot = kode pilihan).
 * Untuk beralih ke bobot baku CMDQ, ganti isi array menjadi
 * [0, 1.5, 3.5, 5, 10] dan tambahkan opsi ke-5 di SKALA_FREKUENSI.
 */
export const BOBOT_FREKUENSI: readonly number[] = [0, 1, 2, 3] as const

/** Skor maksimum satu segmen = 3 × 3 × 3 = 27 */
export const SKOR_SEGMEN_MAKS =
  BOBOT_FREKUENSI[BOBOT_FREKUENSI.length - 1]! *
  KETIDAKNYAMANAN_MAKS *
  GANGGUAN_MAKS

/** Skor total maksimum = 27 × 28 segmen = 756 */
export const SKOR_TOTAL_MAKS = SKOR_SEGMEN_MAKS * JUMLAH_SEGMEN

// ── Ambang batas kategori risiko ───────────────────────────────────────────
//
// CMDQ tidak memiliki cut-off risiko baku yang disepakati universal di
// literatur. Ambang di bawah memakai pembagian sepertiga rentang teoretis
// (0–100% skor maksimum), pendekatan yang lazim dipakai penelitian sejenis
// dan mudah dipertanggungjawabkan karena murni proporsional.
//
// >>> Nilai ini WAJIB dicantumkan & dijustifikasi di Bab III tesis. <<<
// Bila pembimbing meminta cut-off lain (mis. berbasis persentil data
// empiris 50 responden), cukup ubah kedua konstanta di bawah.

export const PROPORSI_AMBANG_SEDANG = 1 / 3
export const PROPORSI_AMBANG_TINGGI = 2 / 3

/** Skor total > nilai ini → minimal kategori SEDANG (default: 252) */
export const AMBANG_TOTAL_SEDANG = SKOR_TOTAL_MAKS * PROPORSI_AMBANG_SEDANG
/** Skor total > nilai ini → kategori TINGGI (default: 504) */
export const AMBANG_TOTAL_TINGGI = SKOR_TOTAL_MAKS * PROPORSI_AMBANG_TINGGI

/** Ambang yang sama, tetapi pada level satu segmen (default: 9 dan 18) */
export const AMBANG_SEGMEN_SEDANG = SKOR_SEGMEN_MAKS * PROPORSI_AMBANG_SEDANG
export const AMBANG_SEGMEN_TINGGI = SKOR_SEGMEN_MAKS * PROPORSI_AMBANG_TINGGI

// ── Ambang rujukan tenaga kesehatan ────────────────────────────────────────
//
// SENGAJA TERPISAH dari ambang kategori risiko di atas.
//
// Ambang total (252 / 504) hanya tercapai bila responden melaporkan keluhan
// maksimum pada 10 dan 19 bagian tubuh sekaligus — praktis tak terjangkau.
// Menggantungkan rujukan pada `kategoriRisiko === 'TINGGI'` berarti responden
// dengan nyeri berat harian di beberapa bagian tubuh tidak pernah disarankan
// mencari pertolongan. Karena itu rujukan dipicu langsung dari data segmen.
//
// Aturan umum: jalur keselamatan tidak boleh bergantung pada kategori turunan.

/** Satu segmen dengan skor ≥ nilai ini sudah cukup memicu rujukan (default: 18) */
export const AMBANG_RUJUKAN_SKOR_SEGMEN = AMBANG_SEGMEN_TINGGI

/**
 * Alternatif pemicu: banyaknya segmen yang terasa sangat tidak nyaman
 * (ketidaknyamanan = 3) sekaligus mengganggu pekerjaan (gangguan ≥ 2).
 */
export const AMBANG_RUJUKAN_JUMLAH_SEGMEN_BERAT = 3

export type KategoriRisiko = 'RENDAH' | 'SEDANG' | 'TINGGI'

export const LABEL_KATEGORI_RISIKO: Record<KategoriRisiko, string> = {
  RENDAH: 'Risiko Rendah',
  SEDANG: 'Risiko Sedang',
  TINGGI: 'Risiko Tinggi',
}

// Catatan penting untuk teks di bawah: kalimat ini muncul berdasarkan SKOR
// TOTAL, yang menjumlahkan 28 segmen. Skor total rendah TIDAK berarti tiap
// bagian tubuh baik-baik saja — responden bisa punya satu bagian yang sangat
// berat namun tetap berkategori RENDAH. Karena itu teks RENDAH sengaja tidak
// menyimpulkan bahwa keluhan responden ringan, dan selalu menunjuk ke saran
// spesifik per bagian tubuh di bawahnya.
export const SARAN_KATEGORI_RISIKO: Record<KategoriRisiko, string> = {
  RENDAH:
    'Skor total keluhan Anda berada pada rentang bawah. Pertahankan postur kerja yang baik dan lakukan peregangan singkat setiap 1–2 jam. Bila ada bagian tubuh tertentu yang terasa berat, perhatikan saran khusus di bawah ini.',
  SEDANG:
    'Terdapat keluhan yang perlu diperhatikan. Periksa kembali penataan meja, kursi, dan posisi monitor Anda, serta perbanyak jeda istirahat aktif.',
  TINGGI:
    'Keluhan Anda tergolong berat. Disarankan berkonsultasi dengan petugas K3 atau tenaga kesehatan di perusahaan, dan segera lakukan perbaikan stasiun kerja.',
}
