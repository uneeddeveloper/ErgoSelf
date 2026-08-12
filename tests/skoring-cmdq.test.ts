import { describe, expect, it } from 'vitest'
import { SEGMEN_TUBUH, JUMLAH_SEGMEN } from '../lib/cmdq/segmen'
import {
  AMBANG_SEGMEN_SEDANG,
  AMBANG_SEGMEN_TINGGI,
  AMBANG_TOTAL_SEDANG_SEMENTARA,
  AMBANG_TOTAL_TINGGI_SEMENTARA,
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

/** Membuat set jawaban lengkap 18 item, semuanya "tidak pernah". */
function jawabanKosong(): JawabanSegmenInput[] {
  return SEGMEN_TUBUH.map((s) => ({
    kodeSegmen: s.kode,
    frekuensiKode: 0,
    ketidaknyamananSkor: null,
    gangguanSkor: null,
  }))
}

/** Menimpa jawaban satu item tertentu. */
function dengan(
  dasar: JawabanSegmenInput[],
  kode: string,
  isi: Partial<JawabanSegmenInput>,
): JawabanSegmenInput[] {
  return dasar.map((j) => (j.kodeSegmen === kode ? { ...j, ...isi } : j))
}

describe('konstanta instrumen', () => {
  it('memakai 18 item CMDQ versi pekerja duduk', () => {
    expect(JUMLAH_SEGMEN).toBe(18)
  })

  it('skor maksimum per item 90 dan total 1620', () => {
    expect(SKOR_SEGMEN_MAKS).toBe(90)
    expect(SKOR_TOTAL_MAKS).toBe(1620)
  })

  it('nomor item unik dan berurutan 0–17', () => {
    const urutan = SEGMEN_TUBUH.map((s) => s.urutan).sort((a, b) => a - b)
    expect(urutan).toEqual(Array.from({ length: 18 }, (_, i) => i))
  })

  it('kode item tidak ada yang duplikat', () => {
    const kode = new Set(SEGMEN_TUBUH.map((s) => s.kode))
    expect(kode.size).toBe(18)
  })

  it('memuat persis daftar bagian tubuh pada mmsquest.pdf', () => {
    // Dipaku sebagai literal, bukan diperiksa panjangnya saja: daftar inilah
    // instrumennya. Menambah atau membuang satu item mengubah rentang skor
    // total dan membuat data yang sudah terkumpul tidak sebanding.
    expect(SEGMEN_TUBUH.map((s) => s.namaEn)).toEqual([
      'Neck',
      'Shoulder (Right)',
      'Shoulder (Left)',
      'Upper Back',
      'Upper Arm (Right)',
      'Upper Arm (Left)',
      'Lower Back',
      'Forearm (Right)',
      'Forearm (Left)',
      'Wrist (Right)',
      'Wrist (Left)',
      'Hip/Buttocks',
      'Thigh (Right)',
      'Thigh (Left)',
      'Knee (Right)',
      'Knee (Left)',
      'Lower Leg (Right)',
      'Lower Leg (Left)',
    ])
  })
})

describe('hitungSkorSegmen', () => {
  it('mengalikan bobot frekuensi × ketidaknyamanan × gangguan', () => {
    expect(hitungSkorSegmen(1, 1, 1)).toBe(1.5) // 1,5 × 1 × 1
    expect(hitungSkorSegmen(2, 3, 2)).toBe(21) // 3,5 × 3 × 2
    expect(hitungSkorSegmen(3, 2, 2)).toBe(20) // 5 × 2 × 2
    expect(hitungSkorSegmen(4, 3, 3)).toBe(90) // 10 × 3 × 3
  })

  it('membedakan "sekali sehari" dari "beberapa kali sehari"', () => {
    // Pembedaan inilah yang hilang pada versi lama aplikasi (4 opsi frekuensi
    // dengan bobot linier). Bobot Cornell melompat dua kali lipat di sini.
    expect(hitungSkorSegmen(3, 3, 3)).toBe(45)
    expect(hitungSkorSegmen(4, 3, 3)).toBe(90)
  })

  it('mengembalikan 0 bila keluhan tidak pernah dirasakan', () => {
    expect(hitungSkorSegmen(0, null, null)).toBe(0)
    // Nilai lanjutan diabaikan sepenuhnya saat frekuensi = 0
    expect(hitungSkorSegmen(0, 3, 3)).toBe(0)
  })

  it('memperlakukan frekuensi kosong sebagai 0, sesuai aturan Cornell', () => {
    expect(hitungSkorSegmen(null, null, null)).toBe(0)
    expect(hitungSkorSegmen(undefined, null, null)).toBe(0)
  })

  it('menolak frekuensi di luar rentang 0–4', () => {
    expect(() => hitungSkorSegmen(-1, 1, 1)).toThrow(GalatJawabanCmdq)
    expect(() => hitungSkorSegmen(5, 1, 1)).toThrow(GalatJawabanCmdq)
    expect(() => hitungSkorSegmen(1.5, 1, 1)).toThrow(GalatJawabanCmdq)
  })

  it('memakai pengali 1 bila ketidaknyamanan/gangguan hilang', () => {
    /**
     * Aturan Cornell, verbatim: "if the missing value is in the Discomfort or
     * Frequency score then treat it as missing so that the multiplied score
     * will be at least the value of the Frequency score."
     *
     * Versi sebelumnya MENOLAK kombinasi ini dengan galat, sehingga satu
     * pertanyaan lanjutan yang terlewat membatalkan seluruh pengiriman.
     */
    expect(hitungSkorSegmen(2, null, 2)).toBe(7) // 3,5 × 1 × 2
    expect(hitungSkorSegmen(2, 2, null)).toBe(7) // 3,5 × 2 × 1
    expect(hitungSkorSegmen(4, null, null)).toBe(10) // = bobot frekuensinya

    // Syarat yang dinyatakan Cornell: hasil kali minimal setara skor frekuensi.
    for (let kode = 1; kode <= 4; kode += 1) {
      expect(hitungSkorSegmen(kode, null, null)).toBe(BOBOT_FREKUENSI[kode])
    }
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

  it('membagi rentang 1–90 menjadi tiga kategori', () => {
    expect(kategorikanSkorSegmen(1)).toBe('RENDAH')
    expect(kategorikanSkorSegmen(30)).toBe('RENDAH') // batas atas inklusif
    expect(kategorikanSkorSegmen(30.01)).toBe('SEDANG')
    expect(kategorikanSkorSegmen(60)).toBe('SEDANG') // batas atas inklusif
    expect(kategorikanSkorSegmen(60.01)).toBe('TINGGI')
    expect(kategorikanSkorSegmen(90)).toBe('TINGGI')
  })
})

describe('kategorikanSkorTotal', () => {
  it('memakai ambang sementara bila tidak diberi ambang eksplisit', () => {
    expect(kategorikanSkorTotal(0)).toBe('RENDAH')
    expect(kategorikanSkorTotal(AMBANG_TOTAL_SEDANG_SEMENTARA)).toBe('RENDAH')
    expect(kategorikanSkorTotal(AMBANG_TOTAL_SEDANG_SEMENTARA + 0.01)).toBe(
      'SEDANG',
    )
    expect(kategorikanSkorTotal(AMBANG_TOTAL_TINGGI_SEMENTARA)).toBe('SEDANG')
    expect(kategorikanSkorTotal(AMBANG_TOTAL_TINGGI_SEMENTARA + 0.01)).toBe(
      'TINGGI',
    )
  })

  it('menerima ambang tersil agar hasil lama dapat direproduksi', () => {
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

  it('tidak menandai satu pun item bermasalah', () => {
    expect(hasil.jumlahSegmenBermasalah).toBe(0)
    expect(hasil.segmenTertinggi).toBeNull()
    expect(hasil.perSegmen).toHaveLength(18)
    expect(hasil.perSegmen.every((s) => s.kategori === 'TIDAK_ADA')).toBe(true)
  })

  it('melaporkan keempat metode Cornell bernilai nol', () => {
    expect(hasil.metode).toEqual({
      jumlahGejala: 0,
      jumlahRating: 0,
      jumlahFrekuensiBerbobot: 0,
      skorPerkalian: 0,
    })
  })
})

describe('hitungSkorCmdq — responden dengan keluhan maksimal', () => {
  const hasil = hitungSkorCmdq(
    SEGMEN_TUBUH.map((s) => ({
      kodeSegmen: s.kode,
      frekuensiKode: 4,
      ketidaknyamananSkor: 3,
      gangguanSkor: 3,
    })),
  )

  it('mencapai skor total maksimum 1620', () => {
    expect(hasil.skorTotal).toBe(1620)
    expect(hasil.skorRataRata).toBe(90)
    expect(hasil.persenDariMaks).toBe(100)
  })

  it('dikategorikan risiko tinggi dengan 18 item bermasalah', () => {
    expect(hasil.kategoriRisiko).toBe('TINGGI')
    expect(hasil.jumlahSegmenBermasalah).toBe(18)
  })

  it('melaporkan ketiga metode Cornell lain pada nilai maksimumnya', () => {
    expect(hasil.metode.jumlahGejala).toBe(18)
    expect(hasil.metode.jumlahRating).toBe(18 * (4 + 3 + 3))
    expect(hasil.metode.jumlahFrekuensiBerbobot).toBe(180)
  })
})

describe('hitungSkorCmdq — kasus campuran', () => {
  it('menjumlahkan hanya item yang berkeluhan', () => {
    let jawaban = jawabanKosong()
    // Leher: 5 × 3 × 2 = 30
    jawaban = dengan(jawaban, 'LEHER', {
      frekuensiKode: 3,
      ketidaknyamananSkor: 3,
      gangguanSkor: 2,
    })
    // Bahu kanan: 3,5 × 2 × 1 = 7
    jawaban = dengan(jawaban, 'BAHU_KANAN', {
      frekuensiKode: 2,
      ketidaknyamananSkor: 2,
      gangguanSkor: 1,
    })
    // Punggung bawah: 1,5 × 1 × 3 = 4,5
    jawaban = dengan(jawaban, 'PUNGGUNG_BAWAH', {
      frekuensiKode: 1,
      ketidaknyamananSkor: 1,
      gangguanSkor: 3,
    })

    const hasil = hitungSkorCmdq(jawaban)

    expect(hasil.skorTotal).toBe(41.5)
    expect(hasil.jumlahSegmenBermasalah).toBe(3)
    expect(hasil.segmenTertinggi?.kodeSegmen).toBe('LEHER')
    expect(hasil.segmenTertinggi?.skor).toBe(30)
    expect(hasil.skorRataRata).toBe(2.31) // 41,5 / 18

    // Metode 2 & 3 dihitung dari data yang sama, bukan dari skor perkalian.
    expect(hasil.metode.jumlahRating).toBe(3 + 3 + 2 + (2 + 2 + 1) + (1 + 1 + 3))
    expect(hasil.metode.jumlahFrekuensiBerbobot).toBe(5 + 3.5 + 1.5)
  })

  it('mengisi null pada item yang tidak berkeluhan', () => {
    const jawaban = dengan(jawabanKosong(), 'PUNGGUNG_ATAS', {
      frekuensiKode: 2,
      ketidaknyamananSkor: 3,
      gangguanSkor: 3,
    })
    const hasil = hitungSkorCmdq(jawaban)

    const punggung = hasil.perSegmen.find(
      (s) => s.kodeSegmen === 'PUNGGUNG_ATAS',
    )!
    const leher = hasil.perSegmen.find((s) => s.kodeSegmen === 'LEHER')!

    expect(punggung.skor).toBe(31.5)
    expect(punggung.ketidaknyamananSkor).toBe(3)
    expect(leher.skor).toBe(0)
    expect(leher.ketidaknyamananSkor).toBeNull()
    expect(leher.gangguanSkor).toBeNull()
  })

  it('menandai nilai hilang tanpa menuliskan angka penggantinya', () => {
    // Pengali 1 hanya dipakai saat menghitung. Menuliskannya ke `perSegmen`
    // berarti mengarang jawaban "sedikit tidak nyaman" yang tidak pernah
    // diberikan responden — dan angka itu akan ikut ke basis data dan ekspor.
    const jawaban = dengan(jawabanKosong(), 'PERGELANGAN_TANGAN_KANAN', {
      frekuensiKode: 4,
      ketidaknyamananSkor: null,
      gangguanSkor: 3,
    })
    const hasil = hitungSkorCmdq(jawaban)
    const wrist = hasil.perSegmen.find(
      (s) => s.kodeSegmen === 'PERGELANGAN_TANGAN_KANAN',
    )!

    expect(wrist.skor).toBe(30) // 10 × 1 × 3
    expect(wrist.ketidaknyamananSkor).toBeNull()
    expect(wrist.gangguanSkor).toBe(3)
    expect(wrist.adaNilaiHilang).toBe(true)
    expect(hasil.jumlahSegmenNilaiHilang).toBe(1)
  })

  it('mengembalikan item selalu urut sesuai nomor CMDQ', () => {
    const hasil = hitungSkorCmdq(jawabanKosong().reverse())
    expect(hasil.perSegmen.map((s) => s.urutan)).toEqual(
      Array.from({ length: 18 }, (_, i) => i),
    )
  })
})

describe('hitungSkorCmdq — validasi kelengkapan', () => {
  it('menolak bila ada item yang belum terkirim', () => {
    const kurang = jawabanKosong().slice(0, 17)
    expect(() => hitungSkorCmdq(kurang)).toThrow(GalatJawabanCmdq)
    expect(() => hitungSkorCmdq(kurang)).toThrow(/belum dijawab/i)
  })

  it('menolak kode item yang tidak dikenal', () => {
    const jawaban = [
      ...jawabanKosong().slice(1),
      { kodeSegmen: 'TELINGA_KIRI', frekuensiKode: 0 },
    ]
    expect(() => hitungSkorCmdq(jawaban)).toThrow(/tidak dikenali/i)
  })

  it('menolak item ganda', () => {
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

  it('menyertakan nama item pada pesan galat agar mudah ditelusuri', () => {
    const jawaban = dengan(jawabanKosong(), 'TUNGKAI_BAWAH_KANAN', {
      frekuensiKode: 2,
      ketidaknyamananSkor: 9,
      gangguanSkor: 2,
    })
    expect(() => hitungSkorCmdq(jawaban)).toThrow(/Tungkai bawah kanan/)
  })
})

describe('pemenang seri pada segmenTertinggi', () => {
  /**
   * Kasus lazim di data ergonomi kantor: sepasang item kiri/kanan dilaporkan
   * identik. Aturannya — yang lebih dulu pada urutan CMDQ menang — tidak punya
   * konsekuensi numerik, tetapi menentukan isi kolom `CMDQ_Segmen_Tertinggi`
   * pada berkas ekspor dan kartu "titik ketidaknyamanan" pada laporan
   * responden. Tanpa uji ini, mengganti `>` menjadi `>=` di `skoring.ts`
   * membalik setiap seri tanpa satu pun uji gagal.
   */
  const maksimum = { frekuensiKode: 4, ketidaknyamananSkor: 3, gangguanSkor: 3 }

  it('memilih item dengan urutan CMDQ terkecil saat skornya sama', () => {
    const jawaban = dengan(
      dengan(jawabanKosong(), 'BAHU_KIRI', maksimum),
      'BAHU_KANAN',
      maksimum,
    )
    const hasil = hitungSkorCmdq(jawaban)

    expect(hasil.segmenTertinggi?.skor).toBe(SKOR_SEGMEN_MAKS)
    // Form Cornell menaruh sisi kanan lebih dulu: BAHU_KANAN urutan 1,
    // BAHU_KIRI urutan 2.
    expect(hasil.segmenTertinggi?.kodeSegmen).toBe('BAHU_KANAN')
  })

  it('tetap memilih skor tertinggi walau muncul belakangan pada urutan', () => {
    const jawaban = dengan(
      dengan(jawabanKosong(), 'LEHER', {
        frekuensiKode: 1,
        ketidaknyamananSkor: 1,
        gangguanSkor: 1,
      }),
      'TUNGKAI_BAWAH_KIRI',
      maksimum,
    )
    expect(hitungSkorCmdq(jawaban).segmenTertinggi?.kodeSegmen).toBe(
      'TUNGKAI_BAWAH_KIRI',
    )
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
  it('memakai bobot frekuensi baku Cornell 0/1,5/3,5/5/10', () => {
    expect([...BOBOT_FREKUENSI]).toEqual([0, 1.5, 3.5, 5, 10])
  })

  it('memakai 5 opsi frekuensi, 3 opsi ketidaknyamanan, 3 opsi gangguan', () => {
    expect(SKALA_FREKUENSI).toHaveLength(5)
    expect(SKALA_KETIDAKNYAMANAN).toHaveLength(3)
    expect(SKALA_GANGGUAN).toHaveLength(3)
  })

  it('memakai ambang per item 30 dan 60 dari maksimum 90', () => {
    expect(SKOR_SEGMEN_MAKS).toBe(90)
    expect(AMBANG_SEGMEN_SEDANG).toBe(30)
    expect(AMBANG_SEGMEN_TINGGI).toBe(60)
  })

  it('memicu rujukan dari satu item berat, bukan dari kategori risiko total', () => {
    // Responden dengan nyeri punggung bawah PALING BERAT yang diukur
    // instrumen ini — beberapa kali sehari, sangat tidak nyaman, sangat
    // mengganggu pekerjaan — tetap berskor total 90 dan berkategori RENDAH,
    // karena 17 bagian tubuh lainnya bernilai 0. Itulah sebabnya rujukan
    // tenaga kesehatan tidak boleh bergantung pada kategori risiko total.
    //
    // Dengan ambang tersil empiris, kesenjangan ini justru MELEBAR: sepertiga
    // terbawah sebuah populasi pekerja kantor lazimnya berisi skor rendah,
    // sehingga responden seperti ini bisa tetap masuk RENDAH.
    const maksimum = { frekuensiKode: 4, ketidaknyamananSkor: 3, gangguanSkor: 3 }
    const hasil = hitungSkorCmdq(
      dengan(jawabanKosong(), 'PUNGGUNG_BAWAH', maksimum),
    )

    expect(hasil.skorTotal).toBe(90)
    expect(hasil.kategoriRisiko).toBe('RENDAH')
    expect(hasil.segmenTertinggi?.skor).toBe(SKOR_SEGMEN_MAKS)
    expect(
      perluRujukan({
        kategoriRisiko: hasil.kategoriRisiko,
        regioBermasalah: [],
        skorSegmenTertinggi: hasil.segmenTertinggi?.skor ?? 0,
      }),
    ).toBe(true)
  })
})
