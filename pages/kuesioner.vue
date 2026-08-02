<script setup lang="ts">
import { SEGMEN_TUBUH } from '~~/lib/cmdq/segmen'
import { SKOR_SEGMEN_MAKS } from '~~/lib/cmdq/skala'
import { hitungSkorSegmen, kategorikanSkorSegmen } from '~~/lib/cmdq/skoring'

/**
 * Modul 2 — Kuesioner keluhan tubuh (peta tubuh 28 segmen).
 *
 * Responden hanya perlu menandai bagian yang terasa nyeri. Saat dikirim,
 * seluruh 28 segmen tetap dilengkapi: bagian yang tidak ditandai otomatis
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
const mengirim = ref(false)
const galatKirim = ref('')

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

const totalSementara = computed(() =>
  daftarDitandai.value.reduce((jml, d) => jml + d.skor, 0),
)

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

  // Lengkapi seluruh 28 segmen: yang tidak ditandai = tidak pernah.
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
    await navigateTo('/hasil')
  } catch (error: any) {
    galatKirim.value =
      error?.data?.statusMessage ??
      error?.statusMessage ??
      'Gagal mengirim jawaban. Periksa koneksi Anda lalu coba lagi.'
    mengirim.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <UiProgres :tahap="2" keterangan="Kemajuan Pengisian" />

    <header class="text-center">
      <h1 class="text-[22px] font-extrabold text-ink">Peta Keluhan Tubuh</h1>
      <p class="mt-1.5 text-sm leading-relaxed text-ink-600">
        Silakan pilih bagian tubuh yang Anda rasakan ada keluhan dalam
        <strong>1 minggu terakhir</strong>.
      </p>
    </header>

    <PetaTubuh
      :skor="skorPerSegmen"
      :aktif="segmenAktif"
      @pilih="segmenAktif = $event"
    />

    <!-- Daftar bagian yang sudah ditandai -->
    <section v-if="daftarDitandai.length === 0">
      <div
        class="rounded-kartu border-[1.5px] border-dashed border-garis-kuat p-6 text-center text-ink-500"
      >
        <p class="text-2xl" aria-hidden="true">☝</p>
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
        <span class="text-xs text-ink-500">
          Skor sementara: <strong class="text-ink-700">{{ totalSementara }}</strong>
        </span>
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
            Frekuensi {{ d.j.frekuensiKode }}/3 · Ketidaknyamanan
            {{ d.j.ketidaknyamananSkor }}/3 · Gangguan {{ d.j.gangguanSkor }}/3
          </span>
        </span>
        <span
          class="shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold"
          :class="gayaSkor(d.skor)"
        >
          {{ d.skor }}<span class="text-[10px] opacity-70">/{{ SKOR_SEGMEN_MAKS }}</span>
        </span>
        <span class="shrink-0 text-ink-400" aria-hidden="true">✎</span>
      </button>
    </section>

    <p
      v-if="galatKirim"
      class="rounded-input bg-risiko-tinggi-bg px-4 py-3 text-sm font-semibold text-risiko-tinggi-teks"
      role="alert"
    >
      {{ galatKirim }}
    </p>

    <div class="space-y-2 pt-1">
      <UiTombol type="button" :disabled="mengirim" @click="kirim">
        {{ mengirim ? 'Menghitung…' : 'Selesai & Lihat Skor' }}
      </UiTombol>
      <UiTombol varian="kedua" ke="/beranda">Kembali</UiTombol>
    </div>

    <PanelJawabanSegmen
      v-if="segmenAktif"
      :key="segmenAktif"
      :kode-segmen="segmenAktif"
      :awal="jawaban[segmenAktif] ?? null"
      @simpan="simpanSegmen"
      @hapus="hapusSegmen"
      @tutup="segmenAktif = null"
    />
  </div>
</template>
