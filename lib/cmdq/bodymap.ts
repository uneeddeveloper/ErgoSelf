/**
 * Geometri peta tubuh CMDQ — DIEKSTRAK LANGSUNG DARI FORM ASLI.
 *
 * Sumber: `mmsquest.pdf` (© Cornell University, 1994), berkas resmi Cornell
 * Musculoskeletal Discomfort Questionnaire versi pekerja duduk —
 * https://ergo.human.cornell.edu/ahmsquest.html
 *
 * Jalur di bawah bukan figur buatan sendiri. Ia hasil pembacaan langsung isi
 * PDF: aliran halaman dibuka (ASCII85 + LZW), operator jalurnya (m/l/c/v/y)
 * ditafsirkan, lalu dipindahkan ke bingkai 138×424 satuan.
 *
 * ══ FIGURNYA TAMPAK BELAKANG ══
 *
 * Ini menentukan arah kiri–kanan, jadi bukan detail yang boleh dikira-kira.
 * Buktinya ada pada gambar itu sendiri: kepala digambar dengan sepasang
 * telinga tetapi TANPA mata, hidung, atau mulut, dan sebuah garis membujur
 * menyusuri punggung — tulang belakang. Form Cornell juga menempatkan
 * "Upper Back", "Lower Back", dan "Hip/Buttocks" langsung pada badan figur ini,
 * yang hanya masuk akal bila ia dilihat dari belakang.
 *
 * Konsekuensinya: SISI KANAN LAYAR = SISI KANAN RESPONDEN. Tidak ada efek
 * cermin. Versi peta tubuh sebelumnya menggambar tampak DEPAN dan karena itu
 * membalik kiri–kanan; menyalin aturan itu ke sini akan menukar seluruh
 * pasangan kiri/kanan pada data — kesalahan yang sistematis, diam, dan baru
 * ketahuan (kalau beruntung) saat analisis.
 *
 * ══ JANGKAR DARI GARIS PENUNJUK CORNELL ══
 *
 * Form aslinya menarik garis dari tiap label ke satu titik pada figur. Sebelas
 * garis itu ikut diekstrak, dan titik pangkalnya dipakai sebagai pusat area
 * sentuh di bawah. Jadi letak tiap bagian tubuh bukan tafsir, melainkan
 * penempatan Cornell sendiri.
 *
 * JANGAN MENYUNTING ANGKA JALUR DENGAN TANGAN. Bila perlu diperbarui, ekstrak
 * ulang dari PDF; menggeser satu titik berarti menggeser instrumen.
 */

export const LEBAR_KANVAS = 138
export const TINGGI_KANVAS = 424

