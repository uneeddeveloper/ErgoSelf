/**
 * Geometri peta tubuh (body map) — bentuk figur dan koordinat area sentuh.
 *
 * Disimpan sebagai DATA, bukan digambar langsung di template, supaya letak
 * area bisa disetel tanpa menyentuh logika komponen.
 *
 * Kanvas: viewBox "0 0 400 320", dua figur berdampingan
 *   - Tampak DEPAN  (pusat x = 100) — leher, bahu, lengan, tangan, tungkai
 *   - Tampak BELAKANG (pusat x = 300) — punggung, pinggang, bokong, pantat
 *
 * Figur digambar SEKALI pada pusat x = 100, lalu dipakai ulang untuk tampak
 * belakang dengan `translate(200 0)`. Tubuh manusia simetris kiri–kanan,
 * jadi satu set jalur (path) cukup untuk kedua tampak; yang membedakan hanya
 * garis detail di dalamnya (dada/perut vs tulang belakang/bahu belakang).
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

export const LEBAR_KANVAS = 400
export const TINGGI_KANVAS = 320

/** Titik pusat horizontal tiap figur. */
export const PUSAT_TAMPAK: Record<Tampak, number> = {
  DEPAN: 100,
  BELAKANG: 300,
}

/**
 * Siluet figur — satu jalur berisi beberapa sub-path (kepala, badan, dua
 * lengan, dua tungkai). Digabung dalam SATU string supaya isian tembus
 * pandangnya tidak menumpuk di bagian yang beririsan (bahu/pangkal paha).
 */
export const FIGUR_TUBUH = [
  // Kepala + leher
  'M 100 14 C 108 14 115 21 115 30 C 115 38 112 44 107 48',
  'C 106 50 107 52 107 54 L 93 54 C 93 52 94 50 93 48',
  'C 88 44 85 38 85 30 C 85 21 92 14 100 14 Z',
  // Badan: bahu → ketiak → tulang rusuk → pinggang → panggul
  'M 93 52 C 92 58 88 61 80 65 C 72 68 68 74 68 82',
  'C 70 90 73 92 76 93 C 78 104 80 113 81 123',
  'C 81 134 79 142 78 151 C 78 160 83 166 89 168 L 111 168',
  'C 117 166 122 160 122 151 C 121 142 119 134 119 123',
  'C 120 113 122 104 124 93 C 127 92 130 90 132 82',
  'C 132 74 128 68 120 65 C 112 61 108 58 107 52 Z',
  // Lengan kiri layar (= lengan KANAN responden)
  'M 78 68 C 69 70 62 76 61 86 C 58 100 56 110 55 120',
  'C 53 132 51 152 50 164 C 47 170 46 180 49 187',
  'C 53 193 60 192 63 186 C 65 178 64 168 64 163',
  'C 66 150 68 134 70 120 C 72 110 74 98 76 88 C 78 80 79 72 78 68 Z',
  // Lengan kanan layar (= lengan KIRI responden)
  'M 122 68 C 131 70 138 76 139 86 C 142 100 144 110 145 120',
  'C 147 132 149 152 150 164 C 153 170 154 180 151 187',
  'C 147 193 140 192 137 186 C 135 178 136 168 136 163',
  'C 134 150 132 134 130 120 C 128 110 126 98 124 88 C 122 80 121 72 122 68 Z',
  // Tungkai kiri layar (= tungkai KANAN responden)
  'M 78 158 C 77 176 79 200 81 220 C 81 228 81 234 82 240',
  'C 80 252 82 266 85 278 C 86 284 86 288 86 291',
  'C 83 293 80 296 80 300 L 97 300 C 97 296 95 293 94 291',
  'C 94 288 94 284 94 278 C 96 266 97 252 96 240',
  'C 97 234 97 228 97 220 C 98 200 99 176 98 158 Z',
  // Tungkai kanan layar (= tungkai KIRI responden)
  'M 122 158 C 123 176 121 200 119 220 C 119 228 119 234 118 240',
  'C 120 252 118 266 115 278 C 114 284 114 288 114 291',
  'C 117 293 120 296 120 300 L 103 300 C 103 296 105 293 106 291',
  'C 106 288 106 284 106 278 C 104 266 103 252 104 240',
  'C 103 234 103 228 103 220 C 102 200 101 176 102 158 Z',
].join(' ')

