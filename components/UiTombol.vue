<script setup lang="ts">
/**
 * Tombol pil sesuai mockup: varian `utama` (teal penuh) dan `kedua`
 * (garis teal). Otomatis menjadi <NuxtLink> bila diberi prop `ke`.
 */
const props = withDefaults(
  defineProps<{
    varian?: 'utama' | 'kedua'
    ke?: string
    type?: 'button' | 'submit'
    disabled?: boolean
    penuh?: boolean
  }>(),
  { varian: 'utama', type: 'button', penuh: true },
)

const kelas = computed(() => [
  props.varian === 'utama'
    ? 'tombol-utama hover:bg-brand-700'
    : 'tombol-kedua hover:bg-brand-50',
  props.penuh ? 'w-full' : '',
  props.disabled ? 'cursor-not-allowed opacity-60' : '',
])
</script>

<template>
  <NuxtLink v-if="ke && !disabled" :to="ke" :class="kelas">
    <slot />
  </NuxtLink>
  <button v-else :type="type" :disabled="disabled" :class="kelas">
    <slot />
  </button>
</template>