/** Garis luar tubuh: kepala, badan, kedua lengan, kedua tungkai, telapak kaki. */
export const JALUR_TUBUH =
  'M76.45 392C76.45 392 73.89 391.31 77.41 383.24C80.33 376.56 78.53 365.74 78.69 360.77C78.85 355.79 71.01 336.57 75.17 321.64C79.33 306.71 73.25 297.1 72.61 291.78C72.22 288.48 73.41 273.08 72.45 268.96C71.49 264.84 70.46 228.06 70.46 228.06C70.46 228.06 69.42 250.43 68.78 253.18C67.2 259.92 69.42 278.74 69.42 278.74C69.42 278.74 70.88 293.88 70.05 295.73C66.69 303.3 68.62 312.72 68.62 312.72C68.62 312.72 73.25 323.8 71.49 341.38C69.58 360.59 69.42 372.09 69.42 372.09C69.1 374.92 69.94 382.49 69.89 383.16C69.81 384.36 71.65 390.37 71.49 392.43C71.33 394.48 71.44 395.52 71.01 396.46M91.01 397.57C91.09 394.74 89.57 393.97 90.13 387.79C90.69 381.61 90.07 381.6 92.29 373.12C107.83 313.71 90.88 312.78 97.88 292.47C99.9 286.61 101.42 268.85 102.84 260.04C104.28 251.12 108.6 220.4 105.24 208.22C105.24 208.22 104.92 201.01 104.28 198.78C103.64 196.55 102.5 184.91 101.56 177.85C100.76 171.84 101.56 164.12 101.24 160.17C100.97 156.77 103.88 143.12 104.28 139.07C104.6 135.8 107.64 133.06 108.28 127.91C108.28 127.91 111.2 120.91 111.63 116.56C112.07 112.22 112.5 99.83 114.09 97.41M78.89 52.51C80.91 53.47 84.62 47.12 84.62 47.12C84.62 47.12 83.91 47.28 86.36 45.59C88.82 43.9 90.95 32.08 90.95 32.08C90.87 29.42 90.56 17.44 89.69 16.23C88.82 15.02 88.82 14.22 87.23 11C85.65 7.78 78.73 4.56 78.73 4.56C72.87 4.8 69.43 4 66.82 4.97C64.21 5.93 61.93 7.88 61.93 7.88C61.93 7.88 60.8 9.1 57.72 11.24C56.43 12.13 51.71 19.88 52.5 28.3C52.71 30.62 51.31 35.13 53.29 38.51C55.27 41.89 54 41.81 55.58 44.14C57.16 46.48 57.8 46.32 57.8 46.32M23.5 227.45C23.5 227.45 23.94 231.45 24.95 232.41C24.95 232.41 24.95 233.61 25.27 233.61C25.27 233.61 27.19 240.13 30.71 237.9L28.79 230.35C28.79 230.35 28.31 222.29 26.39 220.23C26.39 220.23 23.67 213.37 20.95 210.62C18.23 207.87 17.92 196.38 20.63 192.95C23.35 189.51 26.07 167.89 26.07 167.89C26.07 167.89 26.55 162.23 26.39 150.91C26.23 139.58 28.66 138.34 30.07 133.06C30.56 131.21 31.36 128.81 32.12 126.26M56.67 398.46C57.05 395.08 57.97 393.65 58.16 391.4C59.77 382.52 41.93 326.3 47.9 305.67C49.79 299.13 43.98 275.83 36.63 247.17C29.27 218.51 34.23 194.32 36.31 187.45C38.39 180.59 37.11 164.12 37.11 164.12C37.11 164.12 38.55 149.53 36.63 142.33C34.71 135.12 32.31 126.37 32.31 126.37C32.31 126.37 30.71 120.27 30.42 117.05C30.13 113.83 28.98 105.3 28.11 101.6M70.67 76.33C70.67 76.33 73.41 101.27 72.69 111.41C71.96 121.55 68.07 158.25 70.67 165.97M14.25 230.78C14.25 230.78 15.28 233.85 14.77 235C14.77 235 15.97 237.21 15.54 238.36C15.54 238.36 17.69 242.78 15.28 242.78C15.28 242.78 12.79 239.61 12.45 237.88C12.1 236.15 10.81 232.41 10.81 232.41C10.81 232.41 9.53 229.19 9.88 228.52C9.38 224.99 8 216.8 8.96 209.76C9.92 202.73 8.8 193.46 8.8 193.46C4 167.03 9.12 145.76 9.12 145.76C11.68 134.77 9.12 131.34 10.4 124.48C12.7 112.1 14.56 105.6 14.56 105.6C12.64 74.37 24.21 76.67 26.13 73.24C28.05 69.8 34.77 70.15 34.77 70.15C34.77 70.15 36.41 70.05 40.69 68.6C46.77 66.54 54.06 64.94 58.38 58.76M113.12 227.09C113.12 227.09 112.67 231.08 111.66 232.05C111.66 232.05 111.66 233.25 111.34 233.25C111.34 233.25 109.42 239.77 105.9 237.54L107.82 229.99C107.82 229.99 108.3 221.92 110.22 219.86C110.22 219.86 113.15 212.99 115.87 210.25C116.1 210.01 119.32 206.5 117.4 192.77C114.54 172.32 113.24 168.92 113.24 168.92C112.44 165.32 114.2 156.74 110.84 142.5C109.77 137.96 109.12 132.65 108.73 127.52M122.36 230.42C122.36 230.42 121.33 233.49 121.84 234.64C121.84 234.64 120.64 236.85 121.07 238C121.07 238 118.92 242.41 121.33 242.41C121.33 242.41 123.82 239.24 124.17 237.52C124.51 235.79 125.8 232.05 125.8 232.05C125.8 232.05 127.08 228.83 126.74 228.16C127.23 224.62 128.72 219.4 127.76 212.37C127.52 207.65 127.63 198.44 128.11 193.12C128.59 187.8 133 172.53 129.87 150.73C128.92 144.11 133.66 124.64 127.36 107.62C127.36 107.62 132 87.45 122.58 78.9C122.58 78.9 114.77 70.09 99.23 67.06C96.04 66.44 85.86 62.45 84.58 59.02'

