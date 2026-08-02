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
import type { KategoriRisiko } from './cmdq/skala'
import type { KategoriImt } from './imt'

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
  durasiKomputerJamPerHari?: number | null
  kategoriImt?: KategoriImt | null
  olahraga?: boolean | null
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
  hasil.push({
    ikon: '⏱',
    judul: 'Micro-breaks',
    isi:
      jam >= 8
        ? 'Anda bekerja di depan komputer ' +
          `${jam} jam sehari. Lakukan peregangan singkat 2–3 menit setiap 45 menit, dan berdiri sejenak setiap 2 jam.`
        : 'Lakukan peregangan singkat 2–3 menit setiap 60 menit bekerja untuk merilekskan otot leher dan bahu.',
    pemicu:
      jam >= 8
        ? `Durasi penggunaan komputer Anda ${jam} jam per hari`
        : 'Berlaku untuk semua pengguna komputer',
  })

  // 3. Aktivitas fisik — hanya bila responden menyatakan tidak berolahraga
  if (masukan.olahraga === false) {
    hasil.push({
      ikon: '🏃',
      judul: 'Mulai Aktivitas Fisik Ringan',
      isi: 'Anda menyatakan belum rutin berolahraga. Aktivitas ringan 2–3 kali seminggu (jalan cepat 30 menit) terbukti menurunkan keluhan otot dan rangka pada pekerja kantor.',
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

  // 5. Rujukan — hanya untuk risiko tinggi
  if (masukan.kategoriRisiko === 'TINGGI') {
    hasil.push({
      ikon: '🩺',
      judul: 'Konsultasi Petugas K3',
      isi: 'Tingkat keluhan Anda tergolong tinggi. Segera hubungi petugas K3 atau tenaga kesehatan di perusahaan untuk pemeriksaan lebih lanjut dan penyesuaian stasiun kerja.',
      pemicu: 'Skor CMDQ Anda masuk kategori risiko tinggi',
    })
  }

  // 6. Asesmen ulang — penutup untuk semua responden
  hasil.push({
    ikon: '📅',
    judul: 'Asesmen Ulang',
    isi:
      masukan.kategoriRisiko === 'RENDAH'
        ? 'Jadwalkan asesmen ulang dalam 3 bulan untuk memantau perubahan kondisi otot dan rangka Anda.'
        : 'Jadwalkan asesmen ulang dalam 1 bulan setelah melakukan perbaikan di atas, untuk melihat apakah keluhan berkurang.',
    pemicu: 'Pemantauan berkala',
  })

  return hasil
}
