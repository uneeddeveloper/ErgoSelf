import { describe, expect, it } from 'vitest'
import { SEGMEN_TUBUH, JUMLAH_SEGMEN } from '../lib/cmdq/segmen'
import {
  AMBANG_SEGMEN_SEDANG,
  AMBANG_SEGMEN_TINGGI,
  AMBANG_TOTAL_SEDANG,
  AMBANG_TOTAL_TINGGI,
  BOBOT_FREKUENSI,
  SKALA_FREKUENSI,
  SKALA_GANGGUAN,
  SKALA_KETIDAKNYAMANAN,
  SKOR_SEGMEN_MAKS,
  SKOR_TOTAL_MAKS,
} from '../lib/cmdq/skala'
import { perluRujukan } from '../lib/rekomendasi'
import {
  GalatJawabanCmdq,
  hitungSkorCmdq,
  hitungSkorSegmen,
  kategorikanSkorSegmen,
  kategorikanSkorTotal,
  type JawabanSegmenInput,
} from '../lib/cmdq/skoring'

/** Membuat set jawaban lengkap 28 segmen, semuanya "tidak pernah". */
function jawabanKosong(): JawabanSegmenInput[] {
  return SEGMEN_TUBUH.map((s) => ({
    kodeSegmen: s.kode,
    frekuensiKode: 0,
    ketidaknyamananSkor: null,
    gangguanSkor: null,
  }))
}

/** Menimpa jawaban satu segmen tertentu. */
function dengan(
  dasar: JawabanSegmenInput[],
  kode: string,
  isi: Partial<JawabanSegmenInput>,
): JawabanSegmenInput[] {
  return dasar.map((j) => (j.kodeSegmen === kode ? { ...j, ...isi } : j))
}

describe('konstanta instrumen', () => {
  it('memakai 28 segmen Nordic Body Map', () => {
    expect(JUMLAH_SEGMEN).toBe(28)
  })

  it('skor maksimum per segmen 27 dan total 756', () => {
    expect(SKOR_SEGMEN_MAKS).toBe(27)
    expect(SKOR_TOTAL_MAKS).toBe(756)
  })

  it('nomor segmen unik dan berurutan 0–27', () => {
    const urutan = SEGMEN_TUBUH.map((s) => s.urutan).sort((a, b) => a - b)
    expect(urutan).toEqual(Array.from({ length: 28 }, (_, i) => i))
  })

  it('kode segmen tidak ada yang duplikat', () => {
    const kode = new Set(SEGMEN_TUBUH.map((s) => s.kode))
    expect(kode.size).toBe(28)
  })
})

describe('hitungSkorSegmen', () => {
  it('mengalikan frekuensi × ketidaknyamanan × gangguan', () => {
    expect(hitungSkorSegmen(1, 1, 1)).toBe(1)
    expect(hitungSkorSegmen(2, 3, 2)).toBe(12)
    expect(hitungSkorSegmen(3, 3, 3)).toBe(27)
  })

  it('mengembalikan 0 bila keluhan tidak pernah dirasakan', () => {
    expect(hitungSkorSegmen(0, null, null)).toBe(0)
    // Nilai lanjutan diabaikan sepenuhnya saat frekuensi = 0
    expect(hitungSkorSegmen(0, 3, 3)).toBe(0)
  })

  it('menolak frekuensi di luar rentang 0–3', () => {
    expect(() => hitungSkorSegmen(-1, 1, 1)).toThrow(GalatJawabanCmdq)
    expect(() => hitungSkorSegmen(4, 1, 1)).toThrow(GalatJawabanCmdq)
    expect(() => hitungSkorSegmen(1.5, 1, 1)).toThrow(GalatJawabanCmdq)
  })

  it('menolak ketidaknyamanan/gangguan kosong bila frekuensi > 0', () => {
    expect(() => hitungSkorSegmen(2, null, 2)).toThrow(GalatJawabanCmdq)
    expect(() => hitungSkorSegmen(2, 2, null)).toThrow(GalatJawabanCmdq)
    expect(() => hitungSkorSegmen(2, undefined, undefined)).toThrow(
      GalatJawabanCmdq,
    )
  })

  it('menolak ketidaknyamanan/gangguan di luar rentang 1–3', () => {
    expect(() => hitungSkorSegmen(2, 0, 2)).toThrow(GalatJawabanCmdq)
    expect(() => hitungSkorSegmen(2, 4, 2)).toThrow(GalatJawabanCmdq)
    expect(() => hitungSkorSegmen(2, 2, 0)).toThrow(GalatJawabanCmdq)
    expect(() => hitungSkorSegmen(2, 2, 4)).toThrow(GalatJawabanCmdq)
  })
})

