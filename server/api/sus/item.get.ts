import { ITEM_SUS, SKALA_SUS } from '~~/lib/sus/item'
import { TARGET_SUS } from '~~/lib/sus/skoring'

/**
 * GET /api/sus/item — daftar 10 pernyataan SUS + skala Likert.
 * Disajikan dari server agar teks instrumen hanya punya satu sumber
 * kebenaran (`lib/sus/item.ts`).
 */
export default defineEventHandler(() => ({
  item: ITEM_SUS.map(({ nomor, pernyataan, nada }) => ({
    nomor,
    pernyataan,
    nada,
  })),
  skala: SKALA_SUS,
  target: TARGET_SUS,
}))
