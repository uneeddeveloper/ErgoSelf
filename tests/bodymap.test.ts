import { describe, expect, it } from 'vitest'
import { SEGMEN_TUBUH } from '../lib/cmdq/segmen'
import {
  AREA_SEGMEN,
  LEBAR_KANVAS,
  TINGGI_KANVAS,
} from '../lib/cmdq/bodymap'

/**
 * Peta tubuh dan katalog segmen berada di dua file terpisah, sehingga mudah
 * jadi tidak sinkron saat salah satunya diubah. Pengujian di bawah menjaga
 * agar setiap segmen selalu punya area sentuh — dan sebaliknya.
 */

describe('konsistensi body map dengan katalog segmen', () => {
  it('setiap segmen NBM punya tepat satu area sentuh', () => {
    for (const segmen of SEGMEN_TUBUH) {
      const area = AREA_SEGMEN.filter((a) => a.kode === segmen.kode)
      expect(area, `segmen ${segmen.kode}`).toHaveLength(1)
    }
  })

  it('tidak ada area sentuh untuk segmen yang tidak dikenal', () => {
    const kodeSah = new Set(SEGMEN_TUBUH.map((s) => s.kode))
    for (const area of AREA_SEGMEN) {
      expect(kodeSah.has(area.kode), `area ${area.kode}`).toBe(true)
    }
  })

  it('jumlah area sama dengan jumlah segmen', () => {
    expect(AREA_SEGMEN).toHaveLength(SEGMEN_TUBUH.length)
  })

  it('semua area berada di dalam kanvas', () => {
    for (const a of AREA_SEGMEN) {
      expect(a.x, `${a.kode}.x`).toBeGreaterThanOrEqual(0)
      expect(a.y, `${a.kode}.y`).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w, `${a.kode} sisi kanan`).toBeLessThanOrEqual(LEBAR_KANVAS)
      expect(a.y + a.h, `${a.kode} sisi bawah`).toBeLessThanOrEqual(TINGGI_KANVAS)
    }
  })

  it('semua area cukup besar untuk disentuh jari', () => {
    // Kanvas 400 unit ditampilkan pada lebar layar ± 320px, jadi 1 unit ≈ 0,8px.
    // Sisi terpendek 10 unit ≈ 8px — cukup sebagai target visual karena area
    // sentuh diperbesar lewat `stroke-width` transparan di komponen.
    for (const a of AREA_SEGMEN) {
      expect(Math.min(a.w, a.h), `${a.kode} terlalu kecil`).toBeGreaterThanOrEqual(10)
    }
  })

  it('segmen punggung & pinggang berada di tampak belakang', () => {
    const belakang = AREA_SEGMEN.filter((a) => a.tampak === 'BELAKANG').map(
      (a) => a.kode,
    )
    expect(belakang.sort()).toEqual(
      ['BOKONG', 'PANTAT', 'PINGGANG', 'PUNGGUNG'].sort(),
    )
  })

  it('segmen bersisi kiri berada di kanan layar pada tampak depan (efek cermin)', () => {
    const depan = AREA_SEGMEN.filter((a) => a.tampak === 'DEPAN')
    const pusat = 100

    for (const area of depan) {
      const segmen = SEGMEN_TUBUH.find((s) => s.kode === area.kode)!
      const tengahArea = area.x + area.w / 2

      if (segmen.sisi === 'KIRI') {
        expect(tengahArea, `${area.kode} harus di kanan layar`).toBeGreaterThan(pusat)
      } else if (segmen.sisi === 'KANAN') {
        expect(tengahArea, `${area.kode} harus di kiri layar`).toBeLessThan(pusat)
      }
    }
  })
})
