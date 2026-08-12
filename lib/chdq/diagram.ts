/**
 * Geometri diagram telapak tangan CHDQ — DIEKSTRAK LANGSUNG DARI FORM ASLI.
 *
 * Sumber: `rhandq.pdf` (© Cornell University, 1994), berkas resmi Cornell Hand
 * Discomfort Questionnaire — https://ergo.human.cornell.edu/ahhandmsquest.html
 *
 * Jalur di bawah bukan gambar tiruan. Ia hasil pembacaan langsung isi PDF:
 * aliran halaman dibuka (FlateDecode), operator jalurnya (m/l/c) ditafsirkan,
 * lalu dipetakan ke satu bingkai bersama. Keenam diagram pada form adalah
 * salinan gambar tangan yang sama dengan satu bentuk arsiran berbeda; garis
 * luar & garis detail diambil dari salah satunya, dan keenam arsiran
 * ditransformasikan ke bingkai itu lewat kotak pembatas garis luar
 * masing-masing.
 *
 * KENAPA INI PENTING, BUKAN SEKADAR KERAPIAN.
 * Versi sebelumnya menggambar tangan sendiri dari persegi panjang membulat,
 * dan batas antar-areanya adalah tafsir saya atas gambar Cornell — termasuk
 * pembelahan jari manis, yang saya ambil dari deskripsi literatur. Kini batas
 * itu berasal dari gambar Cornell sendiri. Untuk instrumen penelitian,
 * perbedaannya bukan estetika: responden menjawab BERDASARKAN GAMBAR, sehingga
 * gambar yang berbeda berarti pertanyaan yang berbeda.
 *
 * Pemeriksaan arsiran hasil ekstraksi membenarkan pembagian yang selama ini
 * dipakai: area A menutup telunjuk, jari tengah, dan separuh jari manis;
 * area B menutup kelingking dan separuh jari manis yang lain — batas persarafan
 * medianus/ulnaris.
 *
 * JANGAN MENYUNTING ANGKA JALUR DI BAWAH DENGAN TANGAN. Bila perlu diperbarui,
 * ekstrak ulang dari PDF; menggeser satu titik berarti menggeser instrumen.
 *
 * Bingkai: 65 × 77 satuan, sisi kiri = sisi kelingking,
 * ibu jari di kanan — persis orientasi `rhandq.pdf`.
 */

import type { HurufArea } from './area'

export const LEBAR_DIAGRAM = 65
export const TINGGI_DIAGRAM = 77

/** Garis luar tangan (telapak, empat jari, ibu jari, pergelangan). */
export const JALUR_LUAR =
  'M22.63 61.97L23.36 60.07L20.87 56.27L18.82 52.17L17.06 48.22L15.6 44.56L13.4 38.27L12.52 35.93L11.79 34.61L8.86 31.54L6.52 28.32L4.61 24.8L3.15 21.29L3 20.27L3.44 19.39L4.17 18.66L5.05 18.66L6.08 19.39L6.81 20.27L9.15 24.07L10.76 25.83L12.52 27.29L13.84 29.05L15.3 30.66L16.18 31.24L17.21 31.68L17.65 31.54L18.09 31.1L17.94 30.22L17.35 28.46L14.86 23.63L12.08 18.22L10.47 14.27L10.03 12.95L9.88 11.78L10.18 10.76L11.06 9.58L12.67 9.58L13.84 10.02L14.57 10.9L15.16 12.07L16.04 14.85L16.62 16.17L17.5 17.19L18.97 19.68L21.6 24.66L23.21 27L23.65 27.29L24.24 27L24.68 26.41L24.68 25.97L23.51 20.85L22.77 16.02L22.19 11.05L21.31 5.78L21.46 4.9L22.04 3.88L22.48 3.44L22.92 3.15L23.36 3L23.8 3L25.56 4.17L26.58 5.93L27.17 7.83L27.61 9.58L28.63 13.24L29.51 15.88L30.24 19.54L31.12 25.83L31.41 26.27L31.71 26.56L32.29 26.41L32.88 25.68L33.03 24.95L33.03 20.41L33.47 15.73L34.2 6.07L34.64 5.49L35.37 5.05L36.25 4.9L37.13 5.34L38.44 7.68L39.32 10.46L39.62 13.24L39.62 21L39.76 26.85L40.06 29.78L40.79 32.85L42.11 35.93L44.01 38.85L45.62 39L46.21 38.85L46.79 38.56L47.67 37.68L48.55 36.66L50.6 33.88L52.07 32.41L54.12 30.95L55.88 29.93L57.78 29.19L58.81 29.05L59.68 29.05L60.71 29.34L61.59 29.63L62.32 30.51L62.47 31.54L62.17 32.41L61.73 32.71L61.3 33.15L59.1 34.9L56.9 36.95L52.95 41.05L52.21 42.51L51.77 44.27L51.19 45.88L50.75 46.46L50.02 47.19L47.38 49.54L44.89 52.02L42.69 54.66L40.64 57.29L42.4 65.78L43.13 69.88L44.45 74.12M40.79 57L39.18 57.58L37.86 57.73L36.69 57.73L34.93 58.02L32.88 57.73L31.12 57.15L29.51 56.27'