/** Guratan detail: telinga, tulang belakang, lipatan lutut, jari kaki. */
export const JALUR_DETAIL =
  'M84.31 48.09C84.31 48.09 84.46 52.91 84.39 55.25C84.36 56.03 84.56 57.51 84.58 59.02M56.67 45.59C56.67 45.59 58.55 50.09 63.17 52.19C63.17 52.19 65.33 54.6 69.37 54.28M68.07 52.99C68.07 52.99 71.53 56.69 75.86 54.28C80.19 51.86 78.6 51.22 78.6 51.22M58.43 48.33C58.35 48.33 57.96 53.88 58.27 55.81C58.38 56.47 58.3 57.8 58.15 59.25M88.7 88.24C88.7 88.24 85.67 111.09 92.74 117.85M56.39 88.24C56.39 88.24 59.41 111.09 52.35 117.85M56.53 166.78C56.53 166.78 62.88 166.46 64.9 173.54M78.46 173.54C78.31 173.7 80.04 167.58 83.36 167.58M74.22 181.63C74.07 181.63 71.19 183.89 71.33 185.66M70.52 227.94C70.52 227.94 71.1 219.41 70.52 218.44M42.64 218.07C54.21 226.31 61.98 225.51 70.52 218.44C73.38 216.08 76.37 183.99 66.68 181.45M71.08 218.44C70.32 223.52 96.72 229.41 100.94 213.82M61.55 298.52C61.55 298.52 56.21 295.94 53.18 299.16M77.01 397.25C77.01 397.25 77.3 394.03 75.86 391.13C74.42 388.24 77.45 387.27 77.45 385.34M91.01 396.12C91.01 396.12 91.44 393.71 92.88 396.45C94.32 399.18 92.74 399.18 92.74 400.79C92.74 402.4 92.16 404.65 91.44 405.14C90.72 405.62 90.72 409.32 90.72 409.32C90.72 409.32 85.33 419.72 77.45 410.77C76.32 409.49 77.01 404.98 76.87 404.17C76.72 403.37 76 399.99 75.57 399.82C75.14 399.66 73.7 394.35 75.86 392.9M71.03 396.53C71.03 396.53 70.02 400.07 70.45 403.93C70.88 407.79 70.16 411.82 67.57 412.46C64.97 413.1 60.51 413.11 59.63 412.46C58.98 411.98 56.96 408.52 54.65 405.78C52.35 403.04 50.62 401.43 50.62 401.43C50.62 401.43 49.1 396.2 50.4 395.72C50.4 395.72 51.05 395.32 51.99 395.16C52.92 395 53.14 394.59 54.08 394.59C55.02 394.59 55.23 392.66 57.68 392.9M62.59 384.05C62.73 384.13 64.25 400.31 60.35 403.77M66.34 383.49C66.34 383.49 65.26 390.09 66.34 392.5M66.19 399.02C66.19 399.02 67.06 402.64 69.44 403.45M18.45 221.26C18.45 221.26 19.39 226.25 22.7 227.29C22.7 227.29 24 227.86 24.72 227.13M23.28 227.8C23.28 227.8 24.57 232.7 24.57 234.33C24.57 234.33 26.47 237.11 26.55 239.23C26.64 241.34 26.55 239.51 26.55 239.51C26.55 239.51 28.62 244.41 27.76 246.04C27.76 246.04 26.33 247.32 25.38 245.69C25.38 245.69 23.14 241.3 23.06 240.89M20.1 231.64C20.1 231.64 21.91 235.29 21.91 237.21C21.91 237.21 23.2 240.57 23.03 242.58C23.03 242.58 26.72 247.54 23.89 248.73C23.89 248.73 21.48 248.34 20.79 247.1M16.83 230.97C16.83 230.97 18.21 233.66 18.04 235.96C18.04 235.96 19.93 239.8 19.59 241.53C19.24 243.26 19.59 241.91 19.59 241.91C19.59 241.91 22.6 247.1 19.24 246.9C19.24 246.9 16.66 244.6 16.23 242.2M118.17 220.89C118.17 220.89 117.23 225.88 113.91 226.93C113.91 226.93 112.61 227.49 111.89 226.77M113.33 227.44C113.33 227.44 112.04 232.33 112.04 233.97C112.04 233.97 110.15 236.75 110.06 238.86C109.97 240.97 110.06 239.15 110.06 239.15C110.06 239.15 108 244.04 108.86 245.67C108.86 245.67 110.29 246.96 111.23 245.33C111.23 245.33 113.48 240.93 113.55 240.53M116.51 231.28C116.51 231.28 114.7 234.93 114.7 236.85C114.7 236.85 113.41 240.2 113.59 242.22C113.59 242.22 109.89 247.17 112.73 248.36C112.73 248.36 115.14 247.98 115.82 246.73M119.78 230.61C119.78 230.61 118.4 233.29 118.58 235.6C118.58 235.6 116.68 239.44 117.03 241.16C117.37 242.89 117.03 241.55 117.03 241.55C117.03 241.55 114.02 246.73 117.37 246.54C117.37 246.54 119.95 244.24 120.38 241.84M81.71 387.48C81.71 387.48 82.55 396.16 81.44 398.64M86.16 387.79C86.16 387.79 84.77 398.02 87.27 401.74M81.44 302.86C81.44 302.86 84.85 299.54 91.16 302.55'

