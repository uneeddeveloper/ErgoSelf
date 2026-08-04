/**
 * Palet grafik dashboard.
 *
 * Warna mengikuti tema "klinik sage" (hijau hutan #1c4c3b sebagai warna
 * merek), tetapi warna status "sedang" SENGAJA BERBEDA dari warna lencana
 * pada UI.
 *
 * Alasannya: amber lencana (#a8680f) dan merah risiko (#cf4436) hanya
 * terpisah ΔE 3,7 pada penglihatan deuteranopia — artinya batang "Sedang"
 * dan "Tinggi" praktis tidak bisa dibedakan pada grafik. Pada lencana hal ini
 * tidak menjadi masalah karena selalu disertai tulisan ("RISIKO SEDANG"),
 * tetapi pada grafik warna adalah satu-satunya pembeda antar-batang.
 *
 * #ca8a04 dipertahankan dan diukur ulang terhadap merah tema yang baru
 * (ΔE2000, simulasi deutan Viénot–Brettel–Mollon):
 *   deutan ΔE 11,7 · penglihatan normal ΔE 31,6 · kontras 2,94:1
 * Kontras di bawah 3:1 dikompensasi dengan label sumbu dan label nilai yang
 * selalu tampak, serta tabel rekapitulasi di bawah grafik.
 */

export const WARNA = {
  /** Warna tunggal untuk grafik satu seri (magnitudo) */
  utama: '#1c4c3b',
  utamaRedup: '#a9c9b8',

  /** Status risiko — hanya untuk grafik; UI memakai token CSS */
  risiko: {
    RENDAH: '#1c4c3b',
    SEDANG: '#ca8a04',
    TINGGI: '#cf4436',
  },

  /** Elemen bantu grafik */
  grid: '#dbe4dd',
  sumbu: '#97a69e',
  teks: '#33443c',
  teksRedup: '#6b7c74',
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