/** Garis lipatan & kuku di dalam siluet — hanya guratan, tanpa isian. */
export const JALUR_DETAIL =
  'M36.69 57.73L34.78 56.27L33.61 55.39L32.59 53.93M52.36 32.27L52.95 33.58L53.53 34.46M51.19 33.29L51.48 33.44L51.92 33.73L52.36 34.32L52.65 35.19M44.01 38.85L42.99 39.44L41.52 39.44M42.99 37.83L42.11 37.83L41.08 37.68L38.88 37.1M42.99 37.83L39.91 35.78M40.64 33.15L38.74 33.44L37.86 33.73L36.98 34.32L36.25 34.9L35.66 35.49L34.34 37.1L32.29 41.05L30.68 44.71L29.8 47.63L29.22 49.97L28.93 51.73M36.54 34.61L36.4 34.9L36.54 34.61L34.64 35.19L33.03 36.07L29.66 38.12L28.63 39.29L27.46 40.61L25.26 43.24M39.76 27.88L38.74 27.88L37.27 27.58L34.64 26.71M27.9 11.19L26.58 12.07L25.26 12.37L23.51 12.37M14.72 42.07L16.47 41.78L18.09 41.19L21.46 39.29L24.82 37.24L28.05 35.34L29.51 33.88L30.39 32.71L32.15 30.07M23.36 60.07L24.09 60.8L25.12 61.1L28.49 60.8L32.73 60.22L34.78 59.78L36.54 59.34L38.01 58.9L39.03 58.46M23.36 60.07L22.77 61.39L22.48 63.15L22.48 65.05L22.92 71.19L22.92 74.71M23.65 61.54L24.24 61.83L24.97 61.97L26.58 62.12L30.54 61.83L34.34 60.95L37.27 60.22M20.28 29.78L19.84 29.78L20.28 29.78ZM26 27L26.87 27L27.9 26.85L29.95 26.27M19.11 23.34L17.94 23.78L16.77 24.37M19.11 23.34L19.7 23.78L19.26 24.22L17.21 25.1M34.49 13.1L35.08 13.54L36.25 13.83L38.44 13.68M45.91 42.8L45.18 41.93L44.74 40.9L44.74 39.73M22.77 28.76L21.75 29.49L19.99 30.07M22.77 28.17L21.02 29.19L19.7 29.93L19.26 30.07L18.97 30.07M13.4 35.49L14.42 34.76L15.16 34.02L15.45 33.58M12.37 29.63L11.79 30.37L10.91 30.95M11.79 29.49L11.35 29.63L10.18 30.95M8.71 25.54L8.13 25.97L7.25 26.71M16.47 17.49L15.45 17.63L14.42 18.07L13.11 18.95'

