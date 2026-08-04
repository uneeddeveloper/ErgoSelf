<script setup lang="ts">
/**
 * Kerangka tampilan responden — tema "klinik sage":
 * latar hijau sage, bilah atas berbentuk pil mengambang, isi halaman di
 * dalam panel krem membulat besar (seperti bodi ponsel), dan navigasi bawah
 * berupa pil hijau pekat yang muncul hanya setelah responden masuk.
 */
const { loggedIn, user, clear } = useUserSession()
const route = useRoute()

const adalahResponden = computed(
  () => loggedIn.value && user.value?.tipe === 'RESPONDEN',
)

const tab = [
  { ke: '/beranda', label: 'Beranda', ikon: 'beranda' },
  { ke: '/kuesioner', label: 'Peta Tubuh', ikon: 'peta-tubuh' },
  { ke: '/hasil', label: 'Hasil', ikon: 'hasil' },
  { ke: '/sus', label: 'Penilaian', ikon: 'penilaian' },
  { ke: '/ringkasan', label: 'Ringkasan', ikon: 'ringkasan' },
] as const

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
  <div class="flex min-h-screen flex-col px-3 pt-3 sm:px-5 sm:pt-5">
    <header class="sticky top-3 z-30 mx-auto w-full max-w-2xl sm:top-5">
      <div
        class="flex items-center gap-3 rounded-full bg-white/85 py-2 pr-2 pl-3.5 shadow-(--shadow-kartu) backdrop-blur"
      >
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
              class="touch-target rounded-full px-4 text-[13px] font-semibold text-ink-600 hover:bg-panel"
              @click="keluar"
            >
              Keluar
            </button>
          </template>
          <NuxtLink
            v-else
            to="/masuk"
            class="touch-target flex items-center rounded-full bg-brand-600 px-5 text-[13px] font-bold text-white hover:bg-brand-700"
          >
            Masuk
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="mx-auto mt-4 w-full max-w-2xl flex-1">
      <div class="layar px-4 py-6 sm:px-6">
        <slot />
      </div>
    </main>

    <!-- Navigasi bawah — pil mengambang, hanya untuk responden yang mengisi -->
    <nav
      v-if="adalahResponden"
      class="sticky bottom-3 z-30 mx-auto mt-4 w-full max-w-lg sm:bottom-5"
      aria-label="Navigasi utama"
    >
      <div
        class="flex justify-between gap-0.5 rounded-full bg-brand-700/95 p-1.5 shadow-(--shadow-timbul) backdrop-blur"
      >
        <NuxtLink
          v-for="t in tab"
          :key="t.ke"
          :to="t.ke"
          class="flex flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-2 text-center text-[10px] transition"
          :class="
            tabAktif(t.ke)
              ? 'bg-white font-bold text-brand-700'
              : 'text-brand-100/80 hover:bg-white/10'
          "
        >
          <UiIkon :nama="t.ikon" :ukuran="20" />
          <span>{{ t.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <footer class="mx-auto w-full max-w-2xl px-2 py-6">
      <p
        v-if="!adalahResponden"
        class="text-[11px] leading-relaxed text-brand-800/75"
      >
        <span class="font-bold text-brand-800">
          Instrumen penelitian tesis — Magister Terapan Keselamatan dan Kesehatan
          Kerja, Universitas Gadjah Mada.
        </span>
        Data yang Anda isi digunakan semata-mata untuk keperluan penelitian dan
        dijaga kerahasiaannya.
      </p>
    </footer>
  </div>
</template>
