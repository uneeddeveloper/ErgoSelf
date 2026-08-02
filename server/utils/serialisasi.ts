import { Prisma } from '@prisma/client'

/**
 * Prisma mengembalikan kolom Decimal sebagai objek Decimal.js, yang bila
 * di-JSON-kan menjadi string dan merepotkan di sisi klien. Helper ini
 * mengubahnya menjadi `number` biasa secara rekursif, sehingga seluruh
 * respons API konsisten bertipe angka.
 */
export function keAngka<T>(nilai: T): T {
  if (nilai instanceof Prisma.Decimal) {
    return nilai.toNumber() as unknown as T
  }
  if (nilai instanceof Date || nilai === null || typeof nilai !== 'object') {
    return nilai
  }
  if (Array.isArray(nilai)) {
    return nilai.map(keAngka) as unknown as T
  }

  const hasil: Record<string, unknown> = {}
  for (const [kunci, isi] of Object.entries(nilai as Record<string, unknown>)) {
    hasil[kunci] = keAngka(isi)
  }
  return hasil as T
}