/**
 * Titik yang ditunjuk garis penunjuk Cornell untuk tiap baris label.
 * Dipakai sebagai pusat visual, dan diuji agar tetap berada di dalam area
 * sentuh bagian tubuh yang bersangkutan.
 */
export const JANGKAR_CORNELL: Record<string, { x: number; y: number }> = {
  LEHER: { x: 70.9, y: 60.3 },
  BAHU: { x: 116.9, y: 84.3 },
  PUNGGUNG_ATAS: { x: 78.9, y: 103.3 },
  LENGAN_ATAS: { x: 121.9, y: 122.3 },
  PUNGGUNG_BAWAH: { x: 76.9, y: 152.3 },
  LENGAN_BAWAH: { x: 122.9, y: 180.3 },
  PERGELANGAN_TANGAN: { x: 122.9, y: 206.3 },
  PINGGUL_BOKONG: { x: 94.9, y: 207.3 },
  PAHA: { x: 89.9, y: 268.3 },
  LUTUT: { x: 87.9, y: 302.3 },
  TUNGKAI_BAWAH: { x: 86.9, y: 331.3 },
}

// ── Area sentuh ────────────────────────────────────────────────────────────
//
// Sama seperti pada diagram tangan: bentuk yang DIGAMBAR (figur Cornell) dan
// bentuk yang DISENTUH sengaja dipisah. Siluet manusia yang realistis punya
// leher selebar 20 satuan dan pergelangan selebar 8 — tidak satupun layak
// dijadikan sasaran jari.
//
// Susunannya membagi habis seluruh bingkai menjadi pita mendatar, lalu tiap
// pita dibelah menurut sumbu tengah figur (x = 69):
//
//   kepala & leher      → LEHER (satu pita penuh)
//   bahu … pergelangan  → lengan di kiri & kanan, badan di tengah
//   panggul ke bawah    → belah dua: tungkai kiri & tungkai kanan
//
// Tidak ada celah sama sekali. Setiap ketukan di dalam bingkai punya jawaban —
// termasuk ketukan pada kepala, yang jatuh ke LEHER. CMDQ memang tidak
// menanyakan kepala, dan "tidak terjadi apa-apa" adalah tanggapan terburuk:
// responden menyimpulkan aplikasinya rusak, bukan bahwa ia salah sasaran.

