<script setup lang="ts">
/**
 * Navigasi enam tahap alur responden.
 *
 * SATU definisi tahap, DUA penyajian — bukan dua komponen terpisah. Bilah
 * bawah (ponsel) dan bilah atas (laptop) harus selalu memuat tahap yang sama;
 * begitu daftarnya disalin, satu tahap baru pasti akan lupa ditambahkan ke
 * salah satunya, dan tahap itu menjadi tidak terjangkau di separuh perangkat.
 * Persis itu yang terjadi pada `/tangan` sebelum ini.
 */

const props = withDefaults(
  defineProps<{
    /** 'bawah' = pil mengambang (ponsel) · 'atas' = deret mendatar (laptop) */
    varian?: 'bawah' | 'atas'
  }>(),
  { varian: 'bawah' },
)

const route = useRoute()

const TAHAP = [
  { ke: '/beranda', label: 'Beranda', ikon: 'beranda' },
  { ke: '/kuesioner', label: 'Tubuh', ikon: 'peta-tubuh' },
  { ke: '/tangan', label: 'Tangan', ikon: 'tangan' },
  { ke: '/hasil', label: 'Hasil', ikon: 'hasil' },
  { ke: '/sus', label: 'Aplikasi', ikon: 'penilaian' },
  { ke: '/ringkasan', label: 'Ringkasan', ikon: 'ringkasan' },
] as const

function aktif(ke: string) {
  return route.path === ke || route.path.startsWith(`${ke}/`)
}
</script>

<template>
  <!-- ── Bilah bawah: ponsel & tablet ────────────────────────────────────
    Enam tahap pada layar 360px menyisakan ±52px per butir. Karena itu label
    dipendekkan ("Aplikasi", bukan "Penilaian Aplikasi"), ukurannya 9px sampai
    lebar 400px, dan tiap butir diberi `min-w-0` + `truncate` sebagai penahan
    terakhir — tanpa itu satu label panjang melebarkan seluruh pil hingga
    keluar layar dan menimbulkan gulir mendatar di seluruh halaman.
  -->
  <div
    v-if="props.varian === 'bawah'"
    class="flex justify-between gap-0.5 rounded-full bg-brand-700/95 p-1.5 shadow-(--shadow-timbul) backdrop-blur"
  >
    <NuxtLink
      v-for="t in TAHAP"
      :key="t.ke"
      :to="t.ke"
      class="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-0.5 py-2 text-center transition"
      :class="
        aktif(t.ke)
          ? 'bg-white font-bold text-brand-700'
          : 'text-brand-100/80 hover:bg-white/10'
      "
      :aria-current="aktif(t.ke) ? 'page' : undefined"
    >
      <UiIkon :nama="t.ikon" :ukuran="19" />
      <span class="w-full truncate text-[9px] leading-tight min-[400px]:text-[10px]">
        {{ t.label }}
      </span>
    </NuxtLink>
  </div>

  <!-- ── Bilah atas: laptop ──────────────────────────────────────────────
    Di layar lebar, navigasi bawah kehilangan alasannya: tidak ada ibu jari
    yang perlu dijangkau, dan ia justru memakan tinggi layar yang di situ
    justru paling terbatas.
  -->
  <div v-else class="flex items-center gap-0.5">
    <NuxtLink
      v-for="t in TAHAP"
      :key="t.ke"
      :to="t.ke"
      class="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold whitespace-nowrap transition"
      :class="
        aktif(t.ke)
          ? 'bg-brand-600 text-white'
          : 'text-ink-600 hover:bg-panel hover:text-brand-700'
      "
      :aria-current="aktif(t.ke) ? 'page' : undefined"
    >
      <UiIkon :nama="t.ikon" :ukuran="17" />
      {{ t.label }}
    </NuxtLink>
  </div>
</template>
