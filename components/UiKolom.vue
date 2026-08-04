<script setup lang="ts">
/**
 * Pembungkus satu field form: label, petunjuk, dan pesan galat.
 *
 * Dua bentuk pemakaian:
 *
 *   1. Kontrol tunggal (input/select) — berikan `untuk` berisi id kontrolnya.
 *      Elemen `<label for>` mengikat seperti biasa.
 *
 *   2. Kelompok radio (`UiPilihan`) — JANGAN berikan `untuk`. `<label for>`
 *      tidak boleh menunjuk ke sekumpulan radio, dan sebelumnya `untuk`
 *      dikosongkan sehingga labelnya menjadi yatim: tidak menunjuk apa pun,
 *      tidak membungkus apa pun. Akibatnya empat pertanyaan WAJIB di halaman
 *      profil (jenis kelamin, olahraga, merokok, riwayat MSDs) diumumkan
 *      pembaca layar hanya sebagai "group" tanpa nama.
 *
 *      Dalam bentuk ini komponen merender `<span>` ber-id lalu menyediakannya
 *      lewat `provide`, sehingga `UiPilihan` di dalam slot mengambilnya sendiri
 *      tanpa satu pun pemanggil perlu diubah.
 */
import { KUNCI_LABEL_KOLOM } from '~~/types/ui'

const props = defineProps<{
  label: string
  untuk?: string
  wajib?: boolean
  petunjuk?: string
  galat?: string
}>()

/** Id label — stabil sepanjang umur komponen, aman dipakai aria-labelledby. */
const idLabel = useId()

/** Petunjuk ikut dibacakan bila ada; sering memuat definisi yang menentukan. */
const idPetunjuk = useId()

provide(
  KUNCI_LABEL_KOLOM,
  computed(() => ({
    labelledby: idLabel,
    describedby: props.petunjuk ? idPetunjuk : undefined,
  })),
)
</script>

<template>
  <div>
    <component
      :is="untuk ? 'label' : 'span'"
      :id="idLabel"
      :for="untuk"
      class="block text-[13px] font-medium text-ink-700"
    >
      {{ label }}
      <span v-if="wajib" class="font-bold text-risiko-tinggi" aria-hidden="true">*</span>
      <span v-if="wajib" class="sr-only">(wajib diisi)</span>
    </component>

    <p v-if="petunjuk" :id="idPetunjuk" class="mt-0.5 text-xs text-ink-500">
      {{ petunjuk }}
    </p>

    <div class="mt-1.5">
      <slot />
    </div>

    <p
      v-if="galat"
      class="mt-1.5 flex items-start gap-1 text-xs font-semibold text-risiko-tinggi"
      role="alert"
    >
      <UiIkon nama="peringatan" :ukuran="15" />
      <span>{{ galat }}</span>
    </p>
  </div>
</template>