/** Bentuk arsiran tiap area, sebagaimana diarsir hitam pada form asli. */
export const JALUR_AREA: Record<HurufArea, string> = {
  A:
    'M39.75 22.45C39.75 19.53 39.72 17.95 39.72 15.03C39.72 13.64 39.61 12.78 39.39 11.42C39.17 10.07 39.03 9.06 38.37 7.86C37.71 6.65 37.35 4.94 35.96 4.94C34.31 4.94 33.93 7.21 34.12 8.86L33.53 12.5L33.35 15.61L33.09 18.64L33.02 22.69C32.76 24.3 33.32 26.44 31.71 26.44C30.5 26.44 30.9 24.72 30.76 23.51C30.57 22.01 30.39 21.31 30.24 19.83C30.06 17.94 30.25 19.25 29.74 17.1C29.04 14.32 27.65 9.96 26.96 7.22C26.52 5.53 25.54 3.23 23.78 3.23C22.43 3.23 21.56 4.23 21.38 5.59L24.5 26.26C24.32 26.62 23.59 27.24 23.25 26.95C22.07 25.97 23.31 27.61 22.43 25.93C20.86 22.97 18.31 18.52 16.47 15.59C15.13 13.44 15.19 10.18 12.66 9.52L11.35 9.77C11.68 14.05 13.33 16.31 15.52 20C16.84 22.2 17.28 23.66 18.45 25.86C19 26.92 19.55 27.47 20.21 28.45C20.54 28.97 20.69 29.63 21.31 29.63C23.43 29.63 23.8 26.66 25.92 26.66L32.95 26.66C35.22 27.17 36.86 27.72 39.21 27.9C40.19 27.98 39.45 28.26 39.61 25.62C39.68 24.41 39.75 23.66 39.75 22.45',
  B:
    'M12.77 35.81C10.31 32.52 8.64 31.83 6.52 28.32C4.9 25.65 2.95 23.15 2.95 20C2.95 19.13 3.83 18.61 4.71 18.61C6.54 18.61 6.83 20.59 7.79 22.13C9.62 25.05 11.12 26.59 13.75 28.71C15.14 29.81 15.44 31.79 17.27 31.79C17.6 31.79 17.82 31.68 18.15 31.64C18.18 31.31 18.29 31.09 18.29 30.76C18.29 29.55 17.09 27.84 16.56 26.78C14.65 22.97 15.53 24.87 13.19 20.34C11.98 17.99 9.98 14.15 9.98 11.52C9.98 10.75 10.31 9.83 11.08 9.83C12.84 9.83 10.88 8.85 11.5 10.46C12.46 12.95 15.44 17.37 16.54 19.79C17.49 21.91 18 23.15 19.17 25.2C20.05 26.77 21.17 27.65 21.83 29.26C22.08 29.87 20.86 30.1 20.34 30.47C19.54 31.05 19.06 31.49 18.15 31.93C15.84 33.07 14.65 34.39 12.77 35.81',
  C:
    'M62.32 30.51C61.26 29.34 60.07 28.97 58.46 28.97C55.09 28.97 53.3 30.77 50.85 33.03C49.38 34.39 49.38 35.93 47.92 37.28C47.33 37.79 46.89 38.27 46.16 38.6C45.5 38.89 44.55 38.89 44.55 39.62C44.55 41.41 45.5 42.33 46.6 43.72C47.73 45.14 48.54 46.64 50.41 46.64C50.85 46.64 50.96 46.13 51.14 45.77C51.91 44.38 51.76 43.24 52.46 41.81C53.34 40.06 54.58 39.51 55.83 38.01C57.22 36.33 58.28 35.52 59.93 34.06C60.99 33.14 62.26 33.32 62.26 31.9C62.26 31.46 62.47 30.88 62.32 30.51',
  D:
    'M44.13 38.84C41.64 36.79 41.24 34.56 40.32 31.48C39.95 30.17 40.32 29.03 39.44 27.97C38.27 26.58 36.88 26.76 35.05 26.36L31.24 26.36C27.06 27.09 24.21 26.36 20.84 28.85C18.83 30.31 17.62 31.34 15.86 33.09C14.65 34.3 12.78 34.52 12.78 36.24C12.78 39.09 14.28 40.45 15.27 43.15C15.97 45.13 15.79 47 17.62 47.98L20.4 47.98C23.99 48.57 26.33 48.35 29.33 50.32C30.91 47.65 32.34 46.45 34.61 44.32C37.76 41.4 39.84 39.31 44.13 38.84',
  E:
    'M44.39 38.95C42.86 38.95 42.09 39.68 40.59 39.97C38.17 40.45 36.7 40.99 34.87 42.6C32.71 44.51 30.92 46.04 30.92 48.93C30.92 52.92 33.01 55.85 36.78 57.35L40 57.35C42.45 56.69 42.71 54.35 44.39 52.52C46.26 50.51 47.8 49.7 49.67 47.69C50.36 46.92 51.75 46.37 51.35 45.39C50.91 44.32 49.56 44.98 48.5 44.51C46.92 43.77 45.86 42.93 45.27 41.29C44.94 40.37 45.38 38.95 44.39 38.95',
  F:
    'M38.77 57.35C36.61 57.35 35.51 56.62 33.42 56.07C29.28 54.97 26.87 54.31 22.58 54.31C21.59 54.31 21.08 54.49 20.09 54.35C21.59 57.86 21.79 61.02 25.64 61.02C29.12 61.02 32.8 60.09 36.2 59.25C37.3 58.99 38 58.85 38.99 58.37C39.64 58.04 40.63 57.97 40.56 57.2C40.49 56.51 39.46 57.35 38.77 57.35',
}

