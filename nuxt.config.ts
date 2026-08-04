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
