import type { Ref } from 'vue'

/**
 * Menyimpan jawaban kuesioner yang sedang diisi ke penyimpanan peramban.
 *
 * Tanpa ini, jawaban hanya hidup di dalam komponen. Kuesioner keluhan tubuh
 * bisa memuat sampai 84 pilihan dan memakan 10–15 menit, sementara navigasi
 * bawah selalu terlihat selama pengisian. Satu salah ketuk, satu gestur
 * kembali, atau satu telepon masuk yang menggusur tab peramban di ponsel
 * kelas menengah sudah cukup untuk menghapus semuanya tanpa jejak. Responden
 * yang kehilangan pekerjaan sebanyak itu tidak mengulang — ia berhenti, dan
 * kasusnya hilang dari penelitian.
 *
 * Draf dikunci per `kodeResponden`. Perangkat lapangan lazim dipakai bergantian
 * oleh beberapa responden; tanpa kunci itu, jawaban orang sebelumnya bisa
 * terbawa dan terkirim atas nama orang berikutnya.
 */

const PREFIKS = 'ergoself:draf'

/** Draf lebih tua dari ini dianggap basi dan dibuang saat dipulihkan. */
const UMUR_MAKS_MS = 24 * 60 * 60 * 1000

interface Amplop<T> {
  disimpanPada: number
  isi: T
}

export function useDrafJawaban<T>(namaFormulir: string, jawaban: Ref<T>) {
  const { user } = useUserSession()

  function kunci(): string | null {
    const kode = user.value?.kodeResponden
    return kode ? `${PREFIKS}:${namaFormulir}:${kode}` : null
  }

  function bersihkan(): void {
    if (!import.meta.client) return
    const k = kunci()
    if (k) localStorage.removeItem(k)
  }

  /**
   * Memulihkan draf. Dipanggil SECARA SINKRON di `setup`, sebelum pengamat
   * data server dipasang — supaya pengamat itu bisa melihat bahwa sudah ada
   * isi lokal dan tidak menimpanya.
   *
   * @returns true bila ada draf yang berhasil dipulihkan
   */
  function pulihkan(): boolean {
    if (!import.meta.client) return false
    const k = kunci()
    if (!k) return false

    try {
      const mentah = localStorage.getItem(k)
      if (!mentah) return false

      const amplop = JSON.parse(mentah) as Amplop<T>
      if (
        typeof amplop?.disimpanPada !== 'number' ||
        Date.now() - amplop.disimpanPada > UMUR_MAKS_MS
      ) {
        localStorage.removeItem(k)
        return false
      }

      jawaban.value = amplop.isi
      return true
    } catch {
      // Draf rusak atau tidak bisa diurai — buang, jangan sampai menghalangi.
      bersihkan()
      return false
    }
  }

  /** Mulai menyimpan setiap perubahan. */
  function pantau(): void {
    if (!import.meta.client) return
    watch(
      jawaban,
      (nilai) => {
        const k = kunci()
        if (!k) return
        try {
          localStorage.setItem(
            k,
            JSON.stringify({ disimpanPada: Date.now(), isi: nilai } satisfies Amplop<T>),
          )
        } catch {
          // Kuota penuh atau mode penyamaran. Draf memang bonus, bukan syarat;
          // kegagalan menyimpan tidak boleh mengganggu pengisian.
        }
      },
      { deep: true },
    )
  }

  return { pulihkan, pantau, bersihkan }
}