/** Transform SVG untuk menggambar tangan kiri dari geometri tangan kanan. */
export const CERMIN_TANGAN_KIRI = `translate(${LEBAR_DIAGRAM},0) scale(-1,1)`

/** Nama jari dari kiri ke kanan pada gambar tangan KANAN. */
export const URUTAN_JARI = [
  'Kelingking',
  'Manis',
  'Tengah',
  'Telunjuk',
  'Ibu jari',
] as const

// ── Area sentuh ────────────────────────────────────────────────────────────
//
// DIPISAH DARI ARSIRAN, dengan alasan yang sama seperti pada peta tubuh
// (`lib/cmdq/bodymap.ts`): arsiran harus setia pada gambar Cornell, sedangkan
// target sentuh harus setia pada jari manusia. Satu bentuk tidak bisa memenuhi
// keduanya — dan di sini pertentangannya paling tajam, karena dua arsiran
// (area A dan B) sengaja BERTUMPANG TINDIH di jari manis. Kalau bentuk arsiran
// juga yang menangkap ketukan, ketukan pada jari manis jatuh ke area mana pun
// yang kebetulan dirender belakangan.
//
// Aturan penyusunan:
//   1. sisi terpendek ≥ 14 satuan (≈ 65px pada lebar render tersempit 300px);
//   2. tidak ada dua area yang beririsan;
//   3. tidak ada celah — seluruh permukaan tangan menjadi milik satu area.
//      Lubang tak bertuan menghasilkan ketukan yang "tidak terjadi apa-apa",
//      dan responden menyimpulkan aplikasinya rusak, bukan bahwa ia meleset.

export interface AreaSentuhTangan {
  huruf: HurufArea
  bentuk: readonly { x: number; y: number; w: number; h: number }[]
}

export const SENTUH_AREA: readonly AreaSentuhTangan[] = [
  // Telunjuk + jari tengah + separuh jari manis (sisi jari tengah)
  { huruf: 'A', bentuk: [{ x: 17, y: 0, w: 28, h: 28 }] },
  // Kelingking + separuh jari manis + tepi telapak sisi kelingking
  { huruf: 'B', bentuk: [{ x: 0, y: 0, w: 17, h: 46 }] },
  // Ibu jari
  { huruf: 'C', bentuk: [{ x: 45, y: 24, w: 20, h: 22 }] },
  // Telapak bagian atas, tepat di bawah pangkal keempat jari
  { huruf: 'D', bentuk: [{ x: 17, y: 28, w: 28, h: 18 }] },
  // Pangkal ibu jari (tonjolan tenar)
  { huruf: 'E', bentuk: [{ x: 33, y: 46, w: 32, h: 14 }] },
  // Pangkal telapak & pergelangan. Bentuk L: sisi kelingking bawah + pita
  // melintang di pangkal.
  {
    huruf: 'F',
    bentuk: [
      { x: 0, y: 46, w: 33, h: 14 },
      { x: 0, y: 60, w: 65, h: 17 },
    ],
  },
] as const

/**
 * Titik jangkar huruf A–F — titik tengah arsiran aslinya, dibulatkan.
 *
 * Huruf adalah sasaran bidik visual, jadi ia harus jatuh di dalam area
 * sentuhnya sendiri; kalau tidak, responden membidik huruf C lalu memilih E.
 * Dijaga oleh `tests/diagram-tangan.test.ts`.
 */
export const TITIK_HURUF: Record<HurufArea, { x: number; y: number }> = {
  A: { x: 25.7, y: 16.4 },
  B: { x: 12.6, y: 22.3 },
  C: { x: 53.5, y: 37.9 },
  D: { x: 28.5, y: 38.4 },
  E: { x: 41.3, y: 48.2 },
  F: { x: 30.4, y: 57.6 },
}
