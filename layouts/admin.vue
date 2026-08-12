<script setup lang="ts">
/**
 * Kerangka konsol peneliti.
 *
 * Beda tegas dari `layouts/default.vue` (aplikasi responden), dan itu
 * disengaja — alasannya diuraikan di blok "KONSOL PENELITI" pada
 * `assets/css/main.css`.
 *
 * Bentuknya: bilah navigasi TETAP di kiri + area kerja selebar sisa layar.
 * Versi sebelumnya memakai kartu mengambang selebar 1100px di tengah layar
 * bergradien, sehingga pada laptop 1440px sepertiga lebar layar terbuang
 * menjadi latar hijau, sementara tabel 6 kolom di dalamnya harus digulir
 * mendatar. Navigasinya pun ikut tergulir hilang bersama isi halaman.
 */
const { user, clear } = useUserSession()
const route = useRoute()

const inisial = computed(
  () => user.value?.nama?.trim().charAt(0).toUpperCase() ?? 'P',
)

const MENU = [
  { ke: '/admin', label: 'Dasbor', ikon: 'dasbor' as const },
  { ke: '/admin/pengaturan', label: 'Pengaturan', ikon: 'pengaturan' as const },
]

/**
 * `NuxtLink` bawaan menandai `/admin` sebagai aktif juga ketika berada di
 * `/admin/pengaturan`, karena pencocokannya berbasis awalan. Dua butir menu
 * menyala sekaligus, dan peneliti kehilangan satu-satunya penanda posisi.
 */
function aktif(ke: string) {
  return route.path === ke
}

async function keluar() {
  await $fetch('/api/auth/keluar', { method: 'POST' })
  await clear()
  await navigateTo('/admin/masuk')
}
</script>

<template>
  <div class="konsol-ground min-h-screen">
    <!-- ── Bilah navigasi kiri ──────────────────────────────────────────── -->
    <aside
      class="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-rail-garis bg-rail lg:flex"
    >
      <div class="flex items-center gap-2.5 px-5 py-5">
        <UiLogo :ukuran="30" />
        <div class="min-w-0">
          <p class="text-[15px] leading-tight font-bold text-white">ErgoSelf</p>
          <p class="konsol-label text-[10px] text-rail-teks">Konsol Peneliti</p>
        </div>
      </div>

      <nav class="flex-1 space-y-0.5 px-3" aria-label="Navigasi konsol">
        <NuxtLink
          v-for="m in MENU"
          :key="m.ke"
          :to="m.ke"
          class="rail-tautan"
          :class="
            aktif(m.ke)
              ? 'bg-rail-2 text-white'
              : 'hover:bg-rail-2/60 hover:text-white'
          "
          :aria-current="aktif(m.ke) ? 'page' : undefined"
        >
          <UiIkon :nama="m.ikon" :ukuran="17" />
          {{ m.label }}
        </NuxtLink>
      </nav>

      <!--
        Peringatan kerahasiaan diletakkan di bilah, bukan di kaki halaman.
        Di kaki ia hanya terlihat setelah menggulir melewati seluruh tabel —
        yaitu justru setelah data terbaca, bukan sebelumnya.
      -->
      <p
        class="mx-3 mb-3 rounded-konsol-kecil border border-rail-garis px-3 py-2.5 text-[11px] leading-relaxed text-rail-teks"
      >
        Layar ini memuat data kesehatan responden. Jangan tampilkan di ruang
        terbuka dan jangan bagikan berkas ekspornya.
      </p>

      <div class="border-t border-rail-garis p-3">
        <div class="flex items-center gap-2.5">
          <span
            class="grid size-8 shrink-0 place-items-center rounded-konsol-kecil bg-rail-2 text-[13px] font-bold text-white"
            aria-hidden="true"
          >
            {{ inisial }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[13px] font-semibold text-white">
              {{ user?.nama }}
            </span>
            <span class="block truncate text-[11px] text-rail-teks">
              {{ user?.email }}
            </span>
          </span>
        </div>
        <button
          type="button"
          class="rail-tautan mt-1.5 w-full hover:bg-rail-2/60 hover:text-white"
          @click="keluar"
        >
          <UiIkon nama="keluar" :ukuran="17" /> Keluar
        </button>
      </div>
    </aside>

    <!-- ── Bilah ringkas untuk layar sempit ─────────────────────────────── -->
    <header
      class="sticky top-0 z-40 flex items-center gap-3 border-b border-rail-garis bg-rail px-4 py-2.5 lg:hidden"
    >
      <UiLogo :ukuran="26" />
      <span class="text-sm font-bold text-white">ErgoSelf</span>
      <nav class="ml-auto flex items-center gap-1" aria-label="Navigasi konsol">
        <NuxtLink
          v-for="m in MENU"
          :key="m.ke"
          :to="m.ke"
          class="rail-tautan"
          :class="aktif(m.ke) ? 'bg-rail-2 text-white' : ''"
          :aria-current="aktif(m.ke) ? 'page' : undefined"
        >
          <UiIkon :nama="m.ikon" :ukuran="16" />
          <span class="hidden sm:inline">{{ m.label }}</span>
        </NuxtLink>
        <button type="button" class="rail-tautan" @click="keluar">
          <UiIkon nama="keluar" :ukuran="16" />
          <span class="sr-only">Keluar</span>
        </button>
      </nav>
    </header>

    <!-- ── Area kerja ───────────────────────────────────────────────────── -->
    <div class="lg:pl-[232px]">
      <!--
        Lebar maksimum 1600px, bukan 1100px: tabel rekapitulasi punya tujuh
        kolom yang perlu terbaca sekaligus. Di atas itu barisnya menjadi
        terlalu panjang untuk dilacak mata dari kode responden ke kolom skor.
      -->
      <main class="mx-auto w-full max-w-[1600px] px-4 py-5 lg:px-7 lg:py-7">
        <slot />
      </main>
    </div>
  </div>
</template>
