/**
 * Skala pengukuran CHDQ.
 *
 * SKALANYA SAMA PERSIS DENGAN CMDQ — bukan kebetulan, melainkan memang satu
 * keluarga instrumen. Halaman resmi CHDQ mengulang instruksi skoring yang sama
 * kata demi kata, termasuk bobot frekuensinya:
 *
 *   "by multiplying the above Frequency score (0,1.5, 3.5, 5, 10) by the
 *    Discomfort score (1,2,3) by the Interference score (1,2,3)"
 *   — https://ergo.human.cornell.edu/ahhandmsquest.html
 *
 * Karena itu berkas ini SENGAJA tidak mendefinisikan ulang skalanya, melainkan
 * meneruskan dari `lib/cmdq/skala.ts`. Menyalin nilainya ke sini akan membuat
 * dua sumber kebenaran yang bisa berbeda diam-diam: satu revisi bobot yang
 * hanya diterapkan pada salah satunya menghasilkan dua instrumen dengan skala
 * berbeda di dalam satu penelitian, dan tidak ada satu pun galat yang muncul.
 */

export {
  BOBOT_FREKUENSI,
  FREKUENSI_MAKS,
  FREKUENSI_MIN,
  GANGGUAN_MAKS,
  GANGGUAN_MIN,
  KETIDAKNYAMANAN_MAKS,
  KETIDAKNYAMANAN_MIN,
  LABEL_KATEGORI_RISIKO,
  SKALA_FREKUENSI,
  SKALA_GANGGUAN,
  SKALA_KETIDAKNYAMANAN,
  type KategoriRisiko,
  type OpsiSkala,
} from '../cmdq/skala'

import {
  GANGGUAN_MAKS,
  KETIDAKNYAMANAN_MAKS,
  BOBOT_FREKUENSI,
} from '../cmdq/skala'
import { JUMLAH_AREA_PER_TANGAN, JUMLAH_AREA_TANGAN } from './area'

/** Skor maksimum satu area = 10 × 3 × 3 = 90 */
export const SKOR_AREA_MAKS =
  BOBOT_FREKUENSI[BOBOT_FREKUENSI.length - 1]! *
  KETIDAKNYAMANAN_MAKS *
  GANGGUAN_MAKS

/** Skor maksimum satu tangan = 90 × 6 area = 540 */
export const SKOR_TANGAN_MAKS = SKOR_AREA_MAKS * JUMLAH_AREA_PER_TANGAN

/** Skor maksimum kedua tangan = 540 × 2 = 1080 */
export const SKOR_CHDQ_MAKS = SKOR_AREA_MAKS * JUMLAH_AREA_TANGAN

// ── Ambang ─────────────────────────────────────────────────────────────────
//
// Sama seperti CMDQ, Cornell tidak menyediakan cut-off untuk CHDQ. Ambang
// level responden berasal dari tersil empiris (`lib/cmdq/ambang.ts`, dipakai
// bersama lewat pembeda `instrumen` pada tabel `ambang_risiko`); yang di bawah
// hanyalah nilai sementara sampai data mencukupi.

/** Ambang pada level SATU area (rentang 0–90) — sepertiga & duapertiga. */
export const AMBANG_AREA_SEDANG = SKOR_AREA_MAKS / 3
export const AMBANG_AREA_TINGGI = (SKOR_AREA_MAKS * 2) / 3

/**
 * NILAI SEMENTARA level responden (kedua tangan digabung).
 *
 * >>> WAJIB DIGANTI DENGAN TERSIL EMPIRIS SEBELUM ANALISIS BAB IV. <<<
 *
 *   SEDANG (> 90)  — setara satu area tangan dengan keluhan maksimum
 *   TINGGI (> 270) — setara tiga area tangan pada tingkat tersebut
 */
export const AMBANG_CHDQ_SEDANG_SEMENTARA = SKOR_AREA_MAKS * 1
export const AMBANG_CHDQ_TINGGI_SEMENTARA = SKOR_AREA_MAKS * 3

/**
 * Satu area dengan skor ≥ nilai ini sudah cukup memicu saran pemeriksaan.
 *
 * Ambang rujukan sengaja TIDAK diturunkan dari kategori risiko — alasannya
 * sama dengan pada CMDQ: kategori bergantung pada sebaran data penelitian dan
 * berubah setiap kali ambang dihitung ulang, sedangkan jalur keselamatan harus
 * stabil. Untuk tangan, alasan itu bahkan lebih kuat: keluhan satu area saja
 * (mis. kesemutan di jari telunjuk–tengah, area A) sudah bermakna klinis
 * meskipun skor total kedua tangan tetap rendah.
 */
export const AMBANG_RUJUKAN_SKOR_AREA = AMBANG_AREA_TINGGI
