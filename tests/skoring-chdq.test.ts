import { describe, expect, it } from 'vitest'
import {
  AREA_DASAR,
  AREA_TANGAN,
  JUMLAH_AREA_TANGAN,
  cariAreaTangan,
} from '../lib/chdq/area'
import {
  AMBANG_AREA_SEDANG,
  AMBANG_AREA_TINGGI,
  BOBOT_FREKUENSI,
  SKALA_FREKUENSI,
  SKOR_AREA_MAKS,
  SKOR_CHDQ_MAKS,
  SKOR_TANGAN_MAKS,
} from '../lib/chdq/skala'
import {
  GalatJawabanChdq,
  hitungSkorArea,
  hitungSkorChdq,
  kategorikanSkorArea,
  type JawabanAreaInput,
} from '../lib/chdq/skoring'

function jawabanKosong(): JawabanAreaInput[] {
  return AREA_TANGAN.map((a) => ({
    kodeArea: a.kode,
    frekuensiKode: 0,
    ketidaknyamananSkor: null,
    gangguanSkor: null,
  }))
}

function dengan(
  dasar: JawabanAreaInput[],
  kode: string,
  isi: Partial<JawabanAreaInput>,
): JawabanAreaInput[] {
  return dasar.map((j) => (j.kodeArea === kode ? { ...j, ...isi } : j))
}