describe('kategorikanSkorSegmen', () => {
  it('0 berarti tidak ada keluhan', () => {
    expect(kategorikanSkorSegmen(0)).toBe('TIDAK_ADA')
  })

  it('membagi rentang 1–27 menjadi tiga kategori', () => {
    expect(kategorikanSkorSegmen(1)).toBe('RENDAH')
    expect(kategorikanSkorSegmen(9)).toBe('RENDAH') // batas atas inklusif
    expect(kategorikanSkorSegmen(10)).toBe('SEDANG')
    expect(kategorikanSkorSegmen(18)).toBe('SEDANG') // batas atas inklusif
    expect(kategorikanSkorSegmen(19)).toBe('TINGGI')
    expect(kategorikanSkorSegmen(27)).toBe('TINGGI')
  })
})

describe('kategorikanSkorTotal', () => {
  it('memakai ambang sepertiga rentang teoretis', () => {
    expect(AMBANG_TOTAL_SEDANG).toBe(252)
    expect(AMBANG_TOTAL_TINGGI).toBe(504)

    expect(kategorikanSkorTotal(0)).toBe('RENDAH')
    expect(kategorikanSkorTotal(252)).toBe('RENDAH')
    expect(kategorikanSkorTotal(252.01)).toBe('SEDANG')
    expect(kategorikanSkorTotal(504)).toBe('SEDANG')
    expect(kategorikanSkorTotal(504.01)).toBe('TINGGI')
    expect(kategorikanSkorTotal(756)).toBe('TINGGI')
  })

  it('menerima ambang khusus agar hasil lama dapat direproduksi', () => {
    expect(kategorikanSkorTotal(100, 50, 150)).toBe('SEDANG')
    expect(kategorikanSkorTotal(40, 50, 150)).toBe('RENDAH')
    expect(kategorikanSkorTotal(200, 50, 150)).toBe('TINGGI')
  })
})

describe('hitungSkorCmdq — responden tanpa keluhan', () => {
  const hasil = hitungSkorCmdq(jawabanKosong())

  it('menghasilkan skor total 0 dan risiko rendah', () => {
    expect(hasil.skorTotal).toBe(0)
    expect(hasil.skorRataRata).toBe(0)
    expect(hasil.kategoriRisiko).toBe('RENDAH')
    expect(hasil.persenDariMaks).toBe(0)
  })

  it('tidak menandai satu pun segmen bermasalah', () => {
    expect(hasil.jumlahSegmenBermasalah).toBe(0)
    expect(hasil.segmenTertinggi).toBeNull()
    expect(hasil.perSegmen).toHaveLength(28)
    expect(hasil.perSegmen.every((s) => s.kategori === 'TIDAK_ADA')).toBe(true)
  })
})

describe('hitungSkorCmdq — responden dengan keluhan maksimal', () => {
  const hasil = hitungSkorCmdq(
    SEGMEN_TUBUH.map((s) => ({
      kodeSegmen: s.kode,
      frekuensiKode: 3,
      ketidaknyamananSkor: 3,
      gangguanSkor: 3,
    })),
  )

  it('mencapai skor total maksimum 756', () => {
    expect(hasil.skorTotal).toBe(756)
    expect(hasil.skorRataRata).toBe(27)
    expect(hasil.persenDariMaks).toBe(100)
  })

  it('dikategorikan risiko tinggi dengan 28 segmen bermasalah', () => {
    expect(hasil.kategoriRisiko).toBe('TINGGI')
    expect(hasil.jumlahSegmenBermasalah).toBe(28)
  })
})

