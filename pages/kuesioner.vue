<script setup lang="ts">
import { nomorTahap } from '~~/lib/alur'
import {
  LABEL_REGIO,
  SEGMEN_TUBUH,
  cariSegmen,
  type RegioTubuh,
} from '~~/lib/cmdq/segmen'
import { SKOR_SEGMEN_MAKS } from '~~/lib/cmdq/skala'
import { hitungSkorSegmen, kategorikanSkorSegmen } from '~~/lib/cmdq/skoring'

/**
 * Modul 2 — Kuesioner keluhan tubuh (peta tubuh 18 item CMDQ).
 *
 * Responden hanya perlu menandai bagian yang terasa nyeri. Saat dikirim,
 * seluruh 18 item tetap dilengkapi: bagian yang tidak ditandai otomatis
 * dikirim sebagai "tidak pernah" (frekuensi 0), sesuai aturan kelengkapan
 * instrumen yang divalidasi di server.
 */
definePageMeta({ middleware: 'responden' })
useHead({ title: 'Peta Keluhan Tubuh — ErgoSelf' })

interface JawabanSegmen {
  frekuensiKode: number
  ketidaknyamananSkor: number | null
  gangguanSkor: number | null
}

const jawaban = ref<Record<string, JawabanSegmen>>({})
const segmenAktif = ref<string | null>(null)
const detailSegmenAktif = computed(() =>
  segmenAktif.value ? cariSegmen(segmenAktif.value) : undefined,
)
const mengirim = ref(false)
const galatKirim = ref('')
const terkirim = ref(false)

// Draf lokal dipulihkan LEBIH DAHULU, sebelum data server diminta. Urutannya
// penting — lihat pengamat `tersimpan` di bawah.
const draf = useDrafJawaban('cmdq', jawaban)
draf.pulihkan()
draf.pantau()

// Muat jawaban sebelumnya bila responden ingin mengoreksi.
const { data: tersimpan } = await useFetch('/api/cmdq/saya', {
  server: false,
  // 404 wajar untuk responden yang belum pernah mengisi
  onResponseError: () => {},
})

watch(
  tersimpan,
  (nilai) => {
    if (!nilai?.perSegmen) return

    // JANGAN menimpa jawaban yang sudah ada di layar. Permintaan di atas tidak
    // memblokir hidrasi, jadi halaman sudah bisa diketuk sebelum jawabannya
    // tiba. Sebelum penjaga ini ada, responden yang menandai satu bagian dalam
    // jeda tersebut kehilangan tandanya secara diam-diam — tertimpa keadaan
    // server yang mungkin kosong.
    if (Object.keys(jawaban.value).length > 0) return

    const hasil: Record<string, JawabanSegmen> = {}
    for (const s of nilai.perSegmen) {
      // Hanya segmen berkeluhan yang perlu tampil sebagai "sudah ditandai"
      if (s.frekuensiKode > 0) {
        hasil[s.kodeSegmen] = {
          frekuensiKode: s.frekuensiKode,
          ketidaknyamananSkor: s.ketidaknyamananSkor,
          gangguanSkor: s.gangguanSkor,
        }
      }
    }
    jawaban.value = hasil
  },
  { immediate: true },
)

// Peringatan sebelum meninggalkan halaman. Navigasi bawah menampilkan empat
// tautan lain tepat di bawah ibu jari sepanjang pengisian; tanpa penjaga ini
// satu ketukan salah membuang seluruh jawaban.
onBeforeRouteLeave(() => {
  if (terkirim.value || Object.keys(jawaban.value).length === 0) return true
  return window.confirm(
    'Jawaban Anda belum dikirim. Tinggalkan halaman ini? Jawaban tetap tersimpan di perangkat ini.',
  )
})

/** Skor tiap segmen untuk mewarnai peta tubuh. */
const skorPerSegmen = computed(() => {
  const hasil: Record<string, number> = {}
  for (const [kode, j] of Object.entries(jawaban.value)) {
    try {
      hasil[kode] = hitungSkorSegmen(
        j.frekuensiKode,
        j.ketidaknyamananSkor,
        j.gangguanSkor,
      )
    } catch {
      hasil[kode] = 0
    }
  }
  return hasil
})

/** Daftar bagian yang sudah ditandai, urut skor tertinggi. */
const daftarDitandai = computed(() =>
  Object.entries(jawaban.value)
    .map(([kode, j]) => {
      const segmen = SEGMEN_TUBUH.find((s) => s.kode === kode)!
      const skor = skorPerSegmen.value[kode] ?? 0
      return { kode, nama: segmen.nama, urutan: segmen.urutan, j, skor }
    })
    .sort((a, b) => b.skor - a.skor || a.urutan - b.urutan),
)

/**
 * Daftar seluruh 18 item, dikelompokkan per regio — jalur pilih alternatif.
 *
 * Peta tubuh bukan satu-satunya cara menandai keluhan, dan tidak boleh menjadi
 * satu-satunya. Pada layar 360px area terkecil hanya sekitar 20×10 piksel;
 * responden yang jarinya kurang presisi, memakai papan tik, atau memakai
 * pembaca layar harus tetap bisa melaporkan keluhannya dengan andal.
 */
