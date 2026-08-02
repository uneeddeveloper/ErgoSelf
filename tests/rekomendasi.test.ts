import { describe, expect, it } from 'vitest'
import { susunRekomendasi } from '../lib/rekomendasi'

/** Ambil daftar judul saran, memudahkan pemeriksaan. */
function judul(...args: Parameters<typeof susunRekomendasi>) {
  return susunRekomendasi(...args).map((r) => r.judul)
}

describe('susunRekomendasi — saran mengikuti regio yang dikeluhkan', () => {
  it('keluhan leher memunculkan saran tinggi monitor', () => {
    const hasil = judul({ kategoriRisiko: 'RENDAH', regioBermasalah: ['LEHER'] })
    expect(hasil).toContain('Atur Tinggi Monitor')
    expect(hasil).not.toContain('Penyesuaian Kursi')
    expect(hasil).not.toContain('Topangan Kaki & Sirkulasi')
  })

  it('keluhan punggung/pinggang memunculkan saran kursi', () => {
    const hasil = judul({
      kategoriRisiko: 'RENDAH',
      regioBermasalah: ['PUNGGUNG_PINGGANG'],
    })
    expect(hasil).toContain('Penyesuaian Kursi')
    expect(hasil).not.toContain('Atur Tinggi Monitor')
  })

  it('keluhan pergelangan/tangan memunculkan saran papan tik', () => {
    const hasil = judul({
      kategoriRisiko: 'RENDAH',
      regioBermasalah: ['EKSTREMITAS_ATAS'],
    })
    expect(hasil).toContain('Posisi Papan Tik & Tetikus')
  })

  it('beberapa regio memunculkan beberapa saran sekaligus, urut atas ke bawah', () => {
    const hasil = judul({
      kategoriRisiko: 'SEDANG',
      regioBermasalah: ['EKSTREMITAS_BAWAH', 'LEHER', 'BAHU'],
    })
    expect(hasil.slice(0, 3)).toEqual([
      'Atur Tinggi Monitor',
      'Sesuaikan Sandaran Tangan',
      'Topangan Kaki & Sirkulasi',
    ])
  })

  it('tanpa keluhan tetap memberi saran umum', () => {
    const hasil = judul({ kategoriRisiko: 'RENDAH', regioBermasalah: [] })
    expect(hasil).toEqual(['Micro-breaks', 'Asesmen Ulang'])
  })
})

describe('susunRekomendasi — saran selalu ada', () => {
  it('micro-break dan asesmen ulang muncul di setiap kondisi', () => {
    for (const risiko of ['RENDAH', 'SEDANG', 'TINGGI'] as const) {
      const hasil = judul({ kategoriRisiko: risiko, regioBermasalah: [] })
      expect(hasil, risiko).toContain('Micro-breaks')
      expect(hasil.at(-1), risiko).toBe('Asesmen Ulang')
    }
  })

  it('micro-break lebih sering bagi pengguna komputer ≥ 8 jam', () => {
    const panjang = susunRekomendasi({
      kategoriRisiko: 'RENDAH',
      regioBermasalah: [],
      durasiKomputerJamPerHari: 10,
    }).find((r) => r.judul === 'Micro-breaks')!
    const pendek = susunRekomendasi({
      kategoriRisiko: 'RENDAH',
      regioBermasalah: [],
      durasiKomputerJamPerHari: 5,
    }).find((r) => r.judul === 'Micro-breaks')!

    expect(panjang.isi).toContain('45 menit')
    expect(panjang.isi).toContain('10 jam')
    expect(pendek.isi).toContain('60 menit')
  })

  it('jadwal asesmen ulang lebih cepat bila risiko tidak rendah', () => {
    const rendah = susunRekomendasi({
      kategoriRisiko: 'RENDAH',
      regioBermasalah: [],
    }).at(-1)!
    const tinggi = susunRekomendasi({
      kategoriRisiko: 'TINGGI',
      regioBermasalah: [],
    }).at(-1)!

    expect(rendah.isi).toContain('3 bulan')
    expect(tinggi.isi).toContain('1 bulan')
  })
})

describe('susunRekomendasi — saran bersyarat', () => {
  it('saran olahraga hanya muncul bila responden tidak berolahraga', () => {
    expect(
      judul({ kategoriRisiko: 'RENDAH', regioBermasalah: [], olahraga: false }),
    ).toContain('Mulai Aktivitas Fisik Ringan')

    expect(
      judul({ kategoriRisiko: 'RENDAH', regioBermasalah: [], olahraga: true }),
    ).not.toContain('Mulai Aktivitas Fisik Ringan')

    // Data belum diisi (null/undefined) tidak boleh memunculkan saran
    expect(
      judul({ kategoriRisiko: 'RENDAH', regioBermasalah: [], olahraga: null }),
    ).not.toContain('Mulai Aktivitas Fisik Ringan')
  })

  it('saran berat badan hanya untuk IMT di atas normal', () => {
    for (const imt of ['GEMUK_RINGAN', 'OBESITAS'] as const) {
      expect(
        judul({ kategoriRisiko: 'RENDAH', regioBermasalah: [], kategoriImt: imt }),
        imt,
      ).toContain('Perhatikan Berat Badan')
    }

    for (const imt of ['NORMAL', 'KURUS_RINGAN', 'KURUS_BERAT'] as const) {
      expect(
        judul({ kategoriRisiko: 'RENDAH', regioBermasalah: [], kategoriImt: imt }),
        imt,
      ).not.toContain('Perhatikan Berat Badan')
    }
  })

  it('rujukan ke petugas K3 hanya untuk risiko tinggi', () => {
    expect(
      judul({ kategoriRisiko: 'TINGGI', regioBermasalah: ['LEHER'] }),
    ).toContain('Konsultasi Petugas K3')

    for (const risiko of ['RENDAH', 'SEDANG'] as const) {
      expect(
        judul({ kategoriRisiko: risiko, regioBermasalah: ['LEHER'] }),
        risiko,
      ).not.toContain('Konsultasi Petugas K3')
    }
  })
})

describe('susunRekomendasi — bentuk keluaran', () => {
  it('setiap saran punya ikon, judul, isi, dan pemicu yang terisi', () => {
    const hasil = susunRekomendasi({
      kategoriRisiko: 'TINGGI',
      regioBermasalah: ['LEHER', 'PUNGGUNG_PINGGANG'],
      durasiKomputerJamPerHari: 9,
      kategoriImt: 'OBESITAS',
      olahraga: false,
    })

    expect(hasil.length).toBeGreaterThanOrEqual(7)
    for (const r of hasil) {
      expect(r.ikon.length, r.judul).toBeGreaterThan(0)
      expect(r.judul.length).toBeGreaterThan(0)
      expect(r.isi.length).toBeGreaterThan(20)
      expect(r.pemicu.length).toBeGreaterThan(0)
    }
  })

  it('tidak menghasilkan judul ganda', () => {
    const hasil = judul({
      kategoriRisiko: 'TINGGI',
      regioBermasalah: [
        'LEHER',
        'BAHU',
        'PUNGGUNG_PINGGANG',
        'EKSTREMITAS_ATAS',
        'EKSTREMITAS_BAWAH',
      ],
      durasiKomputerJamPerHari: 9,
      kategoriImt: 'OBESITAS',
      olahraga: false,
    })
    expect(new Set(hasil).size).toBe(hasil.length)
  })
})