describe('katalog area CHDQ', () => {
  it('memuat 6 area × 2 tangan', () => {
    expect(JUMLAH_AREA_TANGAN).toBe(12)
    expect(AREA_DASAR.map((a) => a.huruf)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
  })

  it('tangan kanan lebih dulu, sesuai urutan penerbitan Cornell', () => {
    expect(AREA_TANGAN.slice(0, 6).every((a) => a.tangan === 'KANAN')).toBe(true)
    expect(AREA_TANGAN.slice(6).every((a) => a.tangan === 'KIRI')).toBe(true)
  })

  it('kode dan urutan tidak ada yang duplikat', () => {
    expect(new Set(AREA_TANGAN.map((a) => a.kode)).size).toBe(12)
    expect(new Set(AREA_TANGAN.map((a) => a.urutan)).size).toBe(12)
  })

  // Uji geometri diagram — termasuk pembelahan jari manis antara area A dan B —
  // pindah ke `tests/diagram-tangan.test.ts` sejak gambarnya diekstrak langsung
  // dari `rhandq.pdf`. Berkas ini kembali mengurus skoring saja.
})

describe('konstanta skala CHDQ', () => {
  it('memakai skala & bobot yang sama persis dengan CMDQ', () => {
    // Halaman resmi CHDQ mengulang instruksi skoring CMDQ kata demi kata.
    // Bila keduanya sampai berbeda, satu penelitian memakai dua skala.
    expect([...BOBOT_FREKUENSI]).toEqual([0, 1.5, 3.5, 5, 10])
    expect(SKALA_FREKUENSI).toHaveLength(5)
  })

  it('skor maksimum 90 per area, 540 per tangan, 1080 keseluruhan', () => {
    expect(SKOR_AREA_MAKS).toBe(90)
    expect(SKOR_TANGAN_MAKS).toBe(540)
    expect(SKOR_CHDQ_MAKS).toBe(1080)
  })

  it('ambang per area 30 dan 60', () => {
    expect(AMBANG_AREA_SEDANG).toBe(30)
    expect(AMBANG_AREA_TINGGI).toBe(60)
  })
})

describe('hitungSkorArea', () => {
  it('mengalikan bobot frekuensi × ketidaknyamanan × gangguan', () => {
    expect(hitungSkorArea(1, 1, 1)).toBe(1.5)
    expect(hitungSkorArea(4, 3, 3)).toBe(90)
  })

  it('mengembalikan 0 bila keluhan tidak pernah dirasakan', () => {
    expect(hitungSkorArea(0, null, null)).toBe(0)
    expect(hitungSkorArea(null, null, null)).toBe(0)
  })

  it('memakai pengali 1 bila ketidaknyamanan/gangguan hilang', () => {
    expect(hitungSkorArea(4, null, null)).toBe(10)
    expect(hitungSkorArea(2, null, 2)).toBe(7)
  })

  it('menolak nilai di luar rentang', () => {
    expect(() => hitungSkorArea(5, 1, 1)).toThrow(GalatJawabanChdq)
    expect(() => hitungSkorArea(2, 4, 1)).toThrow(GalatJawabanChdq)
    expect(() => hitungSkorArea(2, 1, 0)).toThrow(GalatJawabanChdq)
  })
})

describe('kategorikanSkorArea', () => {
  it('membagi rentang 1–90 menjadi tiga kategori', () => {
    expect(kategorikanSkorArea(0)).toBe('TIDAK_ADA')
    expect(kategorikanSkorArea(30)).toBe('RENDAH')
    expect(kategorikanSkorArea(30.01)).toBe('SEDANG')
    expect(kategorikanSkorArea(60)).toBe('SEDANG')
    expect(kategorikanSkorArea(60.01)).toBe('TINGGI')
  })
})

describe('hitungSkorChdq — agregasi per tangan', () => {
  it('memisahkan skor kanan dan kiri', () => {
    let jawaban = jawabanKosong()
    // Kanan A: 10 × 3 × 3 = 90
    jawaban = dengan(jawaban, 'KANAN_A', {
      frekuensiKode: 4,
      ketidaknyamananSkor: 3,
      gangguanSkor: 3,
    })
    // Kanan F: 5 × 2 × 2 = 20
    jawaban = dengan(jawaban, 'KANAN_F', {
      frekuensiKode: 3,
      ketidaknyamananSkor: 2,
      gangguanSkor: 2,
    })
    // Kiri C: 1,5 × 1 × 1 = 1,5
    jawaban = dengan(jawaban, 'KIRI_C', {
      frekuensiKode: 1,
      ketidaknyamananSkor: 1,
      gangguanSkor: 1,
    })

    const hasil = hitungSkorChdq(jawaban)
    const kanan = hasil.perTangan.find((t) => t.tangan === 'KANAN')!
    const kiri = hasil.perTangan.find((t) => t.tangan === 'KIRI')!

    expect(kanan.skorTotal).toBe(110)
    expect(kiri.skorTotal).toBe(1.5)
    expect(hasil.skorTotal).toBe(111.5)
    expect(hasil.tanganDominan).toBe('KANAN')
    expect(hasil.areaTertinggi?.kodeArea).toBe('KANAN_A')
    expect(kanan.jumlahAreaBermasalah).toBe(2)
    expect(kiri.jumlahAreaBermasalah).toBe(1)
  })

  it('tidak memilih tangan dominan bila kedua tangan seri', () => {
    /**
     * Termasuk — dan terutama — saat keduanya bernilai 0. Kalau seri dipaksa
     * dimenangkan tangan pertama pada array, seluruh responden tanpa keluhan
     * akan terekam "dominan kanan", dan kolom itu terbaca sebagai temuan
     * padahal ia hanya urutan larik.
     */
    expect(hitungSkorChdq(jawabanKosong()).tanganDominan).toBeNull()

    const isi = { frekuensiKode: 2, ketidaknyamananSkor: 2, gangguanSkor: 2 }
    const seri = dengan(dengan(jawabanKosong(), 'KANAN_B', isi), 'KIRI_B', isi)
    expect(hitungSkorChdq(seri).tanganDominan).toBeNull()
  })

  it('mencapai maksimum 1080 bila seluruh area maksimal', () => {
    const hasil = hitungSkorChdq(
      AREA_TANGAN.map((a) => ({
        kodeArea: a.kode,
        frekuensiKode: 4,
        ketidaknyamananSkor: 3,
        gangguanSkor: 3,
      })),
    )
    expect(hasil.skorTotal).toBe(1080)
    expect(hasil.persenDariMaks).toBe(100)
    expect(hasil.jumlahAreaBermasalah).toBe(12)
    expect(hasil.metode.jumlahFrekuensiBerbobot).toBe(120)
  })
})

describe('hitungSkorChdq — validasi', () => {
  it('menolak bila ada area yang belum terkirim', () => {
    expect(() => hitungSkorChdq(jawabanKosong().slice(0, 11))).toThrow(
      /belum dijawab/i,
    )
  })

  it('menolak kode area yang tidak dikenal', () => {
    const jawaban = [
      ...jawabanKosong().slice(1),
      { kodeArea: 'KANAN_Z', frekuensiKode: 0 },
    ]
    expect(() => hitungSkorChdq(jawaban)).toThrow(/tidak dikenali/i)
  })

  it('menolak area ganda', () => {
    expect(() =>
      hitungSkorChdq([...jawabanKosong(), jawabanKosong()[0]!]),
    ).toThrow(/lebih dari sekali/i)
  })

  it('menolak jawaban lanjutan yang terisi padahal frekuensi = 0', () => {
    const jawaban = dengan(jawabanKosong(), 'KIRI_D', {
      frekuensiKode: 0,
      ketidaknyamananSkor: 2,
      gangguanSkor: 2,
    })
    expect(() => hitungSkorChdq(jawaban)).toThrow(/tidak berlaku/i)
  })

  it('mengenali seluruh kode area yang dibangkitkan katalog', () => {
    for (const a of AREA_TANGAN) {
      expect(cariAreaTangan(a.kode)?.kode).toBe(a.kode)
    }
  })
})
