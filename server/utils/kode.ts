/**
 * Pembuatan kode responden unik, mis. "PTX-001".
 *
 * Kode ini sekaligus menjadi kredensial masuk responden, sehingga harus
 * unik dan mudah dibaca/diketik ulang oleh pekerja di lapangan.
 */

const PREFIKS_DEFAULT = 'PTX'
const PANJANG_URUT = 3

export function prefiksKode(): string {
  return (process.env.RESPONDEN_KODE_PREFIX || PREFIKS_DEFAULT)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Menghasilkan kode berikutnya berdasarkan nomor urut terbesar yang sudah
 * terpakai. Dipanggil di dalam retry loop pemanggilnya: bila dua responden
 * mendaftar bersamaan dan menghasilkan kode sama, constraint UNIQUE di
 * database akan menolak salah satunya dan proses diulang.
 */
export async function kodeRespondenBerikutnya(): Promise<string> {
  const prefiks = prefiksKode()

  const terakhir = await prisma.responden.findFirst({
    where: { kodeResponden: { startsWith: `${prefiks}-` } },
    orderBy: { id: 'desc' },
    select: { kodeResponden: true },
  })

  let urutBerikutnya = 1
  if (terakhir) {
    // Ambil semua kode berprefiks sama lalu cari nomor terbesar — lebih aman
    // daripada mengandalkan urutan id bila ada kode yang dihapus.
    const semua = await prisma.responden.findMany({
      where: { kodeResponden: { startsWith: `${prefiks}-` } },
      select: { kodeResponden: true },
    })

    const nomorTerbesar = semua.reduce((maks, { kodeResponden }) => {
      const cocok = /-(\d+)$/.exec(kodeResponden)
      const nomor = cocok ? Number(cocok[1]) : 0
      return nomor > maks ? nomor : maks
    }, 0)

    urutBerikutnya = nomorTerbesar + 1
  }

  return `${prefiks}-${String(urutBerikutnya).padStart(PANJANG_URUT, '0')}`
}

/** Normalisasi input kode dari responden: "  ptx-1 " → "PTX-1" */
export function normalisasiKode(kode: string): string {
  return kode.trim().toUpperCase().replace(/\s+/g, '')
}
