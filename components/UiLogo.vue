<script setup lang="ts">
/**
 * Lambang ErgoSelf — perisai heksagonal bergradien teal dengan tanda plus,
 * merujuk simbol K3 (Keselamatan dan Kesehatan Kerja).
 * Bentuk heksagon memakai clip-path sesuai mockup desain.
 */
withDefaults(defineProps<{ ukuran?: number }>(), { ukuran: 28 })
</script>

<template>
  <span
    class="grid shrink-0 place-items-center font-extrabold text-white"
    :style="{
      width: `${ukuran}px`,
      height: `${ukuran}px`,
      fontSize: `${Math.round(ukuran * 0.46)}px`,
      background: 'linear-gradient(135deg, var(--color-brand-400), var(--color-brand-600))',
      clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
    }"
    aria-hidden="true"
  >
    +
  </span>
</template>
