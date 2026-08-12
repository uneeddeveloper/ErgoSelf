/**
 * Ambang kategori risiko berbasis TERSIL EMPIRIS.
 *
 * Cornell tidak menyediakan cut-off ("for research screening purposes and not
 * for diagnostic purposes"), sehingga batas RENDAH/SEDANG/TINGGI adalah
 * keputusan analisis peneliti. Yang dipakai di sini: persentil ke-33,3 dan
 * ke-66,7 dari skor total responden penelitian.
 *
 * Fungsi murni tanpa ketergantungan database — pemanggilnya
 * (`server/api/admin/ambang.post.ts`) yang mengambil data dan menyimpan hasil.
 */

import {
  AMBANG_MIN_RESPONDEN,
  AMBANG_TOTAL_SEDANG_SEMENTARA,
  AMBANG_TOTAL_TINGGI_SEMENTARA,
  PERSENTIL_AMBANG_SEDANG,
  PERSENTIL_AMBANG_TINGGI,
} from './skala'

/**
 * Persentil dengan interpolasi linier pada rank (n − 1) × p.
 *
 * Definisi ini SENGAJA dipilih agar identik dengan `PERCENTILE.INC` di Excel
 * dan `QUANTILE(..., 7)` di R — dua alat yang paling mungkin dipakai penguji
 * untuk memverifikasi ulang angka di Bab IV dari berkas ekspor. SPSS
 * `FREQUENCIES /PERCENTILES` memakai definisi lain (rank (n + 1) × p) dan akan
 * memberi hasil sedikit berbeda pada n kecil; bila verifikasi dilakukan dengan
 * SPSS, pakai `EXAMINE /PERCENTILES(33.3, 66.7) = HAVERAGE` yang setara dengan
 * fungsi ini.
 *
 * @param nilai daftar nilai, TIDAK perlu terurut
 * @param p persentil 0–100
 */
export function persentil(nilai: readonly number[], p: number): number {
  if (nilai.length === 0) {
    throw new Error('Persentil tidak terdefinisi untuk daftar kosong')
  }
  if (!Number.isFinite(p) || p < 0 || p > 100) {
    throw new Error(`Persentil harus 0–100, diterima ${p}`)
  }

  const urut = [...nilai].sort((a, b) => a - b)
  if (urut.length === 1) return urut[0]!

  const rank = ((urut.length - 1) * p) / 100
  const bawah = Math.floor(rank)
  const sisa = rank - bawah

  if (sisa === 0) return urut[bawah]!
  return urut[bawah]! + sisa * (urut[bawah + 1]! - urut[bawah]!)
}

export interface HasilAmbangTersil {
  ambangSedang: number
  ambangTinggi: number
  /** Banyaknya skor yang dipakai menghitung */
  jumlahResponden: number
  /** `true` bila nilai berasal dari data, `false` bila masih nilai sementara */
  dariData: boolean
  /**
   * Peringatan yang harus ditampilkan ke peneliti. Kosong berarti ambang aman
   * dipakai apa adanya.
   */
  peringatan: string[]
}

function bulatkan(nilai: number): number {
  return Number(nilai.toFixed(2))
}

/**
 * Menghitung ambang tersil dari kumpulan skor total responden.
 *
 * Mengembalikan nilai SEMENTARA (lihat `skala.ts`) — bukan melempar galat —
 * bila datanya belum memadai, supaya pemanggil bisa tetap mengkategorikan
 * responden sambil menampilkan peringatannya.
 */
export function hitungAmbangTersil(
  skorTotal: readonly number[],
  minResponden: number = AMBANG_MIN_RESPONDEN,
): HasilAmbangTersil {
  const peringatan: string[] = []

  if (skorTotal.length < minResponden) {
    return {
      ambangSedang: AMBANG_TOTAL_SEDANG_SEMENTARA,
      ambangTinggi: AMBANG_TOTAL_TINGGI_SEMENTARA,
      jumlahResponden: skorTotal.length,
      dariData: false,
      peringatan: [
        `Baru ${skorTotal.length} responden menyelesaikan CMDQ, minimal ${minResponden} agar tersil stabil. Ambang sementara (${AMBANG_TOTAL_SEDANG_SEMENTARA} / ${AMBANG_TOTAL_TINGGI_SEMENTARA}) masih dipakai.`,
      ],
    }
  }

  const ambangSedang = bulatkan(persentil(skorTotal, PERSENTIL_AMBANG_SEDANG))
  const ambangTinggi = bulatkan(persentil(skorTotal, PERSENTIL_AMBANG_TINGGI))

  // Kasus yang WAJIB diperingatkan, bukan sekadar dibiarkan lewat: bila
  // sepertiga responden atau lebih berskor 0 (tidak ada keluhan sama sekali —
  // lazim pada populasi sehat), persentil ke-33,3 juga 0. Karena kategori
  // RENDAH memakai `skor <= ambangSedang`, seluruh responden tanpa keluhan
  // tetap masuk RENDAH dengan benar; yang menyesatkan adalah bila KEDUA ambang
  // bernilai sama, sebab kategori SEDANG menjadi himpunan kosong dan tabulasi
  // silang kehilangan satu kolom tanpa penjelasan.
  if (ambangSedang === ambangTinggi) {
    peringatan.push(
      `Persentil ke-33,3 dan ke-66,7 sama-sama bernilai ${ambangSedang}, sehingga kategori SEDANG tidak akan terisi sama sekali. Sebaran skor terlalu terpusat untuk dibagi tersil — pertimbangkan pembagian dua kategori (ada/tidak ada keluhan) atau cut-off per bagian tubuh.`,
    )
  } else if (ambangSedang === 0) {
    peringatan.push(
      'Persentil ke-33,3 bernilai 0: sepertiga responden atau lebih tidak melaporkan keluhan apa pun. Kategori RENDAH otomatis berisi seluruh responden tanpa keluhan — pastikan hal ini dinyatakan saat menafsirkan hasil.',
    )
  }

  return {
    ambangSedang,
    ambangTinggi,
    jumlahResponden: skorTotal.length,
    dariData: true,
    peringatan,
  }
}
