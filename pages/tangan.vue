<script setup lang="ts">
import { nomorTahap } from '~~/lib/alur'
import {
  AREA_TANGAN,
  LABEL_TANGAN,
  URUTAN_TANGAN,
  cariAreaTangan,
} from '~~/lib/chdq/area'
import { SKOR_AREA_MAKS } from '~~/lib/chdq/skala'
import { hitungSkorArea, kategorikanSkorArea } from '~~/lib/chdq/skoring'

/**
 * Modul 3 — Kuesioner keluhan tangan (CHDQ, 6 area × 2 tangan).
 *
 * Instrumen TERPISAH dari peta tubuh, sesuai pembagian Cornell sendiri: CMDQ
 * versi pekerja duduk berhenti di pergelangan tangan, dan telapak tangan
 * ditanyakan oleh `rhandq.pdf` / `lhandq.pdf`.
 *
 * Alurnya menyalin halaman peta tubuh: responden hanya menandai area yang
 * terasa nyeri, dan saat dikirim seluruh 12 item dilengkapi — yang tidak
 * ditandai menjadi "tidak pernah" (frekuensi 0).
 */
definePageMeta({ middleware: 'responden' })
useHead({ title: 'Keluhan Tangan — ErgoSelf' })

interface JawabanArea {
  frekuensiKode: number
  ketidaknyamananSkor: number | null
  gangguanSkor: number | null
}

const jawaban = ref<Record<string, JawabanArea>>({})
const areaAktif = ref<string | null>(null)
const detailAreaAktif = computed(() =>
  areaAktif.value ? cariAreaTangan(areaAktif.value) : undefined,
)
const mengirim = ref(false)
const galatKirim = ref('')
const terkirim = ref(false)

const draf = useDrafJawaban('chdq', jawaban)
draf.pulihkan()
draf.pantau()

const { data: tersimpan } = await useFetch('/api/chdq/saya', {
  server: false,
  onResponseError: () => {},
})

watch(
  tersimpan,
  (nilai) => {
    if (!nilai?.perArea) return
    // Sama seperti di halaman peta tubuh: jangan menimpa apa pun yang sudah
    // ada di layar, karena permintaan ini tidak memblokir hidrasi.
    if (Object.keys(jawaban.value).length > 0) return

    const hasil: Record<string, JawabanArea> = {}
    for (const a of nilai.perArea) {
      if (a.frekuensiKode > 0) {
        hasil[a.kodeArea] = {
          frekuensiKode: a.frekuensiKode,
          ketidaknyamananSkor: a.ketidaknyamananSkor,
          gangguanSkor: a.gangguanSkor,
        }
      }
    }
    jawaban.value = hasil
  },
  { immediate: true },
)

onBeforeRouteLeave(() => {
  if (terkirim.value || Object.keys(jawaban.value).length === 0) return true
  return window.confirm(
    'Jawaban Anda belum dikirim. Tinggalkan halaman ini? Jawaban tetap tersimpan di perangkat ini.',
  )
})

