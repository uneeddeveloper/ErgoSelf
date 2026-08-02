/**
 * Geometri peta tubuh (body map) — koordinat area sentuh tiap segmen.
 *
 * Disimpan sebagai DATA, bukan digambar langsung di template, supaya letak
 * area bisa disetel tanpa menyentuh logika komponen.
 *
 * Kanvas: viewBox "0 0 400 272", dua figur berdampingan
 *   - Tampak DEPAN  (pusat x = 100) — leher, bahu, lengan, tangan, tungkai
 *   - Tampak BELAKANG (pusat x = 300) — punggung, pinggang, bokong, pantat
 *
 * PENTING — cermin kiri/kanan:
 * Pada tampak depan, sisi KIRI responden berada di sebelah KANAN layar
 * (seperti bercermin). Koordinat di bawah sudah memperhitungkan hal ini,
 * dan setiap area tetap menampilkan namanya saat disentuh sehingga responden
 * tidak perlu menebak.
 */

export type Tampak = 'DEPAN' | 'BELAKANG'

export interface AreaSegmen {
  kode: string
  tampak: Tampak
  x: number
  y: number
  w: number
  h: number
  /** Radius sudut; default setengah sisi terpendek */
  rx?: number
}

/** Siluet non-interaktif — hanya untuk membentuk figur manusia. */
export interface BentukSiluet {
  tipe: 'rect' | 'ellipse'
  x: number
  y: number
  w: number
  h: number
  rx?: number
}

export const LEBAR_KANVAS = 400
export const TINGGI_KANVAS = 272

export const SILUET: readonly BentukSiluet[] = [
  // — Tampak depan —
  { tipe: 'ellipse', x: 85, y: 12, w: 30, h: 34 }, // kepala
  { tipe: 'rect', x: 78, y: 64, w: 44, h: 88, rx: 14 }, // badan
  // — Tampak belakang —
  { tipe: 'ellipse', x: 285, y: 12, w: 30, h: 34 }, // kepala
  { tipe: 'rect', x: 291, y: 44, w: 18, h: 20, rx: 6 }, // leher
  { tipe: 'rect', x: 264, y: 66, w: 22, h: 13, rx: 6 }, // bahu ka
  { tipe: 'rect', x: 314, y: 66, w: 22, h: 13, rx: 6 }, // bahu ki
  { tipe: 'rect', x: 260, y: 81, w: 17, h: 72, rx: 8 }, // lengan ka
  { tipe: 'rect', x: 323, y: 81, w: 17, h: 72, rx: 8 }, // lengan ki
  { tipe: 'rect', x: 279, y: 172, w: 19, h: 84, rx: 9 }, // tungkai ka
  { tipe: 'rect', x: 302, y: 172, w: 19, h: 84, rx: 9 }, // tungkai ki
] as const

export const AREA_SEGMEN: readonly AreaSegmen[] = [
  // ── Tampak depan ────────────────────────────────────────────────────────
  { kode: 'LEHER_ATAS', tampak: 'DEPAN', x: 91, y: 44, w: 18, h: 10, rx: 4 },
  { kode: 'LEHER_BAWAH', tampak: 'DEPAN', x: 88, y: 55, w: 24, h: 10, rx: 4 },

  // Bahu — layar kiri = KANAN responden (tampak depan seperti bercermin)
  { kode: 'BAHU_KANAN', tampak: 'DEPAN', x: 62, y: 66, w: 24, h: 14, rx: 7 },
  { kode: 'BAHU_KIRI', tampak: 'DEPAN', x: 114, y: 66, w: 24, h: 14, rx: 7 },

  { kode: 'LENGAN_ATAS_KANAN', tampak: 'DEPAN', x: 60, y: 82, w: 17, h: 30, rx: 8 },
  { kode: 'LENGAN_ATAS_KIRI', tampak: 'DEPAN', x: 123, y: 82, w: 17, h: 30, rx: 8 },

  { kode: 'SIKU_KANAN', tampak: 'DEPAN', x: 60, y: 114, w: 17, h: 13, rx: 6 },
  { kode: 'SIKU_KIRI', tampak: 'DEPAN', x: 123, y: 114, w: 17, h: 13, rx: 6 },

  { kode: 'LENGAN_BAWAH_KANAN', tampak: 'DEPAN', x: 59, y: 129, w: 16, h: 26, rx: 8 },
  { kode: 'LENGAN_BAWAH_KIRI', tampak: 'DEPAN', x: 125, y: 129, w: 16, h: 26, rx: 8 },

  { kode: 'PERGELANGAN_TANGAN_KANAN', tampak: 'DEPAN', x: 59, y: 157, w: 16, h: 10, rx: 4 },
  { kode: 'PERGELANGAN_TANGAN_KIRI', tampak: 'DEPAN', x: 125, y: 157, w: 16, h: 10, rx: 4 },

  { kode: 'TANGAN_KANAN', tampak: 'DEPAN', x: 56, y: 169, w: 22, h: 18, rx: 8 },
  { kode: 'TANGAN_KIRI', tampak: 'DEPAN', x: 122, y: 169, w: 22, h: 18, rx: 8 },

  { kode: 'PAHA_KANAN', tampak: 'DEPAN', x: 79, y: 154, w: 19, h: 34, rx: 9 },
  { kode: 'PAHA_KIRI', tampak: 'DEPAN', x: 102, y: 154, w: 19, h: 34, rx: 9 },

  { kode: 'LUTUT_KANAN', tampak: 'DEPAN', x: 79, y: 190, w: 19, h: 14, rx: 7 },
  { kode: 'LUTUT_KIRI', tampak: 'DEPAN', x: 102, y: 190, w: 19, h: 14, rx: 7 },

  { kode: 'BETIS_KANAN', tampak: 'DEPAN', x: 80, y: 206, w: 17, h: 28, rx: 8 },
  { kode: 'BETIS_KIRI', tampak: 'DEPAN', x: 103, y: 206, w: 17, h: 28, rx: 8 },

  { kode: 'PERGELANGAN_KAKI_KANAN', tampak: 'DEPAN', x: 80, y: 236, w: 17, h: 10, rx: 4 },
  { kode: 'PERGELANGAN_KAKI_KIRI', tampak: 'DEPAN', x: 103, y: 236, w: 17, h: 10, rx: 4 },

  { kode: 'KAKI_KANAN', tampak: 'DEPAN', x: 76, y: 248, w: 23, h: 14, rx: 6 },
  { kode: 'KAKI_KIRI', tampak: 'DEPAN', x: 101, y: 248, w: 23, h: 14, rx: 6 },

  // ── Tampak belakang ─────────────────────────────────────────────────────
  { kode: 'PUNGGUNG', tampak: 'BELAKANG', x: 282, y: 66, w: 36, h: 42, rx: 12 },
  { kode: 'PINGGANG', tampak: 'BELAKANG', x: 282, y: 110, w: 36, h: 22, rx: 8 },
  { kode: 'BOKONG', tampak: 'BELAKANG', x: 280, y: 134, w: 40, h: 20, rx: 9 },
  { kode: 'PANTAT', tampak: 'BELAKANG', x: 282, y: 156, w: 36, h: 16, rx: 8 },
] as const

/** Label judul tiap tampak, ditampilkan di atas figur. */
export const JUDUL_TAMPAK: Record<Tampak, { label: string; x: number }> = {
  DEPAN: { label: 'Tampak Depan', x: 100 },
  BELAKANG: { label: 'Tampak Belakang', x: 300 },
}
