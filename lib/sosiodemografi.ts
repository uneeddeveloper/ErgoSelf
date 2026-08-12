/**
 * Pilihan variabel sosiodemografis — SUMBER KEBENARAN TUNGGAL.
 *
 * Seluruh variabel di bawah bersifat KATEGORIK: responden memilih rentang atau
 * kelompok, bukan mengetik angka/teks bebas. Konsekuensinya kolom-kolom ini
 * tersimpan sebagai VARCHAR di basis data, bukan angka — jangan pernah
 * memanggil `.toNumber()` atau membandingkannya dengan `gte`/`lte`.
 *
 * Berkas ini dibaca oleh:
 *   - `pages/profil.vue`            — menggambar tombol pilihan
 *   - `lib/validasi/responden.ts`   — menolak nilai di luar daftar
 *   - `server/utils/filter.ts`      — memvalidasi filter dasbor peneliti
 *   - `prisma/contoh.ts`            — data demo
 *
 * Mengubah isi array di sini otomatis mengubah keempatnya. JANGAN menyalin
 * daftar ini ke tempat lain: begitu ada dua salinan, form bisa menawarkan
 * pilihan yang ditolak validasi, dan responden terjebak tanpa tahu sebabnya.
 *
 * CATATAN UNTUK ANALISIS: nilai yang tersimpan adalah labelnya sendiri
 * ("23-28 Thn"), bukan kode angka. Mengubah teks label setelah pengumpulan
 * data dimulai akan memecah satu kategori menjadi dua di hasil ekspor —
 * responden lama tetap memakai teks lama. Bila label harus direvisi di tengah
 * jalan, perbarui juga baris yang sudah tersimpan lewat migrasi data.
 */

// ── Karakteristik individu ─────────────────────────────────────────────────

export const OPSI_USIA = [
  '17-22 Thn',
  '23-28 Thn',
  '29-34 Thn',
  '35-40 Thn',
  '41-46 Thn',
  '47-52 Thn',
  '> 52 Thn',
] as const

export const OPSI_JENIS_KELAMIN = [
  { nilai: 'LAKI_LAKI', label: 'Laki-laki' },
  { nilai: 'PEREMPUAN', label: 'Perempuan' },
] as const

// ── Karakteristik okupasional ──────────────────────────────────────────────
//
// DIVISI & JABATAN TIDAK LAGI DIDEFINISIKAN DI SINI.
//
// Keduanya berpindah ke tabel `divisi` & `jabatan` yang dikelola peneliti lewat
// panel admin (`/api/admin/master/...`), karena keduanya adalah satu-satunya
// variabel sosiodemografis yang isinya bergantung pada lokasi penelitian.
// Menyesuaikannya dengan struktur organisasi tempat penelitian dulu menuntut
// perubahan kode dan penerapan ulang aplikasi.
//
// Sisanya SENGAJA tetap konstanta. Rentang usia, kategori masa kerja, dan
// durasi penggunaan komputer adalah bagian dari rancangan penelitian yang
// dijustifikasi di Bab III — bukan pengaturan operasional. Membukanya lewat
// CMS berarti kategori bisa berubah di tengah pengumpulan data, dan responden
// yang mengisi sebelum dan sesudah perubahan tidak lagi sebanding.
//
// Bentuk yang dipakai form responden: `GET /api/sosiodemografi`.

/**
 * Batas panjang teks untuk nama divisi/jabatan — berlaku baik untuk entri
 * master yang diketik admin maupun teks bebas "Lainnya" yang diketik responden.
 * Keduanya masuk ke kolom VARCHAR(120) yang sama.
 */
export const MAKS_KARAKTER_SOSIODEMOGRAFI = 120

export const OPSI_MASA_KERJA = ['< 5 Thn', '> 5 Thn', '> 10 Thn'] as const

export const OPSI_DURASI_KOMPUTER = ['< 6 Jam', '> 6 Jam'] as const

// ── Opsi "Lainnya" ─────────────────────────────────────────────────────────

/**
 * Nilai penanda yang dipilih responden ketika divisi/jabatannya tidak ada di
 * daftar. Penanda ini TIDAK PERNAH tersimpan di basis data — `pages/profil.vue`
 * menggantinya dengan teks yang diketik responden sebelum dikirim.
 *
 * Alasannya analitis: kolom berisi "Lainnya" untuk 15 responden berbeda tidak
 * bisa dianalisis sama sekali, sementara "Satpam" / "Pengemudi" masih bisa
 * dikelompokkan ulang di SPSS.
 */
export const NILAI_LAINNYA = 'Lainnya'

/**
 * Menambahkan penanda "Lainnya" ke daftar yang datang dari basis data.
 *
 * Penanda selalu di posisi TERAKHIR, bukan mengikuti kolom `urutan` master:
 * ia bukan salah satu pilihan yang setara, melainkan jalan keluar bagi yang
 * tidak menemukan pilihannya.
 */
export function denganLainnya(daftar: readonly string[]): string[] {
  return [...daftar, NILAI_LAINNYA]
}

// ── Jembatan ke logika rekomendasi ─────────────────────────────────────────

/**
 * Jam representatif untuk tiap kategori durasi penggunaan komputer.
 *
 * HANYA untuk perbandingan ambang di `lib/rekomendasi.ts` — JANGAN
 * ditampilkan kepada responden. Ia memilih rentang, bukan angka pasti;
 * menuliskan "8 jam" kepada orang yang memilih "> 6 Jam" adalah mengarang
 * data. Untuk teks tampilan, pakai labelnya apa adanya.
 *
 * '> 6 Jam' dipetakan ke 8 supaya menyentuh `AMBANG_JAM_PAPARAN_PANJANG`
 * di `lib/rekomendasi.ts`. Kedua angka itu berpasangan: menaikkan ambang
 * tanpa menyesuaikan peta ini akan mematikan saran micro-break intensif
 * secara diam-diam untuk SELURUH responden.
 */
export const JAM_KOMPUTER_REPRESENTATIF: Record<string, number> = {
  '< 6 Jam': 4,
  '> 6 Jam': 8,
}

/** Mengembalikan `null` bila kategori tidak dikenali atau belum diisi. */
export function jamKomputerRepresentatif(
  kategori: string | null | undefined,
): number | null {
  if (!kategori) return null
  return JAM_KOMPUTER_REPRESENTATIF[kategori] ?? null
}

// ── Tipe ───────────────────────────────────────────────────────────────────

export type OpsiUsia = (typeof OPSI_USIA)[number]
export type OpsiMasaKerja = (typeof OPSI_MASA_KERJA)[number]
export type OpsiDurasiKomputer = (typeof OPSI_DURASI_KOMPUTER)[number]
