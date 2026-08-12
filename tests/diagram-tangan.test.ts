import { describe, expect, it } from 'vitest'
import { AREA_DASAR } from '../lib/chdq/area'
import {
  JALUR_AREA,
  JALUR_DETAIL,
  JALUR_LUAR,
  LEBAR_DIAGRAM,
  SENTUH_AREA,
  TINGGI_DIAGRAM,
  TITIK_HURUF,
  URUTAN_JARI,
} from '../lib/chdq/diagram'

/**
 * Diagram tangan pernah menjadi bagian tersulit diisi di seluruh aplikasi.
 * Penyebabnya terukur: bentuk ARSIRAN sekaligus dipakai sebagai target sentuh,
 * sehingga irisan separuh jari manis — ≈15px pada render 260px — harus dikenai
 * tepat, padahal dua irisan itu (area A dan B) bersebelahan langsung.
 *
 * Sejak itu gambarnya diganti dengan artwork asli `rhandq.pdf`, dan di sana
 * arsiran A dan B bahkan saling BERTUMPANG TINDIH di jari manis — memang
 * begitulah instrumennya. Karena itu pemisahan "yang digambar" dari "yang
 * disentuh" bukan lagi sekadar perbaikan ergonomi, melainkan syarat supaya
 * ketukan punya jawaban yang tentu.
 */

/**
 * Lebar render TERKECIL yang benar-benar terjadi, bukan lebar maksimumnya.
 * Ditelusuri dari lebar panel dikurangi seluruh padding:
 *
 *   360px (ponsel) → panel 328 − kartu 24 = 304px, diagram bertumpuk
 *   768px (`md`)   → panel 680 ÷ 2 kolom − 24 = 310px
 *
 * Titik tersempit ±300px. Menaruh diagram di dalam kolom selebar setengah
 * panel akan menurunkannya jauh di bawah itu, dan uji ini gagal — sebagaimana
 * mestinya.
 */
const LEBAR_RENDER_PX = 300
const PX_PER_UNIT = LEBAR_RENDER_PX / LEBAR_DIAGRAM

/** Batas nyaman target sentuh (WCAG 2.5.5 / panduan platform). */
const MIN_SENTUH_PX = 44

interface Kotak {
  x: number
  y: number
  w: number
  h: number
}

function beririsan(a: Kotak, b: Kotak): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  )
}

function memuat(k: Kotak, x: number, y: number): boolean {
  return x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h
}

/** Membaca seluruh titik jangkar dari sebuah jalur SVG (M/L/C/Z). */
function titikJalur(d: string): [number, number][] {
  const tok = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? []
  const titik: [number, number][] = []
  for (let i = 0; i < tok.length; i += 1) {
    const t = tok[i]!
    if (t === 'M' || t === 'L') {
      titik.push([parseFloat(tok[i + 1]!), parseFloat(tok[i + 2]!)])
      i += 2
    } else if (t === 'C') {
      // Hanya titik akhir kurva; dua titik kendali boleh berada di luar bentuk.
      titik.push([parseFloat(tok[i + 5]!), parseFloat(tok[i + 6]!)])
      i += 6
    }
  }
  return titik
}

describe('artwork dari form asli', () => {
  it('memuat jalur tangan yang utuh', () => {
    // Angka kasar, hanya untuk menangkap ekstraksi yang gagal separuh jalan.
    expect(titikJalur(JALUR_LUAR).length).toBeGreaterThan(80)
    expect(titikJalur(JALUR_DETAIL).length).toBeGreaterThan(60)
    for (const a of AREA_DASAR) {
      expect(
        titikJalur(JALUR_AREA[a.huruf]).length,
        `arsiran ${a.huruf}`,
      ).toBeGreaterThan(5)
    }
  })

  it('seluruh gambar berada di dalam kanvas', () => {
    const semua = [
      JALUR_LUAR,
      JALUR_DETAIL,
      ...AREA_DASAR.map((a) => JALUR_AREA[a.huruf]),
    ]
    for (const d of semua) {
      for (const [x, y] of titikJalur(d)) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(LEBAR_DIAGRAM)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(TINGGI_DIAGRAM)
      }
    }
  })

  it('arsiran A dan B memang bertumpang tindih di jari manis', () => {
    /**
     * Bukan cacat ekstraksi melainkan isi instrumennya: area A mencakup
     * telunjuk, jari tengah, dan SEPARUH jari manis (persarafan medianus);
     * area B mencakup kelingking dan separuh jari manis yang lain (ulnaris).
     *
     * Uji ini ada untuk menjelaskan hal itu kepada pembaca berikutnya — dan
     * supaya "perbaikan" yang memisahkan keduanya tidak lolos tanpa disadari.
     */
    const kotak = (d: string) => {
      const t = titikJalur(d)
      return {
        x0: Math.min(...t.map((p) => p[0])),
        x1: Math.max(...t.map((p) => p[0])),
      }
    }
    const a = kotak(JALUR_AREA.A)
    const b = kotak(JALUR_AREA.B)
    const irisan = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
    expect(irisan, 'lebar tumpang tindih A∩B').toBeGreaterThan(3)
  })

  it('menyebut kelima jari untuk keterangan orientasi', () => {
    expect(URUTAN_JARI).toHaveLength(5)
    expect(URUTAN_JARI[0]).toBe('Kelingking')
    expect(URUTAN_JARI.at(-1)).toBe('Ibu jari')
  })
})

