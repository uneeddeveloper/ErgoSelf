<script setup lang="ts">
import { cariSegmen } from '~~/lib/cmdq/segmen'
import {
  SKALA_FREKUENSI,
  SKALA_GANGGUAN,
  SKALA_KETIDAKNYAMANAN,
  SKOR_SEGMEN_MAKS,
} from '~~/lib/cmdq/skala'
import { hitungSkorSegmen, kategorikanSkorSegmen } from '~~/lib/cmdq/skoring'
import type { OpsiPilihan } from '~~/types/ui'

/**
 * Lembar pertanyaan untuk satu segmen tubuh — muncul setelah responden
 * menyentuh bagian tubuh pada peta.
 *
 * Pertanyaan 2 dan 3 hanya ditampilkan bila responden menjawab pernah
 * mengalami keluhan, sesuai aturan instrumen (bila "tidak pernah", dua
 * pertanyaan lanjutan tidak berlaku dan skor otomatis 0).
 */

const props = defineProps<{
  kodeSegmen: string
  awal?: {
    frekuensiKode: number
    ketidaknyamananSkor: number | null
    gangguanSkor: number | null
  } | null
}>()

const emit = defineEmits<{
  simpan: [
    nilai: {
      frekuensiKode: number
      ketidaknyamananSkor: number | null
      gangguanSkor: number | null
    },
  ]
  hapus: []
  tutup: []
}>()

const segmen = computed(() => cariSegmen(props.kodeSegmen))

const frekuensi = ref<number | undefined>(props.awal?.frekuensiKode)
const ketidaknyamanan = ref<number | undefined>(
  props.awal?.ketidaknyamananSkor ?? undefined,
)
const gangguan = ref<number | undefined>(props.awal?.gangguanSkor ?? undefined)
const galat = ref('')

const opsiFrekuensi: OpsiPilihan<number>[] = SKALA_FREKUENSI.map((o) => ({
  nilai: o.nilai,
  label: o.label,
}))
const opsiKetidaknyamanan: OpsiPilihan<number>[] = SKALA_KETIDAKNYAMANAN.map(
  (o) => ({ nilai: o.nilai, label: o.label }),
)
const opsiGangguan: OpsiPilihan<number>[] = SKALA_GANGGUAN.map((o) => ({
  nilai: o.nilai,
  label: o.label,
}))

const adaKeluhan = computed(() => frekuensi.value !== undefined && frekuensi.value > 0)

/** Skor tampil langsung begitu ketiga pertanyaan terisi. */
const pratinjauSkor = computed(() => {
  if (frekuensi.value === undefined) return null
  if (frekuensi.value === 0) return 0
  if (ketidaknyamanan.value === undefined || gangguan.value === undefined) return null
  try {
    return hitungSkorSegmen(frekuensi.value, ketidaknyamanan.value, gangguan.value)
  } catch {
    return null
  }
})

const gayaSkor = computed(() => {
  const s = pratinjauSkor.value
  if (s === null || s === 0) return 'bg-panel text-ink-600'
  const k = kategorikanSkorSegmen(s)
  return k === 'TINGGI'
    ? 'bg-risiko-tinggi-bg text-risiko-tinggi-teks'
    : k === 'SEDANG'
      ? 'bg-risiko-sedang-bg text-risiko-sedang'
      : 'bg-risiko-rendah-bg text-risiko-rendah'
})

// Menjawab "tidak pernah" membatalkan dua jawaban lanjutan agar tidak
// terkirim ke server (server menolak kombinasi yang tidak konsisten).
watch(frekuensi, (baru) => {
  galat.value = ''
  if (baru === 0) {
    ketidaknyamanan.value = undefined
    gangguan.value = undefined
  }
})

function simpan() {
  if (frekuensi.value === undefined) {
    galat.value = 'Pilih dulu seberapa sering keluhan Anda rasakan.'
    return
  }
  if (adaKeluhan.value && ketidaknyamanan.value === undefined) {
    galat.value = 'Pilih tingkat ketidaknyamanan yang Anda rasakan.'
    return
  }
  if (adaKeluhan.value && gangguan.value === undefined) {
    galat.value = 'Pilih seberapa besar keluhan mengganggu pekerjaan Anda.'
    return
  }

  emit('simpan', {
    frekuensiKode: frekuensi.value,
    ketidaknyamananSkor: adaKeluhan.value ? ketidaknyamanan.value! : null,
    gangguanSkor: adaKeluhan.value ? gangguan.value! : null,
  })
}

function padaEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('tutup')
}

onMounted(() => document.addEventListener('keydown', padaEscape))
onUnmounted(() => document.removeEventListener('keydown', padaEscape))
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="`Pertanyaan untuk ${segmen?.nama}`"
    @click.self="emit('tutup')"
  >
    <div
      class="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-layar bg-white sm:rounded-layar"
    >
      <!-- Kepala -->
      <div
        class="sticky top-0 flex items-start gap-3 border-b border-garis bg-white px-5 py-4"
      >
        <div class="min-w-0 flex-1">
          <p class="label-seksi">Bagian tubuh</p>
          <h2 class="mt-0.5 text-lg font-extrabold text-ink">
            {{ segmen?.nama }}
          </h2>
          <p v-if="segmen?.petunjuk" class="mt-1 text-xs text-ink-500">
            {{ segmen.petunjuk }}
          </p>
        </div>
        <button
          type="button"
          class="touch-target -mt-1 -mr-2 rounded-full px-3 text-xl leading-none text-ink-500 hover:bg-panel"
          aria-label="Tutup"
          @click="emit('tutup')"
        >
          ×
        </button>
      </div>

      <div class="space-y-5 px-5 py-5">
        <!-- Pertanyaan 1 -->
        <fieldset>
          <legend class="text-sm font-bold text-ink">
            1. Seberapa sering Anda merasakan keluhan pada
            {{ segmen?.nama.toLowerCase() }}?
          </legend>
          <p class="mt-0.5 mb-2 text-xs text-ink-500">Selama 7 hari terakhir</p>
          <UiPilihan
            v-model="frekuensi"
            nama="frekuensi"
            :opsi="opsiFrekuensi"
          />
        </fieldset>

        <!-- Pertanyaan 2 & 3 hanya bila ada keluhan -->
        <template v-if="adaKeluhan">
          <fieldset>
            <legend class="text-sm font-bold text-ink">
              2. Seberapa tidak nyaman keluhan tersebut?
            </legend>
            <UiPilihan
              v-model="ketidaknyamanan"
              class="mt-2"
              nama="ketidaknyamanan"
              :opsi="opsiKetidaknyamanan"
            />
          </fieldset>

          <fieldset>
            <legend class="text-sm font-bold text-ink">
              3. Seberapa besar keluhan itu mengganggu pekerjaan Anda?
            </legend>
            <UiPilihan
              v-model="gangguan"
              class="mt-2"
              nama="gangguan"
              :opsi="opsiGangguan"
            />
          </fieldset>
        </template>

        <!-- Pratinjau skor -->
        <div
          v-if="pratinjauSkor !== null"
          class="flex items-center justify-between rounded-kartu px-4 py-3"
          :class="gayaSkor"
          aria-live="polite"
        >
          <span class="text-[13px] font-semibold">Skor bagian ini</span>
          <span class="text-xl font-extrabold">
            {{ pratinjauSkor }}
            <span class="text-xs font-semibold opacity-70">/ {{ SKOR_SEGMEN_MAKS }}</span>
          </span>
        </div>

        <p
          v-if="galat"
          class="rounded-input bg-risiko-tinggi-bg px-3 py-2 text-xs font-semibold text-risiko-tinggi-teks"
          role="alert"
        >
          {{ galat }}
        </p>
      </div>

      <!-- Tombol -->
      <div class="sticky bottom-0 space-y-2 border-t border-garis bg-white px-5 py-4">
        <UiTombol type="button" @click="simpan">Simpan Jawaban</UiTombol>
        <UiTombol
          v-if="props.awal"
          varian="kedua"
          type="button"
          @click="emit('hapus')"
        >
          Hapus jawaban bagian ini
        </UiTombol>
      </div>
    </div>
  </div>
</template>
