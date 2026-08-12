<script setup lang="ts">
import {
  SKALA_FREKUENSI,
  SKALA_GANGGUAN,
  SKALA_KETIDAKNYAMANAN,
  SKOR_SEGMEN_MAKS,
} from '~~/lib/cmdq/skala'
import { hitungSkorSegmen, kategorikanSkorSegmen } from '~~/lib/cmdq/skoring'
import type { OpsiPilihan } from '~~/types/ui'

/**
 * Lembar tiga pertanyaan untuk SATU bagian yang dikeluhkan — muncul setelah
 * responden menyentuh sebuah bagian pada peta tubuh (CMDQ) atau diagram
 * telapak tangan (CHDQ).
 *
 * SATU KOMPONEN UNTUK DUA INSTRUMEN, dan itu bukan penghematan yang dipaksakan:
 * Cornell memakai tiga pertanyaan, lima opsi frekuensi, bobot, dan rentang skor
 * yang persis sama pada CMDQ maupun CHDQ — halaman resmi CHDQ mengulang
 * instruksi skoringnya kata demi kata. Menyalin komponen ini menjadi dua adalah
 * cara paling mudah membuat kedua instrumen lambat laun menanyakan hal yang
 * sedikit berbeda, dan selisihnya tidak akan terlihat sampai analisis.
 *
 * Yang berbeda hanya penyebutan bagiannya, karena itu `nama`, `petunjuk`, dan
 * `labelJenis` diterima sebagai prop, bukan dicari sendiri dari katalog.
 *
 * Pertanyaan 2 dan 3 hanya ditampilkan bila responden menjawab pernah
 * mengalami keluhan, sesuai aturan instrumen (bila "tidak pernah", dua
 * pertanyaan lanjutan tidak berlaku dan skor otomatis 0).
 */

const props = defineProps<{
  /** Nama bagian yang ditanyakan, mis. "Bahu kanan" atau "Area A (kanan)" */
  nama: string
  /** Penjelasan batas anatomis, bila ada */
  petunjuk?: string | null
  /** Penyebut kategori bagian, mis. "Bagian tubuh" atau "Area tangan" */
  labelJenis?: string
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

/**
 * Manajemen fokus dialog.
 *
 * Panel ini sudah punya `role="dialog"` dan `aria-modal`, tetapi tanpa fokus
 * awal pembaca layar tetap berada pada area peta di belakangnya — yang kini
 * tertutup lapisan gelap. Pengguna TalkBack membuka panel lalu tidak menemukan
 * isinya, dan setelah menutup harus menelusuri ulang puluhan area peta untuk
 * mencapai bagian berikutnya. Diulang delapan kali, itu bukan ketidaknyamanan
 * melainkan alasan berhenti mengisi.
 */
const judul = ref<HTMLElement | null>(null)
const wadah = ref<HTMLElement | null>(null)

/** Elemen yang membuka panel; fokus dikembalikan ke sana setelah ditutup. */
let pemicu: HTMLElement | null = null

onMounted(() => {
  pemicu = document.activeElement as HTMLElement | null
  judul.value?.focus()
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  pemicu?.focus?.()
})

const BISA_FOKUS =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'

/** Menahan fokus di dalam dialog selama terbuka. */
function jagaFokus(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !wadah.value) return

  const isi = Array.from(wadah.value.querySelectorAll<HTMLElement>(BISA_FOKUS))
  if (isi.length === 0) return

  const awal = isi[0]!
  const akhir = isi[isi.length - 1]!

  if (event.shiftKey && document.activeElement === awal) {
    event.preventDefault()
    akhir.focus()
  } else if (!event.shiftKey && document.activeElement === akhir) {
    event.preventDefault()
    awal.focus()
  }
}

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

function mintaHapus() {
  if (window.confirm(`Hapus jawaban untuk ${props.nama}?`)) emit('hapus')
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
    :aria-label="`Pertanyaan untuk ${props.nama}`"
    @click.self="emit('tutup')"
    @keydown="jagaFokus"
  >
    <div
      ref="wadah"
      class="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-layar bg-white sm:rounded-layar"
    >
      <!-- Kepala -->
      <div
        class="sticky top-0 flex items-start gap-3 border-b border-garis bg-white px-5 py-4"
      >
        <div class="min-w-0 flex-1">
          <p class="label-seksi">{{ props.labelJenis ?? 'Bagian tubuh' }}</p>
          <h2
            ref="judul"
            tabindex="-1"
            class="mt-0.5 text-lg font-extrabold text-ink outline-none"
          >
            {{ props.nama }}
          </h2>
          <p v-if="props.petunjuk" class="mt-1 text-xs text-ink-500">
            {{ props.petunjuk }}
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
            {{ props.nama.toLowerCase() }}?
          </legend>
          <!--
            "Minggu kerja terakhir", bukan "7 hari terakhir". Form Cornell
            berbunyi "During the last work week"; pada responden yang libur di
            akhir pekan, tujuh hari kalender memasukkan dua hari tanpa paparan
            kerja — persis periode yang instrumen ini rancang untuk dikecualikan.
          -->
          <p class="mt-0.5 mb-2 text-xs text-ink-500">
            Selama satu minggu kerja terakhir
          </p>
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
      <div class="sticky bottom-0 border-t border-garis bg-white px-5 py-4">
        <UiTombol type="button" @click="simpan">Simpan Jawaban</UiTombol>

        <!--
          Aksi merusak sengaja dijauhkan dari tombol utama dan dibuat kecil.
          Sebelumnya keduanya sama-sama selebar penuh dan hanya berjarak 8px di
          bilah lengket tepat di bawah ibu jari — satu meleset menghapus sampai
          tiga jawaban yang baru saja diisi.
        -->
        <div v-if="props.awal" class="mt-5 border-t border-garis pt-3 text-center">
          <button
            type="button"
            class="touch-target rounded-input px-3 text-xs font-semibold text-ink-500 underline underline-offset-2 transition hover:text-risiko-tinggi focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none"
            @click="mintaHapus"
          >
            Hapus jawaban bagian ini
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
