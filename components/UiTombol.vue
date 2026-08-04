<script setup lang="ts">
/**
 * Tombol pil sesuai tema: `utama` (hijau hutan penuh), `aksen` (koral, untuk
 * satu ajakan terpenting per layar) dan `kedua` (garis hijau).
 * Otomatis menjadi <NuxtLink> bila diberi prop `ke`.
 */
const props = withDefaults(
  defineProps<{
    varian?: 'utama' | 'aksen' | 'kedua'
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
    : props.varian === 'aksen'
      ? 'tombol-aksen hover:bg-aksen-kuat'
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
