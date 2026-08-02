/**
 * Palet grafik dashboard.
 *
 * Warna diambil dari desain (teal #0d9488 sebagai warna merek), tetapi warna
 * status "sedang" SENGAJA BERBEDA dari warna lencana pada UI.
 *
 * Alasannya: amber desain (#b45309) dan merah (#dc2626) hanya terpisah
 * ΔE 2,8 pada penglihatan deuteranopia dan ΔE 9,9 pada penglihatan normal —
 * artinya batang "Sedang" dan "Tinggi" praktis tidak bisa dibedakan pada
 * grafik. Pada lencana hal ini tidak menjadi masalah karena selalu disertai
 * tulisan ("RISIKO SEDANG"), tetapi pada grafik warna adalah satu-satunya
 * pembeda antar-batang.
 *
 * #ca8a04 diverifikasi dengan validator palet:
 *   CVD ΔE 10,0 (deutan) · penglihatan normal ΔE 19,2 · kontras 2,86:1
 * Kontras di bawah 3:1 dikompensasi dengan label sumbu dan label nilai yang
 * selalu tampak, serta tabel rekapitulasi di bawah grafik.
 */

export const WARNA = {
  /** Warna tunggal untuk grafik satu seri (magnitudo) */
  utama: '#0d9488',
  utamaRedup: '#99d5cf',

  /** Status risiko — hanya untuk grafik; UI memakai token CSS */
  risiko: {
    RENDAH: '#0d9488',
    SEDANG: '#ca8a04',
    TINGGI: '#dc2626',
  },

  /** Elemen bantu grafik */
  grid: '#e5e7eb',
  sumbu: '#9ca3af',
  teks: '#374151',
  teksRedup: '#6b7280',
  permukaan: '#ffffff',
} as const

/** Pengaturan bersama seluruh grafik: sumbu & kisi yang tidak dominan. */
export const GAYA_GRAFIK = {
  /** Ujung batang membulat 4px, hanya di sisi data */
  radiusBatang: 4,
  /** Sisakan celah 2px antar batang */
  tebalKategori: 0.86,
  tebalBatang: 0.92,
} as const
