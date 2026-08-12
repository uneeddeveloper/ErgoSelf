import { describe, expect, it } from 'vitest'
import { SEGMEN_TUBUH } from '../lib/cmdq/segmen'
import {
  AREA_SEGMEN,
  JALUR_DETAIL,
  JALUR_TUBUH,
  JANGKAR_CORNELL,
  LEBAR_KANVAS,
  TINGGI_KANVAS,
  cariArea,
} from '../lib/cmdq/bodymap'

/**
 * Peta tubuh dan katalog item berada di dua berkas terpisah, sehingga mudah
 * jadi tidak sinkron saat salah satunya diubah. Pengujian di bawah menjaga
 * agar setiap item selalu punya area sentuh — dan sebaliknya.
 *
 * Sejak figurnya diekstrak dari `mmsquest.pdf`, uji ini juga menjaga hal yang
 * lebih halus: letak tiap area harus tetap sejalan dengan titik yang ditunjuk
 * garis penunjuk Cornell sendiri.
 */

/** Lebar render yang ditargetkan komponen (`max-w-[260px]`). */
const LEBAR_RENDER_PX = 260
const PX_PER_UNIT = LEBAR_RENDER_PX / LEBAR_KANVAS
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

function titikJalur(d: string): [number, number][] {
  const tok = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? []
  const titik: [number, number][] = []
  for (let i = 0; i < tok.length; i += 1) {
    const t = tok[i]!
    if (t === 'M' || t === 'L') {
      titik.push([parseFloat(tok[i + 1]!), parseFloat(tok[i + 2]!)])
      i += 2
    } else if (t === 'C') {
      titik.push([parseFloat(tok[i + 5]!), parseFloat(tok[i + 6]!)])
      i += 6
    }
  }
  return titik
}

describe('konsistensi peta tubuh dengan katalog item', () => {
  it('setiap item CMDQ punya tepat satu area sentuh', () => {
    for (const s of SEGMEN_TUBUH) {
      const cocok = AREA_SEGMEN.filter((a) => a.kode === s.kode)
      expect(cocok, `item ${s.kode}`).toHaveLength(1)
    }
  })

  it('tidak ada area untuk item yang tidak dikenal', () => {
    const sah = new Set(SEGMEN_TUBUH.map((s) => s.kode))
    for (const a of AREA_SEGMEN) {
      expect(sah.has(a.kode), `area ${a.kode}`).toBe(true)
    }
  })

  it('jumlah area sama dengan jumlah item', () => {
    expect(AREA_SEGMEN).toHaveLength(SEGMEN_TUBUH.length)
    expect(AREA_SEGMEN).toHaveLength(18)
  })

  it('pencarian area mengenali seluruh kode', () => {
    for (const s of SEGMEN_TUBUH) expect(cariArea(s.kode)?.kode).toBe(s.kode)
  })
})

describe('figur dari form asli', () => {
  it('memuat jalur tubuh yang utuh', () => {
    expect(titikJalur(JALUR_TUBUH).length).toBeGreaterThan(60)
    expect(titikJalur(JALUR_DETAIL).length).toBeGreaterThan(40)
  })

  it('seluruh gambar berada di dalam kanvas', () => {
    for (const d of [JALUR_TUBUH, JALUR_DETAIL]) {
      for (const [x, y] of titikJalur(d)) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(LEBAR_KANVAS)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(TINGGI_KANVAS)
      }
    }
  })

  it('setiap jangkar penunjuk Cornell jatuh di area yang benar', () => {
    /**
     * Inti uji ini: letak bagian tubuh bukan tafsir kita, melainkan titik yang
     * ditunjuk garis penunjuk pada form asli. Untuk bagian berpasangan,
     * Cornell hanya menunjuk SATU sisi (sisi kanan figur), jadi jangkar itu
     * harus jatuh di area sisi kanan.
     */
    const pasangan: Record<string, string> = {
      LEHER: 'LEHER',
      BAHU: 'BAHU_KANAN',
      PUNGGUNG_ATAS: 'PUNGGUNG_ATAS',
      LENGAN_ATAS: 'LENGAN_ATAS_KANAN',
      PUNGGUNG_BAWAH: 'PUNGGUNG_BAWAH',
      LENGAN_BAWAH: 'LENGAN_BAWAH_KANAN',
      PERGELANGAN_TANGAN: 'PERGELANGAN_TANGAN_KANAN',
      PINGGUL_BOKONG: 'PINGGUL_BOKONG',
      PAHA: 'PAHA_KANAN',
      LUTUT: 'LUTUT_KANAN',
      TUNGKAI_BAWAH: 'TUNGKAI_BAWAH_KANAN',
    }

    for (const [jangkarKode, areaKode] of Object.entries(pasangan)) {
      const j = JANGKAR_CORNELL[jangkarKode]!
      const a = cariArea(areaKode)!
      expect(
        memuat(a, j.x, j.y),
        `jangkar ${jangkarKode} (${j.x}, ${j.y}) tidak jatuh di area ${areaKode}`,
      ).toBe(true)
    }
  })

  it('menyediakan jangkar untuk kesebelas baris label form', () => {
    expect(Object.keys(JANGKAR_CORNELL)).toHaveLength(11)
  })
})

