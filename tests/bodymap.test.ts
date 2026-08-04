import { describe, expect, it } from 'vitest'
import { SEGMEN_TUBUH } from '../lib/cmdq/segmen'
import {
  AREA_SEGMEN,
  AREA_SENTUH,
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

  it('area sentuh tidak ada yang saling menindih', () => {
    // Regresi terhadap bug nyata: dengan bantalan tetap ±5 unit, bantalan
    // PANTAT (y163–189) menutupi rect BOKONG yang terlihat (y146–166). Karena
    // PANTAT dirender belakangan dan rect ber-`fill="transparent"` tetap
    // menangkap pointer, ketukan pada BOKONG tercatat sebagai PANTAT —
    // salah-penetapan sistematis searah pada empat segmen berprevalensi
    // tertinggi untuk kerja duduk.
    for (const a of AREA_SENTUH) {
      for (const b of AREA_SENTUH) {
        if (a.kode === b.kode) continue
        const beririsan =
          a.sentuh.x < b.sentuh.x + b.sentuh.w &&
          a.sentuh.x + a.sentuh.w > b.sentuh.x &&
          a.sentuh.y < b.sentuh.y + b.sentuh.h &&
          a.sentuh.y + a.sentuh.h > b.sentuh.y
        expect(beririsan, `${a.kode} menindih ${b.kode}`).toBe(false)
      }
    }
  })

  it('area sentuh selalu mencakup seluruh rect yang terlihat', () => {
    // Bantalan hanya boleh memperbesar, tidak pernah memotong area tampak —
    // kalau tidak, ada bagian yang terlihat tapi tidak bisa diketuk.
    for (const a of AREA_SENTUH) {
      expect(a.sentuh.x, `${a.kode} kiri`).toBeLessThanOrEqual(a.x)
      expect(a.sentuh.y, `${a.kode} atas`).toBeLessThanOrEqual(a.y)
      expect(
        a.sentuh.x + a.sentuh.w,
        `${a.kode} kanan`,
      ).toBeGreaterThanOrEqual(a.x + a.w)
      expect(
        a.sentuh.y + a.sentuh.h,
        `${a.kode} bawah`,
      ).toBeGreaterThanOrEqual(a.y + a.h)
    }
  })

  it('empat segmen punggung punya jarak vertikal yang cukup untuk dibedakan', () => {
    const urut = ['PUNGGUNG', 'PINGGANG', 'BOKONG', 'PANTAT'].map(
      (kode) => AREA_SEGMEN.find((a) => a.kode === kode)!,
    )
    for (let i = 0; i < urut.length - 1; i += 1) {
      const jarak = urut[i + 1]!.y - (urut[i]!.y + urut[i]!.h)
      expect(jarak, `jarak ${urut[i]!.kode} → ${urut[i + 1]!.kode}`).toBeGreaterThanOrEqual(4)
    }
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
