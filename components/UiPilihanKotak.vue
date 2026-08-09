<script setup lang="ts">
import { KUNCI_LABEL_KOLOM } from '~~/types/ui'

/**
 * Kelompok pilihan berbentuk kotak padat — untuk variabel kategorik yang
 * labelnya sudah pendek dan berdiri sendiri (rentang usia, masa kerja, durasi
 * komputer, divisi, jabatan).
 *
 * Berbeda dari `UiPilihan` yang menampilkan lingkaran radio dan cocok untuk
 * pilihan sedikit dengan keterangan. Di sini yang dibutuhkan adalah petak
 * ringkas berisi 2–11 pilihan.
 *
 * Sebelumnya markup ini ditulis ulang di setiap pertanyaan sebagai deretan
 * `<button>` biasa. Bentuk itu bukan kelompok radio bagi teknologi bantu:
 * pembaca layar mengumumkan tujuh tombol lepas tanpa pertanyaannya, tanpa
 * status terpilih, dan tanpa navigasi panah. Komponen ini memakai `<input
 * type="radio">` sungguhan yang disembunyikan secara visual, sehingga semantik
 * dan navigasi papan tik bawaan peramban tetap utuh.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    opsi: readonly string[]
    /** Wajib unik per pertanyaan supaya radio tidak saling mengganggu */
    nama: string
    /** Banyak kolom petak; sesuaikan dengan panjang label */
    kolom?: 1 | 2 | 3
    galat?: boolean
  }>(),
  { kolom: 3 },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

// Pola yang sama dengan `UiPilihan`: `role="radiogroup"` tidak bisa diberi
// nama oleh `<label for>`, jadi ia menunjuk id label milik `UiKolom`.
const kaitan = inject(KUNCI_LABEL_KOLOM, undefined)
const idLabel = computed(() => kaitan?.value.labelledby)
const idPetunjuk = computed(() => kaitan?.value.describedby)

const kelasKolom = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
} as const
</script>

<template>
  <div
    role="radiogroup"
    :aria-labelledby="idLabel"
    :aria-describedby="idPetunjuk"
    class="mt-1 grid gap-2"
    :class="kelasKolom[props.kolom]"
  >
    <label
      v-for="item in props.opsi"
      :key="item"
      class="cursor-pointer rounded-lg border px-2 py-2.5 text-center text-xs font-semibold transition select-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-2"
      :class="[
        props.modelValue === item
          ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
          : props.galat
            ? 'border-risiko-tinggi bg-white text-ink hover:bg-gray-50'
            : 'border-garis bg-white text-ink hover:bg-gray-50',
      ]"
    >
      <input
        type="radio"
        class="sr-only"
        :name="props.nama"
        :value="item"
        :checked="props.modelValue === item"
        @change="emit('update:modelValue', item)"
      />
      {{ item }}
    </label>
  </div>
</template>