describe('hitungSkorCmdq — kasus campuran', () => {
  it('menjumlahkan hanya segmen yang berkeluhan', () => {
    let jawaban = jawabanKosong()
    // Leher atas: 3 × 3 × 2 = 18
    jawaban = dengan(jawaban, 'LEHER_ATAS', {
      frekuensiKode: 3,
      ketidaknyamananSkor: 3,
      gangguanSkor: 2,
    })
    // Bahu kanan: 2 × 2 × 1 = 4
    jawaban = dengan(jawaban, 'BAHU_KANAN', {
      frekuensiKode: 2,
      ketidaknyamananSkor: 2,
      gangguanSkor: 1,
    })
    // Pinggang: 1 × 1 × 3 = 3
    jawaban = dengan(jawaban, 'PINGGANG', {
      frekuensiKode: 1,
      ketidaknyamananSkor: 1,
      gangguanSkor: 3,
    })

    const hasil = hitungSkorCmdq(jawaban)

    expect(hasil.skorTotal).toBe(25)
    expect(hasil.jumlahSegmenBermasalah).toBe(3)
    expect(hasil.kategoriRisiko).toBe('RENDAH')
    expect(hasil.segmenTertinggi?.kodeSegmen).toBe('LEHER_ATAS')
    expect(hasil.segmenTertinggi?.skor).toBe(18)
    expect(hasil.skorRataRata).toBe(0.89) // 25 / 28
  })

  it('mengisi null pada segmen yang tidak berkeluhan', () => {
    const jawaban = dengan(jawabanKosong(), 'PUNGGUNG', {
      frekuensiKode: 2,
      ketidaknyamananSkor: 3,
      gangguanSkor: 3,
    })
    const hasil = hitungSkorCmdq(jawaban)

    const punggung = hasil.perSegmen.find((s) => s.kodeSegmen === 'PUNGGUNG')!
    const leher = hasil.perSegmen.find((s) => s.kodeSegmen === 'LEHER_ATAS')!

    expect(punggung.skor).toBe(18)
    expect(punggung.ketidaknyamananSkor).toBe(3)
    expect(leher.skor).toBe(0)
    expect(leher.ketidaknyamananSkor).toBeNull()
    expect(leher.gangguanSkor).toBeNull()
  })

  it('mengembalikan segmen selalu urut sesuai nomor NBM', () => {
    const hasil = hitungSkorCmdq(jawabanKosong().reverse())
    expect(hasil.perSegmen.map((s) => s.urutan)).toEqual(
      Array.from({ length: 28 }, (_, i) => i),
    )
  })
})

describe('hitungSkorCmdq — validasi kelengkapan', () => {
  it('menolak bila ada segmen yang belum dijawab', () => {
    const kurang = jawabanKosong().slice(0, 27)
    expect(() => hitungSkorCmdq(kurang)).toThrow(GalatJawabanCmdq)
    expect(() => hitungSkorCmdq(kurang)).toThrow(/belum dijawab/i)
  })

  it('menolak kode segmen yang tidak dikenal', () => {
    const jawaban = [
      ...jawabanKosong().slice(1),
      { kodeSegmen: 'TELINGA_KIRI', frekuensiKode: 0 },
    ]
    expect(() => hitungSkorCmdq(jawaban)).toThrow(/tidak dikenali/i)
  })

  it('menolak segmen ganda', () => {
    const jawaban = [...jawabanKosong(), jawabanKosong()[0]!]
    expect(() => hitungSkorCmdq(jawaban)).toThrow(/lebih dari sekali/i)
  })

  it('menolak jawaban lanjutan yang terisi padahal frekuensi = 0', () => {
    const jawaban = dengan(jawabanKosong(), 'LUTUT_KIRI', {
      frekuensiKode: 0,
      ketidaknyamananSkor: 2,
      gangguanSkor: 2,
    })
    expect(() => hitungSkorCmdq(jawaban)).toThrow(/tidak berlaku/i)
  })

  it('menyertakan nama segmen pada pesan galat agar mudah ditelusuri', () => {
    const jawaban = dengan(jawabanKosong(), 'TANGAN_KANAN', {
      frekuensiKode: 2,
      ketidaknyamananSkor: null,
      gangguanSkor: 2,
    })
    expect(() => hitungSkorCmdq(jawaban)).toThrow(/Tangan kanan/)
  })
})

