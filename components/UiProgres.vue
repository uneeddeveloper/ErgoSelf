<script setup lang="ts">
import { TOTAL_TAHAP } from '~~/lib/alur'

/**
 * Bilah kemajuan pengisian.
 *
 * Bawaan `totalTahap` mengambil dari `lib/alur.ts` supaya penyebutnya tidak
 * bisa lagi berbeda antar halaman — sebelumnya nilai bawaannya 4 sementara
 * beberapa halaman mengirim 5, sehingga bilahnya menyusut saat responden maju.
 */
const props = defineProps<{
  tahap: number
  totalTahap?: number
  keterangan?: string
}>()

const total = computed(() => props.totalTahap ?? TOTAL_TAHAP)
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
