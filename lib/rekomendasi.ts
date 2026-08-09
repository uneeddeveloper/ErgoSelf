/**
 * Penyusun rekomendasi ergonomi praktis untuk laporan akhir responden.
 *
 * Rekomendasi dipilih berdasarkan REGIO tubuh yang benar-benar dikeluhkan,
 * bukan sekadar teks generik — sehingga responden menerima saran yang
 * relevan dengan keluhannya sendiri.
 *
 * Substansi saran mengacu pada pedoman penataan stasiun kerja komputer yang
 * lazim dipakai di literatur ergonomi kantor (a.l. OSHA Computer Workstation
 * eTool dan Cornell University Ergonomics Web).
 *
 * >>> Sebelum dipakai di lapangan, mintakan verifikasi isi saran ini kepada
 *     pembimbing atau tenaga kesehatan kerja di perusahaan. <<<
 *
 * Fungsi di file ini murni supaya bisa di-unit test tanpa database.
 */

import type { RegioTubuh } from './cmdq/segmen'
import {
  AMBANG_RUJUKAN_JUMLAH_SEGMEN_BERAT,
  AMBANG_RUJUKAN_SKOR_SEGMEN,
  type KategoriRisiko,
} from './cmdq/skala'
import type { KategoriImt } from './imt'

/**
 * Batas jam kerja komputer per hari yang memicu saran micro-break lebih
 * sering. Berpasangan dengan `JAM_KOMPUTER_REPRESENTATIF` di
 * `lib/sosiodemografi.ts` — lihat catatan di sana sebelum mengubahnya.
 */
export const AMBANG_JAM_PAPARAN_PANJANG = 8

export interface Rekomendasi {
  ikon: string
  judul: string
  isi: string
  /** Alasan saran ini muncul — membantu responden memahami relevansinya */
  pemicu: string
}

export interface MasukanRekomendasi {
  kategoriRisiko: KategoriRisiko
  /** Regio yang punya minimal satu segmen berkeluhan */
  regioBermasalah: readonly RegioTubuh[]
  /**
   * Jam representatif untuk perbandingan ambang. Responden memilih KATEGORI
   * ("< 6 Jam" / "> 6 Jam"), jadi angka ini adalah hasil pemetaan lewat
   * `jamKomputerRepresentatif()`, bukan jawaban harfiah responden.
   */
  durasiKomputerJamPerHari?: number | null
  /**
   * Label kategori yang benar-benar dipilih responden. Dipakai untuk teks
   * saran supaya ia membaca ulang pilihannya sendiri, bukan angka hasil
   * pemetaan yang tidak pernah ia isi.
   */
  durasiKomputerLabel?: string | null
  kategoriImt?: KategoriImt | null
  olahraga?: boolean | null
  /**
   * Skor segmen tertinggi (0–27). Dipakai memicu rujukan tenaga kesehatan
   * tanpa melewati kategori risiko total — lihat `perluRujukan()`.
   */
  skorSegmenTertinggi?: number | null
  /**
   * Banyaknya segmen yang sangat tidak nyaman (ketidaknyamanan = 3) sekaligus
   * mengganggu pekerjaan (gangguan ≥ 2).
   */
  jumlahSegmenBerat?: number | null
}

/**
 * Apakah responden perlu diarahkan ke petugas K3 / tenaga kesehatan.
 *
 * Sengaja TIDAK memakai `kategoriRisiko` sebagai satu-satunya pemicu. Skor
 * total menjumlahkan 28 segmen, sehingga responden dengan nyeri berat pada
 * beberapa bagian tubuh tetap berkategori RENDAH — dan tanpa aturan di bawah
 * ia tidak akan pernah disarankan mencari pertolongan.
 *
 * Diekspor supaya dapat diuji langsung dan dipakai ulang di luar penyusunan
 * rekomendasi (mis. penandaan pada dasbor peneliti).
 */
export function perluRujukan(masukan: MasukanRekomendasi): boolean {
  if (masukan.kategoriRisiko === 'TINGGI') return true
  if ((masukan.skorSegmenTertinggi ?? 0) >= AMBANG_RUJUKAN_SKOR_SEGMEN) return true
  return (
    (masukan.jumlahSegmenBerat ?? 0) >= AMBANG_RUJUKAN_JUMLAH_SEGMEN_BERAT
  )
}

const SARAN_PER_REGIO: Record<RegioTubuh, Rekomendasi> = {
  LEHER: {
    ikon: '🖥',
    judul: 'Atur Tinggi Monitor',
    isi: 'Posisikan tepi atas layar sejajar atau sedikit di bawah garis mata, berjarak sekitar satu lengan. Monitor yang terlalu rendah memaksa leher menunduk sepanjang hari.',
    pemicu: 'Anda melaporkan keluhan pada leher',
  },
  BAHU: {
    ikon: '💺',
    judul: 'Sesuaikan Sandaran Tangan',
    isi: 'Turunkan sandaran tangan kursi atau meja sehingga bahu Anda rileks, tidak terangkat. Siku sebaiknya membentuk sudut sekitar 90° saat mengetik.',
    pemicu: 'Anda melaporkan keluhan pada bahu',
  },
  PUNGGUNG_PINGGANG: {
    ikon: '🪑',
    judul: 'Penyesuaian Kursi',
    isi: 'Pastikan sandaran kursi menopang lengkung alami punggung bawah (lumbar). Bila sandaran kurang menonjol, tambahkan bantal kecil setinggi pinggang.',
    pemicu: 'Anda melaporkan keluhan pada punggung atau pinggang',
  },
  EKSTREMITAS_ATAS: {
    ikon: '⌨️',
    judul: 'Posisi Papan Tik & Tetikus',
    isi: 'Letakkan papan tik dan tetikus sejajar dan cukup dekat sehingga pergelangan tangan tetap lurus, tidak menekuk ke atas. Hindari menumpu pergelangan pada tepi meja yang tajam.',
    pemicu: 'Anda melaporkan keluhan pada lengan, siku, pergelangan, atau tangan',
  },
  EKSTREMITAS_BAWAH: {
    ikon: '🦵',
    judul: 'Topangan Kaki & Sirkulasi',
    isi: 'Pastikan telapak kaki menapak penuh di lantai; bila menggantung, gunakan penopang kaki. Ubah posisi kaki secara berkala agar peredaran darah lancar.',
    pemicu: 'Anda melaporkan keluhan pada paha, lutut, betis, atau kaki',
  },
}