export interface AreaSegmen {
  kode: string
  x: number
  y: number
  w: number
  h: number
}

export const AREA_SEGMEN: readonly AreaSegmen[] = [
  // Kepala & leher — satu pita penuh
  { kode: 'LEHER', x: 4, y: 4, w: 130, h: 70 },

  // Bahu
  { kode: 'BAHU_KIRI', x: 4, y: 74, w: 31, h: 24 },
  { kode: 'BAHU_KANAN', x: 103, y: 74, w: 31, h: 24 },
  { kode: 'PUNGGUNG_ATAS', x: 35, y: 74, w: 68, h: 46 },

  // Lengan atas
  { kode: 'LENGAN_ATAS_KIRI', x: 4, y: 98, w: 31, h: 42 },
  { kode: 'LENGAN_ATAS_KANAN', x: 103, y: 98, w: 31, h: 42 },
  { kode: 'PUNGGUNG_BAWAH', x: 35, y: 120, w: 68, h: 44 },

  // Lengan bawah
  { kode: 'LENGAN_BAWAH_KIRI', x: 4, y: 140, w: 31, h: 46 },
  { kode: 'LENGAN_BAWAH_KANAN', x: 103, y: 140, w: 31, h: 46 },
  { kode: 'PINGGUL_BOKONG', x: 35, y: 164, w: 68, h: 62 },

  // Pergelangan tangan
  { kode: 'PERGELANGAN_TANGAN_KIRI', x: 4, y: 186, w: 31, h: 40 },
  { kode: 'PERGELANGAN_TANGAN_KANAN', x: 103, y: 186, w: 31, h: 40 },

  // Dari panggul ke bawah bingkai dibelah dua — tidak ada lagi lengan yang
  // perlu ruang di sisi, jadi tiap tungkai mendapat separuh lebar penuh.
  { kode: 'PAHA_KIRI', x: 4, y: 226, w: 65, h: 60 },
  { kode: 'PAHA_KANAN', x: 69, y: 226, w: 65, h: 60 },

  { kode: 'LUTUT_KIRI', x: 4, y: 286, w: 65, h: 34 },
  { kode: 'LUTUT_KANAN', x: 69, y: 286, w: 65, h: 34 },

  { kode: 'TUNGKAI_BAWAH_KIRI', x: 4, y: 320, w: 65, h: 100 },
  { kode: 'TUNGKAI_BAWAH_KANAN', x: 69, y: 320, w: 65, h: 100 },
] as const

const _peta = new Map(AREA_SEGMEN.map((a) => [a.kode, a]))

export function cariArea(kode: string): AreaSegmen | undefined {
  return _peta.get(kode)
}

/** Titik tengah sebuah area — dipakai menempatkan penanda skor. */
export function pusatArea(a: AreaSegmen): { x: number; y: number } {
  return { x: a.x + a.w / 2, y: a.y + a.h / 2 }
}
