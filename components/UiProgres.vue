<script setup lang="ts">
/** Bilah kemajuan pengisian 4 tahap, sesuai mockup layar 03–06. */
const props = defineProps<{
  tahap: number
  totalTahap?: number
  keterangan?: string
}>()

const total = computed(() => props.totalTahap ?? 4)
const persen = computed(() =>
  Math.min(100, Math.max(0, (props.tahap / total.value) * 100)),
)
</script>

<template>
  <div>
    <div class="mb-1.5 flex items-center justify-between text-[13px]">
      <span class="text-ink-700">{{ keterangan ?? 'Kemajuan Pengisian' }}</span>
      <span class="font-bold text-brand-600">
        Tahap {{ tahap }} dari {{ total }}
      </span>
    </div>
    <div
      class="h-1.5 overflow-hidden rounded-full bg-garis"
      role="progressbar"
      :aria-valuenow="tahap"
      :aria-valuemin="0"
      :aria-valuemax="total"
      :aria-label="`Tahap ${tahap} dari ${total}`"
    >
      <div
        class="h-full rounded-full bg-brand-600 transition-[width] duration-300"
        :style="{ width: `${persen}%` }"
      />
    </div>
  </div>
</template>
