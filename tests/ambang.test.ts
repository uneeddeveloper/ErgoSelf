import { describe, expect, it } from 'vitest'
import { hitungAmbangTersil, persentil } from '../lib/cmdq/ambang'
import {
  AMBANG_MIN_RESPONDEN,
  AMBANG_TOTAL_SEDANG_SEMENTARA,
  AMBANG_TOTAL_TINGGI_SEMENTARA,
} from '../lib/cmdq/skala'

/** Deret 1..n, urutan diacak agar fungsinya terbukti mengurutkan sendiri. */
function deret(n: number): number[] {
  const nilai = Array.from({ length: n }, (_, i) => i + 1)
  return nilai.slice(n / 2).concat(nilai.slice(0, n / 2))
}

describe('persentil', () => {
  it('cocok dengan PERCENTILE.INC pada contoh yang bisa dihitung tangan', () => {
    // Untuk 1..5: rank = (5−1) × p. p=0,5 → rank 2 → nilai ke-3 = 3.
    const lima = [1, 2, 3, 4, 5]
    expect(persentil(lima, 0)).toBe(1)
    expect(persentil(lima, 50)).toBe(3)
    expect(persentil(lima, 100)).toBe(5)
    // p=0,25 → rank 1 → nilai ke-2 = 2
    expect(persentil(lima, 25)).toBe(2)
  })

  it('menginterpolasi linier di antara dua nilai', () => {
    // Untuk 1..4: rank = 3 × 0,5 = 1,5 → 2 + 0,5 × (3 − 2) = 2,5
    expect(persentil([1, 2, 3, 4], 50)).toBe(2.5)
    // rank = 3 × 0,333 = 0,999 → 1 + 0,999 × (2 − 1) = 1,999
    expect(persentil([1, 2, 3, 4], 33.3)).toBeCloseTo(1.999, 3)
  })

  it('tidak bergantung pada urutan masukan', () => {
    expect(persentil([5, 1, 4, 2, 3], 50)).toBe(3)
  })

  it('mengembalikan satu-satunya nilai bila datanya tunggal', () => {
    expect(persentil([42], 33.3)).toBe(42)
    expect(persentil([42], 100)).toBe(42)
  })

  it('menolak daftar kosong dan persentil di luar 0–100', () => {
    expect(() => persentil([], 50)).toThrow(/kosong/i)
    expect(() => persentil([1, 2], -1)).toThrow(/0–100/)
    expect(() => persentil([1, 2], 101)).toThrow(/0–100/)
  })
})

describe('hitungAmbangTersil', () => {
  it('memakai nilai sementara bila responden belum mencukupi', () => {
    const hasil = hitungAmbangTersil(deret(AMBANG_MIN_RESPONDEN - 1))

    expect(hasil.dariData).toBe(false)
    expect(hasil.ambangSedang).toBe(AMBANG_TOTAL_SEDANG_SEMENTARA)
    expect(hasil.ambangTinggi).toBe(AMBANG_TOTAL_TINGGI_SEMENTARA)
    expect(hasil.peringatan).toHaveLength(1)
    expect(hasil.peringatan[0]).toMatch(/minimal/i)
  })

  it('membagi data menjadi tiga kelompok yang kira-kira sama besar', () => {
    // 90 nilai 1..90: tersil jatuh di sekitar 30 dan 60.
    const hasil = hitungAmbangTersil(deret(90))

    expect(hasil.dariData).toBe(true)
    expect(hasil.jumlahResponden).toBe(90)
    expect(hasil.ambangSedang).toBeCloseTo(30.6, 1)
    expect(hasil.ambangTinggi).toBeCloseTo(60.4, 1)
    expect(hasil.peringatan).toEqual([])

    // Sepertiga responden di tiap kategori, ±beberapa orang.
    const rendah = deret(90).filter((v) => v <= hasil.ambangSedang).length
    const tinggi = deret(90).filter((v) => v > hasil.ambangTinggi).length
    expect(rendah).toBeGreaterThanOrEqual(28)
    expect(rendah).toBeLessThanOrEqual(32)
    expect(tinggi).toBeGreaterThanOrEqual(28)
    expect(tinggi).toBeLessThanOrEqual(32)
  })

  it('memperingatkan bila kategori SEDANG akan kosong', () => {
    /**
     * Sebaran yang sangat terpusat — lazim pada populasi sehat, karena skor
     * perkalian menceng tajam ke kiri. Bila kedua persentil bernilai sama,
     * kategori SEDANG menjadi himpunan kosong dan satu kolom tabulasi silang
     * hilang tanpa penjelasan. Ini harus disuarakan, bukan dibiarkan lewat.
     */
    const banyakNol = [
      ...Array<number>(40).fill(0),
      ...Array<number>(5).fill(500),
    ]
    const hasil = hitungAmbangTersil(banyakNol)

    expect(hasil.ambangSedang).toBe(0)
    expect(hasil.ambangTinggi).toBe(0)
    expect(hasil.peringatan.join(' ')).toMatch(/SEDANG tidak akan terisi/i)
  })

  it('memperingatkan bila persentil bawah bernilai nol', () => {
    // Sepertiga tanpa keluhan, tetapi sebaran atasnya masih terbagi.
    const data = [
      ...Array<number>(15).fill(0),
      ...Array.from({ length: 25 }, (_, i) => (i + 1) * 10),
    ]
    const hasil = hitungAmbangTersil(data)

    expect(hasil.ambangSedang).toBe(0)
    expect(hasil.ambangTinggi).toBeGreaterThan(0)
    expect(hasil.peringatan.join(' ')).toMatch(/tidak melaporkan keluhan/i)
  })

  it('menghormati batas minimum yang dilewatkan pemanggil', () => {
    const hasil = hitungAmbangTersil([1, 2, 3, 4, 5], 3)
    expect(hasil.dariData).toBe(true)
    expect(hasil.jumlahResponden).toBe(5)
  })
})
