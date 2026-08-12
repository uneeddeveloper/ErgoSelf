/**
 * Definisi skala pengukuran CMDQ & ambang batas risiko.
 *
 * SELURUH ISI BERKAS INI MENGIKUTI INSTRUMEN ASLI CORNELL —
 * https://ergo.human.cornell.edu/ahmsquest.html
 *
 * Kutipan verbatim instruksi skoring Cornell yang menjadi dasar bobot di bawah:
 *
 *   "by weighting the rating scores to more easily identify the most serious
 *    problems as follows: Never = 0, 1-2 times/week = 1.5, 3-4 times/week = 3.5,
 *    Every day = 5, Several times every day = 10"
 *
 * CATATAN REVISI (Agustus 2026): versi sebelumnya memakai skala frekuensi 4
 * opsi dengan bobot linier 0/1/2/3. Dua penyimpangan itu kini diperbaiki.
 * Bobot linier bukan sekadar penskalaan ulang: lompatan 5 → 10 pada kategori
 * teratas memang dirancang Hedge agar kasus terberat terangkat dari kerumunan,
 * dan skala linier meratakannya sehingga responden dengan nyeri berat setiap
 * hari tampak setara dengan yang mengeluh sedang.
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

/**
 * Pertanyaan 1 — "During the last work week how often did you experience
 * ache, pain, discomfort in:"
 *
 * LIMA opsi, sesuai form asli. Opsi 3 dan 4 SENGAJA DIPISAH meskipun keduanya
 * sama-sama "setiap hari": justru di sanalah bobot Cornell melompat dua kali
 * lipat (5 → 10). Menggabungkannya menjadi satu opsi "Setiap hari" —
 * sebagaimana versi lama aplikasi ini — membuang informasi yang paling
 * menentukan dalam instrumen.
 */
export const SKALA_FREKUENSI: readonly OpsiSkala[] = [
  { nilai: 0, label: 'Tidak pernah' },
  { nilai: 1, label: '1–2 kali minggu lalu' },
  { nilai: 2, label: '3–4 kali minggu lalu' },
  { nilai: 3, label: 'Sekali setiap hari' },
  { nilai: 4, label: 'Beberapa kali setiap hari' },
] as const

/**
 * Pertanyaan 2 — "If you experienced ache, pain, discomfort, how uncomfortable
 * was this?" (slightly / moderately / very uncomfortable)
 */
export const SKALA_KETIDAKNYAMANAN: readonly OpsiSkala[] = [
  { nilai: 1, label: 'Sedikit tidak nyaman' },
  { nilai: 2, label: 'Cukup tidak nyaman' },
  { nilai: 3, label: 'Sangat tidak nyaman' },
] as const

/**
 * Pertanyaan 3 — "If you experienced ache, pain, discomfort, did this interfere
 * with your ability to work?" (not at all / slightly / substantially interfered)
 */
export const SKALA_GANGGUAN: readonly OpsiSkala[] = [
  { nilai: 1, label: 'Tidak mengganggu sama sekali' },
  { nilai: 2, label: 'Sedikit mengganggu' },
  { nilai: 3, label: 'Sangat mengganggu' },
] as const

// ── Batas nilai (dipakai validasi server-side) ─────────────────────────────

export const FREKUENSI_MIN = 0
export const FREKUENSI_MAKS = 4
export const KETIDAKNYAMANAN_MIN = 1
export const KETIDAKNYAMANAN_MAKS = 3
export const GANGGUAN_MIN = 1
export const GANGGUAN_MAKS = 3

/**
 * Bobot frekuensi baku CMDQ. Indeks = `frekuensiKode`.
 *
 * Nilainya TIDAK linier dan tidak boleh "dirapikan" menjadi bilangan bulat.
 * 1,5 dan 3,5 adalah angka Cornell; kolom `frekuensiBobot` di basis data
 * bertipe Decimal(4,1) justru karena pecahan ini.
 */
export const BOBOT_FREKUENSI: readonly number[] = [0, 1.5, 3.5, 5, 10] as const

/** Skor maksimum satu item = 10 × 3 × 3 = 90 */
export const SKOR_SEGMEN_MAKS =
  BOBOT_FREKUENSI[BOBOT_FREKUENSI.length - 1]! *
  KETIDAKNYAMANAN_MAKS *
  GANGGUAN_MAKS

/** Skor total maksimum = 90 × 18 item = 1620 */
export const SKOR_TOTAL_MAKS = SKOR_SEGMEN_MAKS * JUMLAH_SEGMEN

/**
 * Jumlah maksimum "rating" mentah satu item untuk metode analisis ke-2 Cornell
 * (menjumlahkan nilai rating, tanpa pembobotan): 4 + 3 + 3.
 */
export const RATING_SEGMEN_MAKS =
  FREKUENSI_MAKS + KETIDAKNYAMANAN_MAKS + GANGGUAN_MAKS

// ── Ambang batas kategori risiko ───────────────────────────────────────────
//
// Cornell TIDAK menyediakan cut-off, dan menyatakannya secara eksplisit:
// "These questionnaires are for research screening purposes and not for
// diagnostic purposes." Karena itu ambang di bawah adalah keputusan analisis
// peneliti, bukan bagian dari instrumen — dan harus dijustifikasi di Bab III.
//
// METODE YANG DIPAKAI: TERSIL EMPIRIS (persentil ke-33,3 dan ke-66,7) dari
// skor total responden penelitian yang sudah menyelesaikan CMDQ. Dihitung
// ulang dari panel admin lewat `POST /api/admin/ambang` dan disimpan di tabel
// `ambang_risiko`, sehingga setiap hasil dapat direproduksi bersama nilai
// ambang yang berlaku saat itu.
//
// Alasan meninggalkan pembagian sepertiga rentang teoretis (versi sebelumnya):
// distribusi skor perkalian sangat menceng ke kiri. Dengan bobot Cornell,
// sepertiga rentang teoretis berada di 540 dari 1620 — hanya tercapai bila
// responden melaporkan keluhan maksimum pada enam bagian tubuh sekaligus.
// Praktis tidak ada responden yang pernah masuk kategori SEDANG, apalagi
// TINGGI, sehingga variabel kategorik itu tidak bisa ditabulasi-silang.