const skorPerArea = computed(() => {
  const hasil: Record<string, number> = {}
  for (const [kode, j] of Object.entries(jawaban.value)) {
    try {
      hasil[kode] = hitungSkorArea(
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

const daftarDitandai = computed(() =>
  Object.entries(jawaban.value)
    .map(([kode, j]) => {
      const area = cariAreaTangan(kode)!
      return {
        kode,
        judul: `Area ${area.huruf} — ${LABEL_TANGAN[area.tangan].toLowerCase()}`,
        nama: area.nama,
        urutan: area.urutan,
        j,
        skor: skorPerArea.value[kode] ?? 0,
      }
    })
    .sort((a, b) => b.skor - a.skor || a.urutan - b.urutan),
)

/** Jalur pilih alternatif — sama alasannya dengan pada peta tubuh. */
const daftarTerbuka = ref(false)

const areaPerTangan = computed(() =>
  URUTAN_TANGAN.map((tangan) => ({
    tangan,
    label: LABEL_TANGAN[tangan],
    area: AREA_TANGAN.filter((a) => a.tangan === tangan),
  })),
)

function gayaSkor(skor: number) {
  const k = kategorikanSkorArea(skor)
  return k === 'TINGGI'
    ? 'bg-risiko-tinggi-bg text-risiko-tinggi-teks'
    : k === 'SEDANG'
      ? 'bg-risiko-sedang-bg text-risiko-sedang'
      : k === 'RENDAH'
        ? 'bg-risiko-rendah-bg text-risiko-rendah'
        : 'bg-panel text-ink-600'
}

function simpanArea(nilai: JawabanArea) {
  if (!areaAktif.value) return
  jawaban.value[areaAktif.value] = nilai
  areaAktif.value = null
}

function hapusArea() {
  if (!areaAktif.value) return
  delete jawaban.value[areaAktif.value]
  areaAktif.value = null
}

async function kirim() {
  galatKirim.value = ''
  mengirim.value = true

  const isi = AREA_TANGAN.map((a) => {
    const j = jawaban.value[a.kode]
    return j
      ? { kodeArea: a.kode, ...j }
      : {
          kodeArea: a.kode,
          frekuensiKode: 0,
          ketidaknyamananSkor: null,
          gangguanSkor: null,
        }
  })

  try {
    await $fetch('/api/chdq', { method: 'POST', body: { jawaban: isi } })
    terkirim.value = true
    draf.bersihkan()
    await navigateTo('/hasil')
  } catch (error: any) {
    const pesan =
      error?.data?.statusMessage ??
      error?.statusMessage ??
      'Gagal mengirim jawaban. Periksa koneksi Anda lalu coba lagi.'
    galatKirim.value = `${pesan} Jawaban Anda masih tersimpan di perangkat ini.`
    mengirim.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <UiProgres :tahap="nomorTahap('TANGAN')" keterangan="Kemajuan Pengisian" />

    <header class="mx-auto max-w-xl text-center">
      <h1 class="text-[22px] font-extrabold text-ink">Keluhan Tangan</h1>
      <p class="mt-1.5 text-sm leading-relaxed text-ink-600">
        Sentuh area telapak tangan yang terasa ada keluhan selama
        <strong>satu minggu kerja terakhir</strong>. Isi untuk kedua tangan.
      </p>
    </header>

    <!--
      Diagram memakai LEBAR PENUH panel, tidak dijejalkan ke satu kolom.
      Berdampingan dalam kolom selebar setengah panel, tiap tangan menyusut
      ke ±236px dan target sentuh terkecilnya turun kembali ke 39px — persis
      masalah yang sedang diperbaiki di sini.

      Berdampingan baru mulai `md`: di bawah itu keduanya bertumpuk selebar
      panel, yang justru memberi diagram terbesar pada perangkat tersempit.
    -->
    <div class="grid gap-3 md:grid-cols-2">
      <DiagramTangan
        v-for="t in URUTAN_TANGAN"
        :key="t"
        :tangan="t"
        :skor="skorPerArea"
        :aktif="areaAktif"
        @pilih="areaAktif = $event"
      />
    </div>

    <!-- Daftar & rekap berdampingan di laptop; diagram sudah di atasnya. -->
    <div class="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <div class="space-y-4">
    <section class="rounded-kartu border border-garis bg-white">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        :aria-expanded="daftarTerbuka"
        aria-controls="daftar-area"
        @click="daftarTerbuka = !daftarTerbuka"
      >
        <span>
          <span class="block text-sm font-bold text-ink">
            Pilih dari daftar area
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

      <div
        v-show="daftarTerbuka"
        id="daftar-area"
        class="border-t border-garis p-3"
      >
        <div
          v-for="grup in areaPerTangan"
          :key="grup.tangan"
          class="mb-3 last:mb-0"
        >
          <h3
            class="mb-1.5 text-[11px] font-bold tracking-wide text-ink-500 uppercase"
          >
            {{ grup.label }}
          </h3>
          <div class="grid gap-1.5 sm:grid-cols-2">
            <button
              v-for="a in grup.area"
              :key="a.kode"
              type="button"
              class="touch-target rounded-input border px-2.5 py-2 text-left text-xs leading-tight transition"
              :class="
                jawaban[a.kode] !== undefined
                  ? 'border-aksen bg-aksen-lembut font-bold text-aksen-teks'
                  : 'border-garis-kuat bg-isian text-ink-700 hover:border-brand-600'
              "
              @click="areaAktif = a.kode"
            >
              Area {{ a.huruf }} — {{ a.nama }}
              <span class="mt-0.5 block text-[10px] font-normal text-ink-500">
                {{ a.petunjuk }}
              </span>
              <span v-if="jawaban[a.kode] !== undefined" class="mt-0.5 block text-[10px]">
                skor {{ skorPerArea[a.kode] ?? 0 }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>

      </div>

      <div class="mt-4 space-y-4 lg:mt-0">
    <section v-if="daftarDitandai.length === 0">
      <div
        class="rounded-kartu border-[1.5px] border-dashed border-garis-kuat p-6 text-center text-ink-500"
      >
        <UiIkon nama="tunjuk" :ukuran="30" class="text-brand-600" />
        <p class="mt-2 text-sm">Belum ada area tangan yang dipilih.</p>
        <p class="mt-1 text-xs">
          Jika memang tidak ada keluhan sama sekali, Anda tetap bisa langsung
          menekan tombol di bawah.
        </p>
      </div>
    </section>

    <section v-else class="space-y-2">
      <div class="flex items-baseline justify-between">
        <h2 class="text-sm font-bold text-ink">
          Area yang ditandai ({{ daftarDitandai.length }})
        </h2>
        <span class="text-xs text-ink-500">dari {{ AREA_TANGAN.length }} area</span>
      </div>

      <button
        v-for="d in daftarDitandai"
        :key="d.kode"
        type="button"
        class="flex w-full items-center gap-3 rounded-kartu border border-garis bg-white px-4 py-3 text-left transition hover:border-brand-600"
        @click="areaAktif = d.kode"
      >
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-ink">{{ d.judul }}</span>
          <span class="block text-xs text-ink-500">
            Frekuensi {{ d.j.frekuensiKode }}/4 · Ketidaknyamanan
            {{ d.j.ketidaknyamananSkor ?? 0 }}/3 · Gangguan {{ d.j.gangguanSkor ?? 0 }}/3
          </span>
        </span>
        <span
          class="shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold"
          :class="gayaSkor(d.skor)"
        >
          {{ d.skor }}<span class="text-[10px] opacity-70">/{{ SKOR_AREA_MAKS }}</span>
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
      <UiTombol varian="kedua" ke="/hasil" class="sm:w-auto">Kembali</UiTombol>
    </div>
      </div>
    </div>

    <PanelJawabanKeluhan
      v-if="areaAktif && detailAreaAktif"
      :key="areaAktif"
      label-jenis="Area tangan"
      :nama="`Area ${detailAreaAktif.huruf} (${LABEL_TANGAN[detailAreaAktif.tangan].toLowerCase()}) — ${detailAreaAktif.nama}`"
      :petunjuk="detailAreaAktif.petunjuk"
      :awal="jawaban[areaAktif] ?? null"
      @simpan="simpanArea"
      @hapus="hapusArea"
      @tutup="areaAktif = null"
    />
  </div>
</template>
