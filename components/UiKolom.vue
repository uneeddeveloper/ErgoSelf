<script setup lang="ts">
/** Pembungkus satu field form: label, petunjuk, dan pesan galat. */
defineProps<{
  label: string
  untuk?: string
  wajib?: boolean
  petunjuk?: string
  galat?: string
}>()
</script>

<template>
  <div>
    <label :for="untuk" class="block text-[13px] font-medium text-ink-700">
      {{ label }}
      <span v-if="wajib" class="font-bold text-risiko-tinggi" aria-hidden="true">*</span>
    </label>

    <p v-if="petunjuk" class="mt-0.5 text-xs text-ink-500">{{ petunjuk }}</p>

    <div class="mt-1.5">
      <slot />
    </div>

    <p
      v-if="galat"
      class="mt-1.5 flex items-start gap-1 text-xs font-semibold text-risiko-tinggi"
      role="alert"
    >
      <span aria-hidden="true">⚠</span>
      <span>{{ galat }}</span>
    </p>
  </div>
</template>