describe('pemenang seri pada segmenTertinggi', () => {
  /**
   * Kasus lazim di data ergonomi kantor: sepasang segmen kiri/kanan dilaporkan
   * identik. Aturannya — yang lebih dulu pada urutan NBM menang — tidak punya
   * konsekuensi numerik, tetapi menentukan isi kolom `CMDQ_Segmen_Tertinggi`
   * pada berkas ekspor dan kartu "titik ketidaknyamanan" pada laporan
   * responden. Tanpa uji ini, mengganti `>` menjadi `>=` di `skoring.ts`
   * membalik setiap seri tanpa satu pun uji gagal.
   */
  const maksimum = { frekuensiKode: 3, ketidaknyamananSkor: 3, gangguanSkor: 3 }

  it('memilih segmen dengan urutan NBM terkecil saat skornya sama', () => {
    const jawaban = dengan(
      dengan(jawabanKosong(), 'BAHU_KIRI', maksimum),
      'BAHU_KANAN',
      maksimum,
    )
    const hasil = hitungSkorCmdq(jawaban)

    expect(hasil.segmenTertinggi?.skor).toBe(SKOR_SEGMEN_MAKS)
    // BAHU_KIRI berurutan 2, BAHU_KANAN berurutan 3.
    expect(hasil.segmenTertinggi?.kodeSegmen).toBe('BAHU_KIRI')
  })

  it('tetap memilih skor tertinggi walau muncul belakangan pada urutan', () => {
    const jawaban = dengan(
      dengan(jawabanKosong(), 'LEHER_ATAS', {
        frekuensiKode: 1,
        ketidaknyamananSkor: 1,
        gangguanSkor: 1,
      }),
      'KAKI_KANAN',
      maksimum,
    )
    expect(hitungSkorCmdq(jawaban).segmenTertinggi?.kodeSegmen).toBe('KAKI_KANAN')
  })

  it('mengembalikan null bila tidak ada keluhan sama sekali', () => {
    expect(hitungSkorCmdq(jawabanKosong()).segmenTertinggi).toBeNull()
  })
})

describe('integritas instrumen — angka yang dikutip Bab III', () => {
  /**
   * Nilai di bawah masuk ke naskah tesis dan ke lembar Kamus Data pada berkas
   * ekspor. Setelah pengumpulan data dimulai, mengubahnya berarti dataset
   * memuat dua aturan skoring yang berbeda tanpa penanda. Uji ini memaku
   * angkanya sebagai literal — bila memang perlu diubah, perubahan itu harus
   * disengaja dan terlihat pada diff.
   */
  it('memakai bobot frekuensi linier 0–3', () => {
    expect([...BOBOT_FREKUENSI]).toEqual([0, 1, 2, 3])
  })

  it('memakai 4 opsi frekuensi, 3 opsi ketidaknyamanan, 3 opsi gangguan', () => {
    expect(SKALA_FREKUENSI).toHaveLength(4)
    expect(SKALA_KETIDAKNYAMANAN).toHaveLength(3)
    expect(SKALA_GANGGUAN).toHaveLength(3)
  })

  it('memakai ambang segmen 9 dan 18 dari maksimum 27', () => {
    expect(SKOR_SEGMEN_MAKS).toBe(27)
    expect(AMBANG_SEGMEN_SEDANG).toBe(9)
    expect(AMBANG_SEGMEN_TINGGI).toBe(18)
  })

  it('memakai ambang total 252 dan 504 dari maksimum 756', () => {
    expect(SKOR_TOTAL_MAKS).toBe(756)
    expect(AMBANG_TOTAL_SEDANG).toBe(252)
    expect(AMBANG_TOTAL_TINGGI).toBe(504)
  })

  it('memicu rujukan dari satu segmen berat, bukan dari kategori risiko total', () => {
    // Delapan bagian tubuh pada tingkat keluhan maksimum menghasilkan skor
    // total 216 — masih berkategori RENDAH karena ambang SEDANG ada di 252.
    // Karena itu rujukan tenaga kesehatan tidak boleh bergantung padanya.
    const maksimum = { frekuensiKode: 3, ketidaknyamananSkor: 3, gangguanSkor: 3 }
    const delapan = [
      'LEHER_ATAS', 'LEHER_BAWAH', 'BAHU_KIRI', 'BAHU_KANAN',
      'PUNGGUNG', 'PINGGANG', 'SIKU_KIRI', 'SIKU_KANAN',
    ].reduce((akum, kode) => dengan(akum, kode, maksimum), jawabanKosong())

    const hasil = hitungSkorCmdq(delapan)

    expect(hasil.skorTotal).toBe(216)
    expect(hasil.kategoriRisiko).toBe('RENDAH')
    expect(
      perluRujukan({
        kategoriRisiko: hasil.kategoriRisiko,
        regioBermasalah: [],
        skorSegmenTertinggi: hasil.segmenTertinggi?.skor ?? 0,
      }),
    ).toBe(true)
  })
})
