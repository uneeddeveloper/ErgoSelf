import { describe, expect, it } from 'vitest'
import {
  evaluasiImt,
  hitungImt,
  kategorikanImt,
  LABEL_KATEGORI_IMT,
} from '../lib/imt'

describe('hitungImt', () => {
  it('menghitung IMT sesuai rumus berat / tinggi(m)²', () => {
    // 60 / 1,65² = 60 / 2,7225 = 22,0386… → 22,04
    expect(hitungImt(60, 165)).toBe(22.04)
    // 70 / 1,70² = 70 / 2,89 = 24,2214… → 24,22
    expect(hitungImt(70, 170)).toBe(24.22)
  })

  it('membulatkan hasil ke 2 angka di belakang koma', () => {
    const imt = hitungImt(58.5, 162.3)
    expect(Number.isFinite(imt)).toBe(true)
    expect(imt.toString()).toMatch(/^\d+(\.\d{1,2})?$/)
  })

  it('menolak tinggi badan di luar batas wajar', () => {
    expect(() => hitungImt(60, 95)).toThrow(RangeError)
    expect(() => hitungImt(60, 260)).toThrow(RangeError)
  })

  it('menolak berat badan di luar batas wajar', () => {
    expect(() => hitungImt(20, 165)).toThrow(RangeError)
    expect(() => hitungImt(300, 165)).toThrow(RangeError)
  })

  it('menolak input bukan angka', () => {
    expect(() => hitungImt(Number.NaN, 165)).toThrow(RangeError)
    expect(() => hitungImt(60, Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('kategorikanImt — ambang batas Kemenkes RI', () => {
  it('mengklasifikasikan kurus tingkat berat (< 17,0)', () => {
    expect(kategorikanImt(15)).toBe('KURUS_BERAT')
    expect(kategorikanImt(16.99)).toBe('KURUS_BERAT')
  })

  it('mengklasifikasikan kurus tingkat ringan (17,0 – < 18,5)', () => {
    expect(kategorikanImt(17.0)).toBe('KURUS_RINGAN')
    expect(kategorikanImt(18.49)).toBe('KURUS_RINGAN')
  })

  it('mengklasifikasikan normal (18,5 – 25,0)', () => {
    expect(kategorikanImt(18.5)).toBe('NORMAL')
    expect(kategorikanImt(22.04)).toBe('NORMAL')
    // Batas atas inklusif: tepat 25,00 masih NORMAL
    expect(kategorikanImt(25.0)).toBe('NORMAL')
  })

  it('mengklasifikasikan gemuk tingkat ringan (> 25,0 – 27,0)', () => {
    expect(kategorikanImt(25.01)).toBe('GEMUK_RINGAN')
    // Batas atas inklusif: tepat 27,00 masih GEMUK_RINGAN
    expect(kategorikanImt(27.0)).toBe('GEMUK_RINGAN')
  })

  it('mengklasifikasikan obesitas (> 27,0)', () => {
    expect(kategorikanImt(27.01)).toBe('OBESITAS')
    expect(kategorikanImt(35)).toBe('OBESITAS')
  })
})

describe('evaluasiImt', () => {
  it('mengembalikan nilai, kategori, dan label sekaligus', () => {
    const hasil = evaluasiImt(60, 165)
    expect(hasil).toEqual({
      imt: 22.04,
      kategori: 'NORMAL',
      label: LABEL_KATEGORI_IMT.NORMAL,
      labelSingkat: 'Normal',
    })
  })

  it('mengklasifikasikan berdasarkan IMT yang SUDAH dibulatkan', () => {
    // 72,2616 / 1,70² = 25,00401… → dibulatkan 25,00 → tetap NORMAL.
    // Perilaku ini disengaja agar angka yang dilihat responden selalu
    // konsisten dengan kategori yang ditampilkan.
    const hasil = evaluasiImt(72.2616, 170)
    expect(hasil.imt).toBe(25)
    expect(hasil.kategori).toBe('NORMAL')
  })

  it('menandai obesitas pada kombinasi berat–tinggi yang tinggi', () => {
    const hasil = evaluasiImt(85, 165)
    expect(hasil.imt).toBe(31.22)
    expect(hasil.kategori).toBe('OBESITAS')
  })

  it('menandai kurus berat pada kombinasi berat–tinggi yang rendah', () => {
    const hasil = evaluasiImt(40, 170)
    expect(hasil.imt).toBe(13.84)
    expect(hasil.kategori).toBe('KURUS_BERAT')
  })
})
