<script setup lang="ts" generic="T extends string | number | boolean">
import { KUNCI_LABEL_KOLOM } from '~~/types/ui'
import type { OpsiPilihan } from '~~/types/ui'

/**
 * Kelompok radio dengan target sentuh besar (min. 44px).
 * Dipakai untuk semua pertanyaan tertutup — jenis kelamin, ya/tidak, skala
 * jawaban CMDQ dan SUS — agar konsisten dan nyaman diisi lewat HP/tablet.
 *
 * Varian `angka` meniru baris 1–5 pada mockup kuesioner SUS.
 */
const props = withDefaults(
  defineProps<{
    modelValue: T | undefined | null
    opsi: readonly OpsiPilihan<T>[]
    /** Wajib unik per pertanyaan supaya radio tidak saling mengganggu */
    nama: string
    /** 'daftar' = satu opsi per baris · 'padat' = grid · 'angka' = kotak 1–5 */
    tata?: 'daftar' | 'padat' | 'angka'
    galat?: boolean
    /**
     * Id elemen yang menjadi nama grup ini bagi pembaca layar. Tanpa ini,
     * `role="radiogroup"` diumumkan hanya sebagai "group" tanpa keterangan
     * apa pun — pengguna mendengar lima pilihan tanpa tahu pertanyaannya.
     */
    labelledby?: string
  }>(),
  { tata: 'daftar' },
)

const emit = defineEmits<{ 'update:modelValue': [T] }>()

/**
 * Kaitan label dari `UiKolom` pembungkus, bila ada. Prop `labelledby` yang
 * diberikan langsung tetap menang, untuk pemakaian di luar `UiKolom`.
 */
const kaitan = inject(KUNCI_LABEL_KOLOM, undefined)
const idLabel = computed(() => props.labelledby ?? kaitan?.value.labelledby)
const idPetunjuk = computed(() => kaitan?.value.describedby)
</script>

<template>
  <div
    role="radiogroup"
    :aria-labelledby="idLabel"
    :aria-describedby="idPetunjuk"
    class="grid gap-2"
    :class="{
      'grid-cols-1': props.tata === 'daftar',
      'grid-cols-2': props.tata === 'padat',
      'grid-cols-5 gap-1.5': props.tata === 'angka',
    }"
  >
    <label
      v-for="(o, i) in props.opsi"
      :key="`${String(o.nilai)}-${i}`"
      class="cursor-pointer rounded-input border transition select-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-2"
      :class="[
        props.tata === 'angka'
          ? 'flex touch-target items-center justify-center text-sm font-semibold'
          : 'flex touch-target items-center gap-2.5 px-3 py-2.5 text-sm',
        props.modelValue === o.nilai
          ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
          : props.galat
            ? 'border-risiko-tinggi bg-white hover:bg-brand-50'
            : 'border-garis-kuat bg-white hover:border-brand-600 hover:bg-brand-50',
      ]"
    >
      <!--
        Radio asli disembunyikan secara visual namun tetap menerima fokus.
        Karena itu indikator fokusnya HARUS dipasang pada label pembungkus
        lewat `has-[:focus-visible]` di atas — tanpa itu fokus papan tik tidak
        terlihat sama sekali pada seluruh pertanyaan CMDQ dan 10 item SUS,
        yaitu kontrol yang paling sering diulang di aplikasi ini.
      -->
      <input
        type="radio"
        class="sr-only"
        :name="props.nama"
        :value="String(o.nilai)"
        :checked="props.modelValue === o.nilai"
        @change="emit('update:modelValue', o.nilai)"
      />

      <template v-if="props.tata === 'angka'">
        {{ o.label }}
      </template>

      <template v-else>
        <span
          class="grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border-2 transition"
          :class="
            props.modelValue === o.nilai
              ? 'border-white'
              : 'border-garis-kuat'
          "
          aria-hidden="true"
        >
          <span
            v-if="props.modelValue === o.nilai"
            class="h-2 w-2 rounded-full bg-white"
          />
        </span>
        <span class="leading-snug">
          <span
            class="block"
            :class="
              props.modelValue === o.nilai
                ? 'font-semibold'
                : 'text-ink-700'
            "
          >
            {{ o.label }}
          </span>
          <span
            v-if="o.keterangan"
            class="block text-xs"
            :class="props.modelValue === o.nilai ? 'text-white/80' : 'text-ink-500'"
          >
            {{ o.keterangan }}
          </span>
        </span>
      </template>
    </label>
  </div>
</template>