/**
 * Garis anatomi di dalam figur — hanya guratan, tanpa isian. Membantu
 * responden mengenali bagian tubuh ("ini dada", "ini punggung") tanpa
 * menambah area yang bisa diklik.
 */
export const DETAIL_TAMPAK: Record<Tampak, string> = {
  DEPAN: [
    // Tulang selangka
    'M 84 69 C 92 75 108 75 116 69',
    // Dada
    'M 83 77 C 87 91 95 95 100 95',
    'M 117 77 C 113 91 105 95 100 95',
    // Garis tengah perut
    'M 100 95 L 100 128',
    // Otot perut
    'M 89 103 C 96 105 104 105 111 103',
    'M 88 113 C 96 115 104 115 112 113',
    'M 88 123 C 96 125 104 125 112 123',
    // Panggul
    'M 82 148 C 90 156 110 156 118 148',
    // Lutut
    'M 84 228 C 88 232 92 232 96 228',
    'M 116 228 C 112 232 108 232 104 228',
  ].join(' '),
  BELAKANG: [
    // Tulang belakang
    'M 100 62 L 100 168',
    // Tulang belikat
    'M 85 76 C 90 87 95 92 99 93',
    'M 115 76 C 110 87 105 92 101 93',
    // Otot punggung menyamping
    'M 79 92 C 84 108 88 120 93 130',
    'M 121 92 C 116 108 112 120 107 130',
    // Lipatan bokong
    'M 82 150 C 90 158 110 158 118 150',
    // Lutut belakang
    'M 84 228 C 88 232 92 232 96 228',
    'M 116 228 C 112 232 108 232 104 228',
  ].join(' '),
}

/** Cincin cahaya yang mengelilingi figur (efek hologram). */
export interface CincinCahaya {
  cy: number
  rx: number
  ry: number
}

export const CINCIN: readonly CincinCahaya[] = [
  { cy: 34, rx: 66, ry: 10 },
  { cy: 88, rx: 72, ry: 11 },
  { cy: 142, rx: 72, ry: 11 },
  { cy: 196, rx: 68, ry: 10 },
  { cy: 250, rx: 64, ry: 10 },
  { cy: 302, rx: 60, ry: 9 },
] as const

/** Berkas cahaya vertikal, sebagai jarak dari pusat figur. */
export const BERKAS_CAHAYA: readonly number[] = [-70, -46, 46, 70] as const

/**
 * Bintik cahaya di dalam figur (kesan "peta titik"). Dibangkitkan dengan
 * pembangkit acak berbenih tetap supaya hasilnya sama di server dan di
 * peramban — kalau tidak, Nuxt akan melaporkan ketidakcocokan hidrasi.
 */
export interface Partikel {
  x: number
  y: number
  r: number
  o: number
}

function bangkitkanPartikel(jumlah: number): Partikel[] {
  let benih = 20260804
  const acak = () => {
    benih = (benih * 1103515245 + 12345) % 2147483648
    return benih / 2147483648
  }

  const hasil: Partikel[] = []
  for (let i = 0; i < jumlah; i += 1) {
    hasil.push({
      x: Number((45 + acak() * 110).toFixed(2)), // rentang lebar figur
      y: Number((14 + acak() * 288).toFixed(2)), // rentang tinggi figur
      r: Number((0.4 + acak() * 0.8).toFixed(2)),
      o: Number((0.25 + acak() * 0.6).toFixed(2)),
    })
  }
  return hasil
}

export const PARTIKEL: readonly Partikel[] = bangkitkanPartikel(150)