/** Persentil batas bawah & atas tersil. */
export const PERSENTIL_AMBANG_SEDANG = 33.3
export const PERSENTIL_AMBANG_TINGGI = 66.7

/**
 * Jumlah responden minimum sebelum tersil empiris layak dipakai.
 *
 * Di bawah angka ini, satu responden menggeser persentil terlalu jauh dan
 * kategori bisa berbalik setiap kali ada pengisian baru. Panel admin menolak
 * menghitung ambang sebelum ambang ini terpenuhi dan menampilkan peringatan
 * bahwa nilai sementara masih berlaku.
 */
export const AMBANG_MIN_RESPONDEN = 30

/**
 * NILAI SEMENTARA — berlaku hanya sampai tersil empiris dihitung.
 *
 * >>> WAJIB DIGANTI DENGAN TERSIL EMPIRIS SEBELUM ANALISIS BAB IV. <<<
 *
 * Bukan hasil pembagian rentang teoretis, melainkan patokan yang bisa
 * dijelaskan dalam satuan keluhan nyata, supaya kategori tetap bermakna
 * selama pengumpulan data berlangsung:
 *
 *   SEDANG (> 90)  — setara satu bagian tubuh dengan keluhan maksimum
 *                    (beberapa kali sehari, sangat tidak nyaman, sangat
 *                    mengganggu), atau beberapa bagian dengan keluhan ringan.
 *   TINGGI (> 270) — setara tiga bagian tubuh pada tingkat tersebut.
 *
 * Angka ini dipakai apa adanya untuk responden yang mengisi sebelum ambang
 * empiris tersedia; `cmdq_hasil` merekam ambang yang berlaku saat perhitungan
 * sehingga kategori lama dapat dihitung ulang setelah ambang final ditetapkan.
 */
export const AMBANG_TOTAL_SEDANG_SEMENTARA = SKOR_SEGMEN_MAKS * 1
export const AMBANG_TOTAL_TINGGI_SEMENTARA = SKOR_SEGMEN_MAKS * 3

/**
 * Ambang pada level SATU item (rentang 0–90).
 *
 * Tetap proporsional (sepertiga & duapertiga), dan di sini pilihan itu memang
 * sah: yang dibagi adalah rentang satu item yang seluruh nilainya benar-benar
 * terjangkau seorang responden — berbeda dari skor total yang menjumlahkan 18
 * item dan tidak pernah mendekati maksimumnya.
 */
export const AMBANG_SEGMEN_SEDANG = SKOR_SEGMEN_MAKS / 3
export const AMBANG_SEGMEN_TINGGI = (SKOR_SEGMEN_MAKS * 2) / 3

// ── Ambang rujukan tenaga kesehatan ────────────────────────────────────────
//
// SENGAJA TERPISAH dari ambang kategori risiko di atas.
//
// Kategori risiko kini bergantung pada sebaran data penelitian; pada populasi
// yang keluhannya berat merata, tersil bawah pun bisa berisi responden yang
// perlu ditangani. Jalur keselamatan tidak boleh bergantung pada kategori
// turunan yang definisinya berubah-ubah — jadi rujukan dipicu langsung dari
// data segmen, dengan aturan yang tidak berubah meskipun ambang dihitung ulang.

/** Satu item dengan skor ≥ nilai ini sudah cukup memicu rujukan (default: 60) */
export const AMBANG_RUJUKAN_SKOR_SEGMEN = AMBANG_SEGMEN_TINGGI

/**
 * Alternatif pemicu: banyaknya item yang terasa sangat tidak nyaman
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
// TOTAL, yang menjumlahkan 18 item. Skor total rendah TIDAK berarti tiap
// bagian tubuh baik-baik saja — responden bisa punya satu bagian yang sangat
// berat namun tetap berkategori RENDAH. Karena itu teks RENDAH sengaja tidak
// menyimpulkan bahwa keluhan responden ringan, dan selalu menunjuk ke saran
// spesifik per bagian tubuh di bawahnya.
//
// Dengan ambang tersil, kalimat ini juga tidak boleh berbunyi seolah kategori
// bersifat mutlak: RENDAH berarti "lebih ringan dibanding sesama responden",
// bukan "tidak berisiko".
export const SARAN_KATEGORI_RISIKO: Record<KategoriRisiko, string> = {
  RENDAH:
    'Dibandingkan responden lain, skor total keluhan Anda berada pada sepertiga terbawah. Pertahankan postur kerja yang baik dan lakukan peregangan singkat setiap 1–2 jam. Bila ada bagian tubuh tertentu yang terasa berat, perhatikan saran khusus di bawah ini.',
  SEDANG:
    'Skor total keluhan Anda berada pada sepertiga tengah dibandingkan responden lain. Periksa kembali penataan meja, kursi, dan posisi monitor Anda, serta perbanyak jeda istirahat aktif.',
  TINGGI:
    'Skor total keluhan Anda berada pada sepertiga teratas dibandingkan responden lain. Disarankan berkonsultasi dengan petugas K3 atau tenaga kesehatan di perusahaan, dan segera lakukan perbaikan stasiun kerja.',
}