/**
 * Menyusun daftar rekomendasi, urut dari yang paling relevan.
 * Selalu diakhiri saran micro-break dan asesmen ulang.
 */
export function susunRekomendasi(masukan: MasukanRekomendasi): Rekomendasi[] {
  const hasil: Rekomendasi[] = []

  // 1. Saran spesifik sesuai regio yang dikeluhkan
  const urutanRegio: RegioTubuh[] = [
    'LEHER',
    'BAHU',
    'PUNGGUNG_PINGGANG',
    'EKSTREMITAS_ATAS',
    'EKSTREMITAS_BAWAH',
  ]
  for (const regio of urutanRegio) {
    if (masukan.regioBermasalah.includes(regio)) hasil.push(SARAN_PER_REGIO[regio])
  }

  // 2. Micro-break — selalu ada, tetapi frekuensinya menyesuaikan durasi kerja
  const jam = masukan.durasiKomputerJamPerHari ?? 0
  const paparanPanjang = jam >= AMBANG_JAM_PAPARAN_PANJANG
  // Sebut ulang pilihan responden apa adanya ("> 6 Jam"); `${jam} jam` hanya
  // dipakai bila pemanggil memang punya angka harfiah — lihat catatan pada
  // `durasiKomputerLabel`.
  const sebutanDurasi = masukan.durasiKomputerLabel ?? `${jam} jam`
  hasil.push({
    ikon: '⏱',
    judul: 'Micro-breaks',
    isi: paparanPanjang
      ? `Anda bekerja di depan komputer ${sebutanDurasi} sehari. ` +
        'Lakukan peregangan singkat 2–3 menit setiap 45 menit, dan berdiri sejenak setiap 2 jam.'
      : 'Lakukan peregangan singkat 2–3 menit setiap 60 menit bekerja untuk merilekskan otot leher dan bahu.',
    pemicu: paparanPanjang
      ? `Durasi penggunaan komputer Anda ${sebutanDurasi} per hari`
      : 'Berlaku untuk semua pengguna komputer',
  })

  // 3. Aktivitas fisik — hanya bila responden menyatakan tidak berolahraga
  if (masukan.olahraga === false) {
    hasil.push({
      ikon: '🏃',
      judul: 'Mulai Aktivitas Fisik Ringan',
      isi: 'Anda menyatakan belum rutin berolahraga. Aktivitas ringan 2–3 kali seminggu (jalan cepat 30 menit) dapat membantu mengurangi keluhan otot dan rangka pada pekerja kantor.',
      pemicu: 'Anda menyatakan tidak rutin berolahraga',
    })
  }

  // 4. Berat badan — hanya untuk kategori yang menambah beban muskuloskeletal
  if (
    masukan.kategoriImt === 'OBESITAS' ||
    masukan.kategoriImt === 'GEMUK_RINGAN'
  ) {
    hasil.push({
      ikon: '⚖️',
      judul: 'Perhatikan Berat Badan',
      isi: 'Indeks Massa Tubuh Anda berada di atas rentang normal. Kelebihan berat badan menambah beban pada pinggang, lutut, dan kaki saat duduk maupun berdiri lama.',
      pemicu: 'Kategori IMT Anda di atas normal',
    })
  }

  // 5. Rujukan tenaga kesehatan — dipicu dari data segmen, bukan dari kategori
  //    risiko total. Lihat `perluRujukan()` untuk alasannya.
  const rujukan = perluRujukan(masukan)
  if (rujukan) {
    hasil.push({
      ikon: '🩺',
      judul: 'Konsultasi Petugas K3',
      isi: 'Ada bagian tubuh yang Anda laporkan terasa berat dan mengganggu pekerjaan. Sebaiknya hubungi petugas K3 atau tenaga kesehatan di perusahaan untuk pemeriksaan lebih lanjut dan penyesuaian stasiun kerja.',
      pemicu:
        masukan.kategoriRisiko === 'TINGGI'
          ? 'Skor CMDQ Anda masuk kategori risiko tinggi'
          : 'Terdapat keluhan berat pada satu atau beberapa bagian tubuh',
    })
  }

  // 6. Asesmen ulang — penutup untuk semua responden. Intervalnya mengikuti
  //    kebutuhan rujukan, bukan kategori risiko, supaya responden berkeluhan
  //    berat tidak diminta menunggu 3 bulan hanya karena skor totalnya rendah.
  hasil.push({
    ikon: '📅',
    judul: 'Asesmen Ulang',
    isi:
      rujukan || masukan.kategoriRisiko !== 'RENDAH'
        ? 'Jadwalkan asesmen ulang dalam 1 bulan setelah melakukan perbaikan di atas, untuk melihat apakah keluhan berkurang.'
        : 'Jadwalkan asesmen ulang dalam 3 bulan untuk memantau perubahan kondisi otot dan rangka Anda.',
    pemicu: 'Pemantauan berkala',
  })

  return hasil
}
