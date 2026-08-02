import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-02',
  devtools: { enabled: true },

  modules: ['nuxt-auth-utils'],

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