// TERBUKA secara bawaan. Figur Cornell berperbandingan ±1:3, jadi pada ponsel
// ia setinggi ±800px: responden yang menggulir melewatinya akan tiba di daftar
// ini dalam keadaan tertutup, lalu mengira satu-satunya cara mengisi adalah
// mengetuk gambar yang baru saja ia lewati.
const daftarTerbuka = ref(true)

const segmenPerRegio = computed(() => {
  const urutan: RegioTubuh[] = [
    'LEHER',
    'BAHU',
    'PUNGGUNG_PINGGANG',
    'EKSTREMITAS_ATAS',
    'EKSTREMITAS_BAWAH',
  ]
  return urutan.map((regio) => ({
    regio,
    label: LABEL_REGIO[regio],
    segmen: SEGMEN_TUBUH.filter((s) => s.regio === regio),
  }))
})

function gayaSkor(skor: number) {
  const k = kategorikanSkorSegmen(skor)
  return k === 'TINGGI'
    ? 'bg-risiko-tinggi-bg text-risiko-tinggi-teks'
    : k === 'SEDANG'
      ? 'bg-risiko-sedang-bg text-risiko-sedang'
      : k === 'RENDAH'
        ? 'bg-risiko-rendah-bg text-risiko-rendah'
        : 'bg-panel text-ink-600'
}

function simpanSegmen(nilai: JawabanSegmen) {
  if (!segmenAktif.value) return
  if (nilai.frekuensiKode === 0) {
    // "Tidak pernah" = sama saja dengan tidak ditandai
    delete jawaban.value[segmenAktif.value]
  } else {
    jawaban.value[segmenAktif.value] = nilai
  }
  segmenAktif.value = null
}

function hapusSegmen() {
  if (!segmenAktif.value) return
  delete jawaban.value[segmenAktif.value]
  segmenAktif.value = null
}