export const AREA_SEGMEN: readonly AreaSegmen[] = [
  // ── Tampak depan ────────────────────────────────────────────────────────
  { kode: 'LEHER_ATAS', tampak: 'DEPAN', x: 92, y: 47, w: 16, h: 10, rx: 5 },
  { kode: 'LEHER_BAWAH', tampak: 'DEPAN', x: 89, y: 58, w: 22, h: 10, rx: 5 },

  // Bahu — layar kiri = KANAN responden (tampak depan seperti bercermin)
  { kode: 'BAHU_KANAN', tampak: 'DEPAN', x: 63, y: 66, w: 25, h: 15, rx: 7 },
  { kode: 'BAHU_KIRI', tampak: 'DEPAN', x: 112, y: 66, w: 25, h: 15, rx: 7 },

  { kode: 'LENGAN_ATAS_KANAN', tampak: 'DEPAN', x: 58, y: 83, w: 17, h: 31, rx: 8 },
  { kode: 'LENGAN_ATAS_KIRI', tampak: 'DEPAN', x: 125, y: 83, w: 17, h: 31, rx: 8 },

  { kode: 'SIKU_KANAN', tampak: 'DEPAN', x: 55, y: 116, w: 17, h: 13, rx: 6 },
  { kode: 'SIKU_KIRI', tampak: 'DEPAN', x: 128, y: 116, w: 17, h: 13, rx: 6 },

  { kode: 'LENGAN_BAWAH_KANAN', tampak: 'DEPAN', x: 52, y: 131, w: 16, h: 26, rx: 8 },
  { kode: 'LENGAN_BAWAH_KIRI', tampak: 'DEPAN', x: 132, y: 131, w: 16, h: 26, rx: 8 },

  { kode: 'PERGELANGAN_TANGAN_KANAN', tampak: 'DEPAN', x: 50, y: 159, w: 15, h: 11, rx: 5 },
  { kode: 'PERGELANGAN_TANGAN_KIRI', tampak: 'DEPAN', x: 135, y: 159, w: 15, h: 11, rx: 5 },

  { kode: 'TANGAN_KANAN', tampak: 'DEPAN', x: 46, y: 172, w: 19, h: 19, rx: 8 },
  { kode: 'TANGAN_KIRI', tampak: 'DEPAN', x: 135, y: 172, w: 19, h: 19, rx: 8 },

  { kode: 'PAHA_KANAN', tampak: 'DEPAN', x: 79, y: 164, w: 19, h: 50, rx: 9 },
  { kode: 'PAHA_KIRI', tampak: 'DEPAN', x: 102, y: 164, w: 19, h: 50, rx: 9 },

  { kode: 'LUTUT_KANAN', tampak: 'DEPAN', x: 80, y: 216, w: 18, h: 18, rx: 8 },
  { kode: 'LUTUT_KIRI', tampak: 'DEPAN', x: 102, y: 216, w: 18, h: 18, rx: 8 },

  { kode: 'BETIS_KANAN', tampak: 'DEPAN', x: 80, y: 236, w: 17, h: 36, rx: 8 },
  { kode: 'BETIS_KIRI', tampak: 'DEPAN', x: 103, y: 236, w: 17, h: 36, rx: 8 },

  { kode: 'PERGELANGAN_KAKI_KANAN', tampak: 'DEPAN', x: 82, y: 274, w: 14, h: 12, rx: 5 },
  { kode: 'PERGELANGAN_KAKI_KIRI', tampak: 'DEPAN', x: 104, y: 274, w: 14, h: 12, rx: 5 },

  { kode: 'KAKI_KANAN', tampak: 'DEPAN', x: 78, y: 288, w: 20, h: 14, rx: 6 },
  { kode: 'KAKI_KIRI', tampak: 'DEPAN', x: 102, y: 288, w: 20, h: 14, rx: 6 },

  // ── Tampak belakang ─────────────────────────────────────────────────────
  { kode: 'PUNGGUNG', tampak: 'BELAKANG', x: 279, y: 72, w: 42, h: 46, rx: 14 },
  { kode: 'PINGGANG', tampak: 'BELAKANG', x: 281, y: 120, w: 38, h: 24, rx: 10 },
  { kode: 'BOKONG', tampak: 'BELAKANG', x: 278, y: 146, w: 44, h: 20, rx: 9 },
  { kode: 'PANTAT', tampak: 'BELAKANG', x: 281, y: 168, w: 38, h: 16, rx: 8 },
] as const

/** Label judul tiap tampak, ditampilkan di atas figur. */
export const JUDUL_TAMPAK: Record<Tampak, { label: string; x: number }> = {
  DEPAN: { label: 'Tampak Depan', x: PUSAT_TAMPAK.DEPAN },
  BELAKANG: { label: 'Tampak Belakang', x: PUSAT_TAMPAK.BELAKANG },
}