describe('area sentuh', () => {
  it('semua area berada di dalam kanvas', () => {
    for (const a of AREA_SEGMEN) {
      expect(a.x, `${a.kode}.x`).toBeGreaterThanOrEqual(0)
      expect(a.y, `${a.kode}.y`).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w, `${a.kode} sisi kanan`).toBeLessThanOrEqual(LEBAR_KANVAS)
      expect(a.y + a.h, `${a.kode} sisi bawah`).toBeLessThanOrEqual(TINGGI_KANVAS)
    }
  })

  it('setiap area layak dikenai jari', () => {
    for (const a of AREA_SEGMEN) {
      const sisiPendek = Math.min(a.w, a.h) * PX_PER_UNIT
      expect(
        sisiPendek,
        `${a.kode}: sisi terpendek ${sisiPendek.toFixed(0)}px`,
      ).toBeGreaterThanOrEqual(MIN_SENTUH_PX)
    }
  })

  it('tidak ada dua area yang saling menindih', () => {
    // Regresi terhadap bug nyata pada peta versi lama: bantalan sentuh yang
    // saling menindih membuat ketukan pada satu bagian tercatat sebagai
    // bagian tetangganya — salah-penetapan sistematis searah, tepat pada
    // segmen berprevalensi tertinggi untuk kerja duduk.
    for (const a of AREA_SEGMEN) {
      for (const b of AREA_SEGMEN) {
        if (a.kode === b.kode) continue
        expect(beririsan(a, b), `${a.kode} menindih ${b.kode}`).toBe(false)
      }
    }
  })

  it('tidak menyisakan celah — setiap titik kanvas punya pemilik', () => {
    /**
     * Ketukan yang mendarat di gambar tetapi tidak memilih apa pun adalah
     * kegagalan paling membingungkan: responden menyimpulkan aplikasinya
     * rusak, bukan bahwa ia meleset. Karena itu area dirancang membagi HABIS
     * bingkai, bukan sekadar menempel pada anggota badan.
     */
    const tanpaPemilik: string[] = []
    for (let x = 5; x < LEBAR_KANVAS - 4; x += 4) {
      for (let y = 5; y < TINGGI_KANVAS - 4; y += 6) {
        if (!AREA_SEGMEN.some((a) => memuat(a, x, y))) {
          tanpaPemilik.push(`(${x}, ${y})`)
        }
      }
    }
    expect(
      tanpaPemilik.slice(0, 8),
      `titik tanpa pemilik (${tanpaPemilik.length})`,
    ).toEqual([])
  })

  it('setiap titik garis tubuh dimiliki sebuah area', () => {
    const tanpaPemilik: string[] = []
    for (const [x, y] of titikJalur(JALUR_TUBUH)) {
      if (!AREA_SEGMEN.some((a) => memuat(a, x, y))) {
        tanpaPemilik.push(`(${x.toFixed(0)}, ${y.toFixed(0)})`)
      }
    }
    expect(
      tanpaPemilik.slice(0, 8),
      `titik figur tanpa pemilik (${tanpaPemilik.length})`,
    ).toEqual([])
  })

  it('pasangan kiri/kanan simetris terhadap sumbu tengah figur', () => {
    /**
     * Figur tampak belakang: sisi kanan layar = sisi kanan responden. Uji ini
     * memaku hubungan itu — kalau kelak seseorang menambahkan pembalikan
     * "supaya terasa seperti bercermin", seluruh pasangan kiri/kanan akan
     * tertukar pada data dan uji ini yang lebih dulu gagal.
     */
    const tengah = LEBAR_KANVAS / 2
    const pasangan = SEGMEN_TUBUH.filter((s) => s.sisi === 'KANAN')

    for (const kanan of pasangan) {
      const kiri = SEGMEN_TUBUH.find(
        (s) => s.sisi === 'KIRI' && s.regio === kanan.regio && s.namaEn.replace('(Left)', '') === kanan.namaEn.replace('(Right)', ''),
      )
      if (!kiri) continue

      const aKanan = cariArea(kanan.kode)!
      const aKiri = cariArea(kiri.kode)!

      expect(aKanan.y, `${kanan.kode} vs ${kiri.kode}: y`).toBe(aKiri.y)
      expect(aKanan.h, `${kanan.kode} vs ${kiri.kode}: tinggi`).toBe(aKiri.h)
      expect(aKanan.w, `${kanan.kode} vs ${kiri.kode}: lebar`).toBe(aKiri.w)
      // Cerminan terhadap sumbu tengah
      expect(
        aKanan.x + aKanan.w / 2 - tengah,
        `${kanan.kode} harus di kanan sumbu`,
      ).toBeGreaterThan(0)
      expect(
        tengah - (aKiri.x + aKiri.w / 2),
        `${kiri.kode} harus di kiri sumbu`,
      ).toBeGreaterThan(0)
    }
  })
})
