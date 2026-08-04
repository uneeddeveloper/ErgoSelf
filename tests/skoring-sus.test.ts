import { describe, expect, it } from 'vitest'
import { ITEM_SUS, JUMLAH_ITEM_SUS } from '../lib/sus/item'
import {
  GalatJawabanSus,
  TARGET_SUS,
  adjektifSus,
  gradeSus,
  hitungKontribusiItem,
  hitungSkorSus,
  interpretasiSus,
  type JawabanSusInput,
} from '../lib/sus/skoring'

/** Membuat 10 jawaban dengan nilai seragam. */
function jawabanSeragam(nilai: number): JawabanSusInput[] {
  return ITEM_SUS.map((i) => ({ itemNomor: i.nomor, skorJawaban: nilai }))
}

/** Membuat jawaban dari array 10 nilai, urut item 1–10. */
function dariArray(nilai: number[]): JawabanSusInput[] {
  return nilai.map((n, i) => ({ itemNomor: i + 1, skorJawaban: n }))
}

describe('katalog item SUS', () => {
  it('berisi tepat 10 pernyataan', () => {
    expect(JUMLAH_ITEM_SUS).toBe(10)
  })

  it('item ganjil positif dan item genap negatif', () => {
    for (const item of ITEM_SUS) {
      const diharapkan = item.nomor % 2 === 1 ? 'POSITIF' : 'NEGATIF'
      expect(item.nada, `item ${item.nomor}`).toBe(diharapkan)
    }
  })

  it('nomor item berurutan 1–10 tanpa duplikat', () => {
    expect(ITEM_SUS.map((i) => i.nomor)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })
})

describe('hitungKontribusiItem', () => {
  it('item ganjil memakai rumus (skor − 1)', () => {
    expect(hitungKontribusiItem(1, 1)).toBe(0)
    expect(hitungKontribusiItem(1, 3)).toBe(2)
    expect(hitungKontribusiItem(1, 5)).toBe(4)
    expect(hitungKontribusiItem(9, 4)).toBe(3)
  })

  it('item genap memakai rumus (5 − skor)', () => {
    expect(hitungKontribusiItem(2, 1)).toBe(4)
    expect(hitungKontribusiItem(2, 3)).toBe(2)
    expect(hitungKontribusiItem(2, 5)).toBe(0)
    expect(hitungKontribusiItem(10, 2)).toBe(3)
  })

  it('kontribusi selalu berada di rentang 0–4', () => {
    for (const item of ITEM_SUS) {
      for (let skor = 1; skor <= 5; skor++) {
        const k = hitungKontribusiItem(item.nomor, skor)
        expect(k).toBeGreaterThanOrEqual(0)
        expect(k).toBeLessThanOrEqual(4)
      }
    }
  })

  it('menolak jawaban di luar rentang 1–5', () => {
    expect(() => hitungKontribusiItem(1, 0)).toThrow(GalatJawabanSus)
    expect(() => hitungKontribusiItem(1, 6)).toThrow(GalatJawabanSus)
    expect(() => hitungKontribusiItem(1, 3.5)).toThrow(GalatJawabanSus)
  })

  it('menolak nomor item yang tidak dikenal', () => {
    expect(() => hitungKontribusiItem(0, 3)).toThrow(GalatJawabanSus)
    expect(() => hitungKontribusiItem(11, 3)).toThrow(GalatJawabanSus)
  })
})

describe('hitungSkorSus — nilai batas', () => {
  it('jawaban terburuk menghasilkan skor 0', () => {
    // Semua item dijawab 1: ganjil → 0, genap → 4. Tapi jawaban "terburuk"
    // sesungguhnya adalah 1 untuk positif dan 5 untuk negatif.
    const terburuk = dariArray([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])
    const hasil = hitungSkorSus(terburuk)

    expect(hasil.jumlahKontribusi).toBe(0)
    expect(hasil.skorTotal).toBe(0)
    expect(hasil.interpretasi).toBe('NOT_ACCEPTABLE')
    expect(hasil.gradeHuruf).toBe('F')
    expect(hasil.memenuhiTarget).toBe(false)
  })

  it('jawaban terbaik menghasilkan skor 100', () => {
    const terbaik = dariArray([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])
    const hasil = hitungSkorSus(terbaik)

    expect(hasil.jumlahKontribusi).toBe(40)
    expect(hasil.skorTotal).toBe(100)
    expect(hasil.interpretasi).toBe('ACCEPTABLE')
    expect(hasil.gradeHuruf).toBe('A')
    expect(hasil.memenuhiTarget).toBe(true)
    expect(hasil.selisihTarget).toBe(32)
  })

  it('semua dijawab netral (3) menghasilkan skor 50', () => {
    const hasil = hitungSkorSus(jawabanSeragam(3))
    expect(hasil.jumlahKontribusi).toBe(20)
    expect(hasil.skorTotal).toBe(50)
    expect(hasil.interpretasi).toBe('MARGINAL')
  })

  it('semua dijawab 5 menghasilkan skor 50 (positif & negatif saling meniadakan)', () => {
    // 5 item ganjil × 4 + 5 item genap × 0 = 20 → 50
    const hasil = hitungSkorSus(jawabanSeragam(5))
    expect(hasil.skorTotal).toBe(50)
  })

  it('skor selalu kelipatan 2,5 di rentang 0–100', () => {
    for (let n = 1; n <= 5; n++) {
      const hasil = hitungSkorSus(jawabanSeragam(n))
      expect(hasil.skorTotal % 2.5).toBe(0)
      expect(hasil.skorTotal).toBeGreaterThanOrEqual(0)
      expect(hasil.skorTotal).toBeLessThanOrEqual(100)
    }
  })
})

describe('hitungSkorSus — contoh perhitungan manual', () => {
  it('cocok dengan hitungan tangan', () => {
    // Jawaban : 4 2 5 1 4 2 5 2 4 3
    // Ganjil (1,3,5,7,9) = 4,5,4,5,4 → −1 → 3+4+3+4+3 = 17
    // Genap  (2,4,6,8,10)= 2,1,2,2,3 → 5− → 3+4+3+3+2 = 15
    // Total kontribusi = 32 → 32 × 2,5 = 80
    const hasil = hitungSkorSus(dariArray([4, 2, 5, 1, 4, 2, 5, 2, 4, 3]))

    expect(hasil.jumlahKontribusi).toBe(32)
    expect(hasil.skorTotal).toBe(80)
    expect(hasil.interpretasi).toBe('ACCEPTABLE')
    expect(hasil.gradeHuruf).toBe('B')
    expect(hasil.memenuhiTarget).toBe(true)
    expect(hasil.selisihTarget).toBe(12)
  })

  it('mencatat kontribusi tiap item secara rinci', () => {
    const hasil = hitungSkorSus(dariArray([4, 2, 5, 1, 4, 2, 5, 2, 4, 3]))

    expect(hasil.perItem).toHaveLength(10)
    expect(hasil.perItem[0]).toMatchObject({
      nomor: 1,
      nada: 'POSITIF',
      skorJawaban: 4,
      kontribusi: 3,
    })
    expect(hasil.perItem[1]).toMatchObject({
      nomor: 2,
      nada: 'NEGATIF',
      skorJawaban: 2,
      kontribusi: 3,
    })
  })
})

describe('interpretasiSus — ambang Bangor et al. (2009)', () => {
  it('< 50 tidak dapat diterima', () => {
    expect(interpretasiSus(0)).toBe('NOT_ACCEPTABLE')
    expect(interpretasiSus(49.9)).toBe('NOT_ACCEPTABLE')
  })

  it('50–70 marginal', () => {
    expect(interpretasiSus(50)).toBe('MARGINAL')
    expect(interpretasiSus(70)).toBe('MARGINAL')
  })

  it('> 70 dapat diterima', () => {
    expect(interpretasiSus(70.1)).toBe('ACCEPTABLE')
    expect(interpretasiSus(100)).toBe('ACCEPTABLE')
  })
})

describe('gradeSus & adjektifSus', () => {
  it('memetakan skor ke grade huruf', () => {
    expect(gradeSus(85)).toBe('A')
    expect(gradeSus(80.3)).toBe('A')
    expect(gradeSus(80)).toBe('B')
    expect(gradeSus(74)).toBe('B')
    expect(gradeSus(70)).toBe('C')
    expect(gradeSus(68)).toBe('C')
    expect(gradeSus(60)).toBe('D')
    expect(gradeSus(51)).toBe('D')
    expect(gradeSus(50)).toBe('F')
  })

  it('memetakan skor ke adjective rating', () => {
    expect(adjektifSus(90)).toMatch(/Terbaik/)
    expect(adjektifSus(75)).toMatch(/Sangat Baik/)
    expect(adjektifSus(60)).toMatch(/Baik/)
    expect(adjektifSus(45)).toMatch(/Cukup/)
    expect(adjektifSus(30)).toMatch(/Buruk/)
    expect(adjektifSus(10)).toMatch(/Terburuk/)
  })
})

describe('hitungSkorSus — validasi', () => {
  it('target penelitian adalah 68', () => {
    expect(TARGET_SUS).toBe(68)
    expect(hitungSkorSus(dariArray([4, 2, 4, 2, 4, 2, 4, 2, 4, 3])).skorTotal)
      .toBeGreaterThanOrEqual(TARGET_SUS)
  })

  it('menolak bila ada item yang belum dijawab', () => {
    const kurang = jawabanSeragam(3).slice(0, 9)
    expect(() => hitungSkorSus(kurang)).toThrow(GalatJawabanSus)
    expect(() => hitungSkorSus(kurang)).toThrow(/belum dijawab/i)
  })

  it('menolak item ganda', () => {
    const ganda = [...jawabanSeragam(3), { itemNomor: 1, skorJawaban: 5 }]
    expect(() => hitungSkorSus(ganda)).toThrow(/lebih dari sekali/i)
  })

  it('menolak nomor item di luar 1–10', () => {
    const salah = [
      ...jawabanSeragam(3).slice(1),
      { itemNomor: 11, skorJawaban: 3 },
    ]
    expect(() => hitungSkorSus(salah)).toThrow(/tidak dikenali/i)
  })

  it('menolak nilai jawaban di luar 1–5', () => {
    const salah = dariArray([3, 3, 3, 3, 9, 3, 3, 3, 3, 3])
    expect(() => hitungSkorSus(salah)).toThrow(GalatJawabanSus)
  })
})

describe('jendela 67,5–72,5 — target penelitian vs band akseptabilitas', () => {
  /**
   * `memenuhiTarget` (≥ 68, rata-rata industri) dan `interpretasi`
   * (akseptabilitas Bangor dkk.) adalah dua kerangka berbeda yang sengaja
   * dipakai bersama, dan keduanya BISA tidak sepakat. Skor 70 memenuhi target
   * penelitian namun masih berkategori MARGINAL — keduanya tampil di layar
   * yang sama.
   *
   * Ini bukan cacat, melainkan hal yang harus dijelaskan satu kalimat di Bab
   * IV. Uji ini memakukannya supaya tidak ada yang "memperbaiki" salah satu
   * ambang agar terlihat konsisten.
   */
  it('skor 67,5 — belum memenuhi target, kategori MARGINAL', () => {
    const hasil = hitungSkorSus(dariArray([5, 3, 5, 3, 5, 4, 5, 4, 5, 4]))
    expect(hasil.skorTotal).toBe(67.5)
    expect(hasil.interpretasi).toBe('MARGINAL')
    expect(hasil.memenuhiTarget).toBe(false)
  })

  it('skor 70 — SUDAH memenuhi target, tetapi masih MARGINAL', () => {
    const hasil = hitungSkorSus(dariArray([5, 3, 5, 3, 5, 3, 5, 4, 5, 4]))
    expect(hasil.skorTotal).toBe(70)
    expect(hasil.interpretasi).toBe('MARGINAL')
    expect(hasil.memenuhiTarget).toBe(true)
  })

  it('skor 72,5 — memenuhi target dan sudah ACCEPTABLE', () => {
    const hasil = hitungSkorSus(dariArray([5, 3, 5, 3, 5, 3, 5, 3, 5, 4]))
    expect(hasil.skorTotal).toBe(72.5)
    expect(hasil.interpretasi).toBe('ACCEPTABLE')
    expect(hasil.memenuhiTarget).toBe(true)
  })

  it('tidak ada skor yang mungkin di antara 70 dan 72,5', () => {
    // Skor SUS selalu kelipatan 2,5, jadi konvensi `>70` vs `>=70` hanya
    // berpengaruh tepat di 70,0 — nilai yang memang dapat dicapai.
    expect(TARGET_SUS).toBe(68)
    expect(interpretasiSus(70)).toBe('MARGINAL')
    expect(interpretasiSus(72.5)).toBe('ACCEPTABLE')
  })
})