async function kirim() {
  galatKirim.value = ''
  mengirim.value = true

  // Lengkapi seluruh 18 item: yang tidak ditandai = tidak pernah.
  const isi = SEGMEN_TUBUH.map((s) => {
    const j = jawaban.value[s.kode]
    return j
      ? { kodeSegmen: s.kode, ...j }
      : {
          kodeSegmen: s.kode,
          frekuensiKode: 0,
          ketidaknyamananSkor: null,
          gangguanSkor: null,
        }
  })

  try {
    await $fetch('/api/cmdq', { method: 'POST', body: { jawaban: isi } })
    terkirim.value = true
    draf.bersihkan()
    await navigateTo('/hasil')
  } catch (error: any) {
    const pesan =
      error?.data?.statusMessage ??
      error?.statusMessage ??
      'Gagal mengirim jawaban. Periksa koneksi Anda lalu coba lagi.'
    // Menenangkan responden secara eksplisit: kegagalan kirim adalah momen
    // paling mungkin ia mengira harus mengisi ulang dari nol.
    galatKirim.value = `${pesan} Jawaban Anda masih tersimpan di perangkat ini.`
    mengirim.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <UiProgres :tahap="nomorTahap('KUESIONER')" keterangan="Kemajuan Pengisian" />

    <header class="mx-auto max-w-xl text-center">
      <h1 class="text-[22px] font-extrabold text-ink">Peta Keluhan Tubuh</h1>
      <p class="mt-1.5 text-sm leading-relaxed text-ink-600">
        Silakan pilih bagian tubuh yang Anda rasakan ada keluhan selama
        <strong>satu minggu kerja terakhir</strong>.
      </p>
    </header>

    <!--
      Dua kolom di laptop: peta tetap terlihat sementara responden menelusuri
      daftar bagian yang sudah ditandai. Pada satu kolom, peta terdorong ke
      atas lipatan begitu daftarnya memanjang — padahal peta itulah yang
      memberi tahu bagian mana yang belum tersentuh.
    -->
    <div class="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <div class="lg:sticky lg:top-24">
        <PetaTubuh
          :skor="skorPerSegmen"
          :aktif="segmenAktif"
          @pilih="segmenAktif = $event"
        />
      </div>

      <div class="mt-4 space-y-4 lg:mt-0">
    <!--
      Jalur pilih alternatif. Area terkecil pada peta hanya sekitar 20×10 px di
      layar 360 px, jadi peta tidak boleh menjadi satu-satunya cara menandai
      keluhan. Daftar ini memakai tombol biasa sehingga andal untuk jari besar,
      papan tik, maupun pembaca layar.
    -->
    <section class="rounded-kartu border border-garis bg-white">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        :aria-expanded="daftarTerbuka"
        aria-controls="daftar-segmen"
        @click="daftarTerbuka = !daftarTerbuka"
      >
        <span>
          <span class="block text-sm font-bold text-ink">
            Pilih dari daftar nama
          </span>
          <span class="block text-xs text-ink-600">
            Lebih mudah daripada mengetuk gambar
          </span>
        </span>
        <svg
          class="size-5 shrink-0 text-brand-600 transition-transform duration-200"
          :class="daftarTerbuka && 'rotate-180'"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>

      <div v-show="daftarTerbuka" id="daftar-segmen" class="border-t border-garis p-3">
        <div v-for="grup in segmenPerRegio" :key="grup.regio" class="mb-3 last:mb-0">
          <h3 class="mb-1.5 text-[11px] font-bold tracking-wide text-ink-500 uppercase">
            {{ grup.label }}
          </h3>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="s in grup.segmen"
              :key="s.kode"
              type="button"
              class="touch-target rounded-input border px-2.5 py-2 text-left text-xs leading-tight transition"
              :class="
                skorPerSegmen[s.kode]
                  ? 'border-aksen bg-aksen-lembut font-bold text-aksen-teks'
                  : 'border-garis-kuat bg-isian text-ink-700 hover:border-brand-600'
              "
              @click="segmenAktif = s.kode"
            >
              {{ s.nama }}
              <span v-if="s.petunjuk" class="mt-0.5 block text-[10px] font-normal text-ink-500">
                {{ s.petunjuk }}
              </span>
              <span v-if="skorPerSegmen[s.kode]" class="mt-0.5 block text-[10px]">
                skor {{ skorPerSegmen[s.kode] }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Daftar bagian yang sudah ditandai -->
    <section v-if="daftarDitandai.length === 0">
      <div
        class="rounded-kartu border-[1.5px] border-dashed border-garis-kuat p-6 text-center text-ink-500"
      >
        <UiIkon nama="tunjuk" :ukuran="30" class="text-brand-600" />
        <p class="mt-2 text-sm">Belum ada bagian tubuh yang dipilih.</p>
        <p class="mt-1 text-xs">
          Jika memang tidak ada keluhan sama sekali, Anda tetap bisa langsung
          menekan tombol di bawah.
        </p>
      </div>
    </section>

    <section v-else class="space-y-2">
      <div class="flex items-baseline justify-between">
        <h2 class="text-sm font-bold text-ink">
          Bagian yang ditandai ({{ daftarDitandai.length }})
        </h2>
        <!--
          Skor total sengaja TIDAK ditampilkan selama pengisian. Angka risiko
          yang terus naik di depan mata saat responden masih melaporkan
          keluhannya sendiri adalah dorongan halus untuk menahan jawaban
          berikutnya. Skor per bagian tetap tampil karena fungsinya berbeda:
          memastikan ketukan tadi benar-benar tercatat.
        -->
        <span class="text-xs text-ink-500">dari {{ SEGMEN_TUBUH.length }} bagian</span>
      </div>

      <button
        v-for="d in daftarDitandai"
        :key="d.kode"
        type="button"
        class="flex w-full items-center gap-3 rounded-kartu border border-garis bg-white px-4 py-3 text-left transition hover:border-brand-600"
        @click="segmenAktif = d.kode"
      >
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-ink">{{ d.nama }}</span>
          <span class="block text-xs text-ink-500">
            Frekuensi {{ d.j.frekuensiKode }}/4 · Ketidaknyamanan
            {{ d.j.ketidaknyamananSkor }}/3 · Gangguan {{ d.j.gangguanSkor }}/3
          </span>
        </span>
        <span
          class="shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold"
          :class="gayaSkor(d.skor)"
        >
          {{ d.skor }}<span class="text-[10px] opacity-70">/{{ SKOR_SEGMEN_MAKS }}</span>
        </span>
        <UiIkon nama="ubah" :ukuran="18" class="text-ink-400" />
      </button>
    </section>

    <p
      v-if="galatKirim"
      class="rounded-input bg-risiko-tinggi-bg px-4 py-3 text-sm font-semibold text-risiko-tinggi-teks"
      role="alert"
    >
      {{ galatKirim }}
    </p>

    <div class="space-y-2 pt-1 sm:flex sm:flex-row-reverse sm:gap-2 sm:space-y-0">
      <UiTombol varian="aksen" type="button" :disabled="mengirim" class="sm:w-auto" @click="kirim">
        {{ mengirim ? 'Menghitung…' : 'Selesai & Lihat Skor' }}
      </UiTombol>
      <UiTombol varian="kedua" ke="/beranda" class="sm:w-auto">Kembali</UiTombol>
    </div>
      </div>
    </div>

    <PanelJawabanKeluhan
      v-if="segmenAktif && detailSegmenAktif"
      :key="segmenAktif"
      label-jenis="Bagian tubuh"
      :nama="detailSegmenAktif.nama"
      :petunjuk="detailSegmenAktif.petunjuk"
      :awal="jawaban[segmenAktif] ?? null"
      @simpan="simpanSegmen"
      @hapus="hapusSegmen"
      @tutup="segmenAktif = null"
    />
  </div>
</template>
