import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-02',
  devtools: { enabled: true },

  modules: ['nuxt-auth-utils'],

  /**
   * Tanpa blok ini `maxAge` tidak terisi, sehingga cookie tidak punya waktu
   * kedaluwarsa DAN token tersegelnya disegel dengan ttl 0 — artinya berlaku
   * selamanya. Token yang terambil dari perangkat lapangan bersama akan tetap
   * sah tanpa batas, dan karena sesi bersifat stateless ia juga tidak bisa
   * dicabut: mengganti kata sandi tidak membatalkan sesi yang sudah berjalan.
   *
   * Delapan jam menutupi satu sesi pengisian sekaligus satu shift kerja.
   */
  session: {
    maxAge: 60 * 60 * 8,
    cookie: {
      sameSite: 'lax',
    },
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'ErgoSelf — Pengukuran Mandiri Keluhan MSDs',

      /**
       * IBM Plex Sans + IBM Plex Mono.
       *
       * Dipilih karena dirancang untuk dokumentasi teknis: angkanya tabular
       * (kolom skor pada tabel rekapitulasi berbaris rapi tanpa diatur) dan
       * bentuk hurufnya tegas pada ukuran 12–13px, ukuran kerja panel peneliti.
       * Varian mono dipakai untuk kode responden dan angka — pembeda yang
       * membuat "PTX-001" dan "1620" terbaca sebagai data, bukan kalimat.
       *
       * `display=swap` dan tumpukan cadangan di `main.css` disengaja: aplikasi
       * responden diisi di lapangan dengan jaringan seadanya, dan halamannya
       * harus tetap terbaca meski berkas font tidak pernah sampai.
       */
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
        },
      ],

      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Instrumen digital Cornell Musculoskeletal Discomfort Questionnaire (CMDQ) untuk pengukuran mandiri keluhan musculoskeletal pada pengguna komputer.',
        },
      ],
    },
  },
})
