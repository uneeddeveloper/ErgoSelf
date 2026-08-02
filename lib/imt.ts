/**
 * Perhitungan & klasifikasi Indeks Massa Tubuh (IMT).
 *
 * Rumus:  IMT = berat (kg) / tinggi (m)²
 *
 * Klasifikasi mengikuti ambang batas IMT untuk orang Indonesia,
 * Kementerian Kesehatan RI (Depkes RI, 2003):
 *
 *   < 17,0          Kurus — kekurangan berat badan tingkat berat
 *   17,0 – < 18,5   Kurus — kekurangan berat badan tingkat ringan
 *   18,5 – 25,0     Normal
 *   > 25,0 – 27,0   Gemuk — kelebihan berat badan tingkat ringan
 *   > 27,0          Obesitas
 *
 * Fungsi di file ini murni (tanpa efek samping) supaya bisa di-unit test
 * dan dipakai baik di sisi klien (pratinjau langsung di form) maupun di
 * sisi server (nilai yang benar-benar disimpan ke database).
 */

export type KategoriImt =
  | 'KURUS_BERAT'
  | 'KURUS_RINGAN'
  | 'NORMAL'
  | 'GEMUK_RINGAN'
  | 'OBESITAS'

export interface HasilImt {
  /** IMT dibulatkan 2 angka di belakang koma */
  imt: number
  kategori: KategoriImt
  /** Label lengkap sesuai tabel Kemenkes */
  label: string
  /** Label ringkas untuk badge di UI */
  labelSingkat: string
}

export const BATAS_TINGGI_CM = { min: 100, maks: 250 } as const
export const BATAS_BERAT_KG = { min: 25, maks: 250 } as const

export const LABEL_KATEGORI_IMT: Record<KategoriImt, string> = {
  KURUS_BERAT: 'Kurus (kekurangan berat badan tingkat berat)',
  KURUS_RINGAN: 'Kurus (kekurangan berat badan tingkat ringan)',
  NORMAL: 'Normal',
  GEMUK_RINGAN: 'Gemuk (kelebihan berat badan tingkat ringan)',
  OBESITAS: 'Obesitas',
}

export const LABEL_SINGKAT_KATEGORI_IMT: Record<KategoriImt, string> = {
  KURUS_BERAT: 'Kurus berat',
  KURUS_RINGAN: 'Kurus ringan',
  NORMAL: 'Normal',
  GEMUK_RINGAN: 'Gemuk ringan',
  OBESITAS: 'Obesitas',
}

/** Urutan tampil pada grafik & filter dashboard */
export const URUTAN_KATEGORI_IMT: readonly KategoriImt[] = [
  'KURUS_BERAT',
  'KURUS_RINGAN',
  'NORMAL',
  'GEMUK_RINGAN',
  'OBESITAS',
] as const

function bulatkanDuaDesimal(nilai: number): number {
  return Number(nilai.toFixed(2))
}

/**
 * Menghitung IMT dari berat (kg) dan tinggi (cm).
 * Hasil dibulatkan ke 2 angka di belakang koma — nilai bulat inilah yang
 * disimpan ke database dan dipakai untuk klasifikasi, agar angka yang
 * ditampilkan ke responden selalu konsisten dengan kategorinya.
 *
 * @throws {RangeError} bila tinggi/berat bukan angka wajar
 */
export function hitungImt(beratKg: number, tinggiCm: number): number {
  if (!Number.isFinite(beratKg) || !Number.isFinite(tinggiCm)) {
    throw new RangeError('Berat dan tinggi badan harus berupa angka')
  }
  if (tinggiCm < BATAS_TINGGI_CM.min || tinggiCm > BATAS_TINGGI_CM.maks) {
    throw new RangeError(
      `Tinggi badan harus antara ${BATAS_TINGGI_CM.min}–${BATAS_TINGGI_CM.maks} cm`,
    )
  }
  if (beratKg < BATAS_BERAT_KG.min || beratKg > BATAS_BERAT_KG.maks) {
    throw new RangeError(
      `Berat badan harus antara ${BATAS_BERAT_KG.min}–${BATAS_BERAT_KG.maks} kg`,
    )
  }

  const tinggiMeter = tinggiCm / 100
  return bulatkanDuaDesimal(beratKg / (tinggiMeter * tinggiMeter))
}

/**
 * Mengklasifikasikan nilai IMT ke kategori Kemenkes RI.
 *
 * Perhatikan batas yang inklusif/eksklusif: IMT tepat 25,00 masih NORMAL,
 * dan tepat 27,00 masih GEMUK_RINGAN.
 */
export function kategorikanImt(imt: number): KategoriImt {
  if (!Number.isFinite(imt)) {
    throw new RangeError('Nilai IMT harus berupa angka')
  }
  if (imt < 17.0) return 'KURUS_BERAT'
  if (imt < 18.5) return 'KURUS_RINGAN'
  if (imt <= 25.0) return 'NORMAL'
  if (imt <= 27.0) return 'GEMUK_RINGAN'
  return 'OBESITAS'
}

/** Gabungan hitung + klasifikasi + label siap tampil. */
export function evaluasiImt(beratKg: number, tinggiCm: number): HasilImt {
  const imt = hitungImt(beratKg, tinggiCm)
  const kategori = kategorikanImt(imt)

  return {
    imt,
    kategori,
    label: LABEL_KATEGORI_IMT[kategori],
    labelSingkat: LABEL_SINGKAT_KATEGORI_IMT[kategori],
  }
}
