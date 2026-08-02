import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Hanya menguji logika murni di `lib/` — tidak memerlukan Nuxt/DOM,
    // sehingga eksekusi cepat dan bebas dari ketergantungan database.
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