describe('area sentuh', () => {
  it('setiap area punya arsiran, area sentuh, dan jangkar huruf', () => {
    for (const a of AREA_DASAR) {
      expect(JALUR_AREA[a.huruf], `arsiran ${a.huruf}`).toBeTruthy()
      expect(
        SENTUH_AREA.find((s) => s.huruf === a.huruf),
        `area sentuh ${a.huruf}`,
      ).toBeDefined()
      expect(TITIK_HURUF[a.huruf], `jangkar huruf ${a.huruf}`).toBeDefined()
    }
    expect(SENTUH_AREA).toHaveLength(6)
  })

  it('setiap kotak sentuh layak dikenai jari', () => {
    for (const a of SENTUH_AREA) {
      for (const b of a.bentuk) {
        const sisiPendek = Math.min(b.w, b.h) * PX_PER_UNIT
        expect(
          sisiPendek,
          `area ${a.huruf}: sisi terpendek ${sisiPendek.toFixed(0)}px`,
        ).toBeGreaterThanOrEqual(MIN_SENTUH_PX)
      }
    }
  })

  it('tidak ada dua area yang saling menindih', () => {
    for (const a of SENTUH_AREA) {
      for (const b of SENTUH_AREA) {
        if (a.huruf === b.huruf) continue
        for (const ka of a.bentuk) {
          for (const kb of b.bentuk) {
            expect(
              beririsan(ka, kb),
              `area ${a.huruf} menindih ${b.huruf}`,
            ).toBe(false)
          }
        }
      }
    }
  })

  it('setiap titik gambar tangan menjadi milik salah satu area', () => {
    /**
     * Lubang tak bertuan adalah kegagalan yang paling membingungkan: ketukan
     * mendarat di gambar tangan, tidak terjadi apa-apa, dan responden
     * menyimpulkan aplikasinya rusak — bukan bahwa ia meleset.
     *
     * Diuji terhadap titik artwork Cornell yang sesungguhnya, bukan terhadap
     * kotak perkiraan.
     */
    const semua = SENTUH_AREA.flatMap((a) =>
      a.bentuk.map((b) => ({ huruf: a.huruf, ...b })),
    )

    const tanpaPemilik: string[] = []
    const diperiksa = [
      JALUR_LUAR,
      ...AREA_DASAR.map((a) => JALUR_AREA[a.huruf]),
    ]

    for (const d of diperiksa) {
      for (const [x, y] of titikJalur(d)) {
        if (!semua.some((k) => memuat(k, x, y))) {
          tanpaPemilik.push(`(${x.toFixed(1)}, ${y.toFixed(1)})`)
        }
      }
    }

    expect(
      tanpaPemilik.slice(0, 8),
      `titik gambar yang tidak dimiliki area mana pun (${tanpaPemilik.length} titik)`,
    ).toEqual([])
  })

  it('jangkar huruf berada di dalam area sentuhnya sendiri', () => {
    // Huruf adalah sasaran bidik visual. Bila ia jatuh di luar area sentuhnya,
    // responden membidik huruf C lalu memilih area E.
    for (const a of SENTUH_AREA) {
      const titik = TITIK_HURUF[a.huruf]
      const didalam = a.bentuk.some((b) => memuat(b, titik.x, titik.y))
      expect(didalam, `huruf ${a.huruf} di luar area sentuhnya`).toBe(true)
    }
  })

  it('area sentuh tetap di dalam kanvas', () => {
    for (const a of SENTUH_AREA) {
      for (const b of a.bentuk) {
        expect(b.x, `area ${a.huruf}`).toBeGreaterThanOrEqual(0)
        expect(b.y, `area ${a.huruf}`).toBeGreaterThanOrEqual(0)
        expect(b.x + b.w, `area ${a.huruf}`).toBeLessThanOrEqual(LEBAR_DIAGRAM)
        expect(b.y + b.h, `area ${a.huruf}`).toBeLessThanOrEqual(TINGGI_DIAGRAM)
      }
    }
  })
})
