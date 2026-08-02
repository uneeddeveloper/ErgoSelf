<script setup lang="ts">
/**
 * Kerangka tampilan responden — mengikuti mockup layar mobile 360px:
 * bilah atas putih dengan judul teal, isi di atas latar gradien, dan
 * navigasi bawah 4 tab yang muncul hanya setelah responden masuk.
 */
const { loggedIn, user, clear } = useUserSession()
const route = useRoute()

const adalahResponden = computed(
  () => loggedIn.value && user.value?.tipe === 'RESPONDEN',
)

const tab = [
  { ke: '/beranda', label: 'Beranda', ikon: '🏠' },
  { ke: '/kuesioner', label: 'Peta Tubuh', ikon: '🗺' },
  { ke: '/hasil', label: 'Hasil', ikon: '📈' },
  { ke: '/sus', label: 'Penilaian', ikon: '📝' },
  { ke: '/ringkasan', label: 'Ringkasan', ikon: '📄' },
]

function tabAktif(ke: string) {
  return route.path === ke || route.path.startsWith(`${ke}/`)
}

async function keluar() {
  await $fetch('/api/auth/keluar', { method: 'POST' })
  await clear()
  await navigateTo('/')
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-30 border-b border-garis bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5">
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <UiLogo :ukuran="30" />
          <span class="text-[17px] leading-none font-extrabold text-brand-600">
            ErgoSelf
          </span>
        </NuxtLink>

        <div class="ml-auto flex items-center gap-2">
          <template v-if="loggedIn && user">
            <span class="hidden text-right text-[11px] leading-tight sm:block">
              <span class="block font-semibold text-ink-700">{{ user.nama }}</span>
              <span class="block font-mono text-brand-600">
                {{ user.tipe === 'ADMIN' ? 'Peneliti' : user.kodeResponden }}
              </span>
            </span>
            <button
              type="button"
              class="touch-target rounded-input px-3 text-[13px] font-semibold text-ink-500 hover:bg-panel"
              @click="keluar"
            >
              Keluar
            </button>
          </template>
          <NuxtLink
            v-else
            to="/masuk"
            class="touch-target flex items-center rounded-input px-3 text-[13px] font-semibold text-brand-600 hover:bg-brand-50"
          >
            Masuk
          </NuxtLink>
        </div>
      </div>
    </header>

    <main
      class="mx-auto w-full max-w-2xl flex-1 px-4 py-6"
      :class="adalahResponden ? 'pb-28' : 'pb-10'"
    >
      <slot />
    </main>

    <!-- Navigasi bawah — hanya untuk responden yang sedang mengisi -->
    <nav
      v-if="adalahResponden"
      class="fixed inset-x-0 bottom-0 z-30 border-t border-garis bg-panel"
      aria-label="Navigasi utama"
    >
      <div class="mx-auto flex max-w-2xl justify-around">
        <NuxtLink
          v-for="t in tab"
          :key="t.ke"
          :to="t.ke"
          class="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-center text-[10px] transition sm:text-[11px]"
          :class="
            tabAktif(t.ke)
              ? 'font-bold text-brand-600'
              : 'text-ink-500 hover:text-ink-700'
          "
        >
          <span class="text-base leading-none" aria-hidden="true">{{ t.ikon }}</span>
          <span>{{ t.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <footer v-if="!adalahResponden" class="border-t border-garis bg-white">
      <div class="mx-auto max-w-2xl px-4 py-5 text-[11px] leading-relaxed text-ink-500">
        <p class="font-semibold text-ink-600">
          Instrumen penelitian tesis — Magister Terapan Keselamatan dan Kesehatan
          Kerja, Universitas Gadjah Mada
        </p>
        <p class="mt-1">
          Data yang Anda isi digunakan semata-mata untuk keperluan penelitian dan
          dijaga kerahasiaannya.
        </p>
      </div>
    </footer>
  </div>
</template>
