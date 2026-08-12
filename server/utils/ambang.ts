import {
  AMBANG_TOTAL_SEDANG_SEMENTARA,
  AMBANG_TOTAL_TINGGI_SEMENTARA,
} from '~~/lib/cmdq/skala'
import {
  AMBANG_CHDQ_SEDANG_SEMENTARA,
  AMBANG_CHDQ_TINGGI_SEMENTARA,
} from '~~/lib/chdq/skala'

/**
 * Pembacaan ambang kategori risiko yang berlaku.
 *
 * Ambang tidak lagi berupa konstanta di dalam kode: Cornell tidak menyediakan
 * cut-off, sehingga batasnya dihitung dari tersil skor responden penelitian
 * dan disimpan di tabel `ambang_risiko` (lihat `lib/cmdq/ambang.ts`).
 *
 * Setiap perhitungan hasil WAJIB lewat sini, bukan mengimpor konstanta
 * sementara langsung. Kalau satu jalur memakai nilai sementara sementara yang
 * lain memakai tersil, dua responden dengan skor sama bisa berakhir di
 * kategori berbeda hanya karena melewati endpoint yang berbeda.
 */

export type InstrumenAmbang = 'CMDQ' | 'CHDQ'

export interface AmbangBerlaku {
  ambangSedang: number
  ambangTinggi: number
  /** `false` bila masih nilai sementara — dipakai dasbor untuk memperingatkan */
  dariData: boolean
  jumlahResponden: number
  catatan: string | null
}

const SEMENTARA: Record<InstrumenAmbang, { sedang: number; tinggi: number }> = {
  CMDQ: {
    sedang: AMBANG_TOTAL_SEDANG_SEMENTARA,
    tinggi: AMBANG_TOTAL_TINGGI_SEMENTARA,
  },
  CHDQ: {
    sedang: AMBANG_CHDQ_SEDANG_SEMENTARA,
    tinggi: AMBANG_CHDQ_TINGGI_SEMENTARA,
  },
}

export async function bacaAmbang(
  instrumen: InstrumenAmbang,
): Promise<AmbangBerlaku> {
  const baris = await prisma.ambangRisiko.findUnique({ where: { instrumen } })

  // Baris seharusnya selalu ada (dibuat oleh seed), tetapi jangan sampai
  // responden gagal menyimpan jawabannya hanya karena seed belum dijalankan.
  if (!baris) {
    const bawaan = SEMENTARA[instrumen]
    return {
      ambangSedang: bawaan.sedang,
      ambangTinggi: bawaan.tinggi,
      dariData: false,
      jumlahResponden: 0,
      catatan:
        'Baris ambang belum ada di basis data — nilai sementara dipakai. Jalankan `npm run db:seed`.',
    }
  }

  return {
    ambangSedang: baris.ambangSedang.toNumber(),
    ambangTinggi: baris.ambangTinggi.toNumber(),
    dariData: baris.dariData,
    jumlahResponden: baris.jumlahResponden,
    catatan: baris.catatan,
  }
}
