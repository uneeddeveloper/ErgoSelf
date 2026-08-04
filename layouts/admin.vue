<script setup lang="ts">
/** Kerangka dashboard peneliti (desktop) — mengikuti mockup layar 08. */
const { user, clear } = useUserSession()

const inisial = computed(() => user.value?.nama?.trim().charAt(0).toUpperCase() ?? 'A')

async function keluar() {
  await $fetch('/api/auth/keluar', { method: 'POST' })
  await clear()
  await navigateTo('/admin/masuk')
}
</script>

<template>
  <div class="flex min-h-screen flex-col px-3 pt-3 sm:px-5 sm:pt-5">
    <header class="sticky top-3 z-30 mx-auto w-full max-w-[1100px] sm:top-5">
      <div
        class="flex items-center gap-2.5 rounded-full bg-white/90 py-2.5 pr-2.5 pl-5 shadow-(--shadow-kartu) backdrop-blur"
      >
        <UiIkon nama="dasbor" :ukuran="20" class="text-brand-600" />
        <UiLogo :ukuran="30" />
        <NuxtLink
          to="/admin"
          class="text-[19px] font-extrabold text-brand-600"
        >
          ErgoSelf
        </NuxtLink>

        <div class="ml-auto flex items-center gap-3">
          <span class="hidden text-right text-[11px] leading-tight sm:block">
            <span class="block font-semibold text-ink-700">{{ user?.nama }}</span>
            <span class="block text-ink-500">{{ user?.email }}</span>
          </span>
          <span
            class="grid h-[34px] w-[34px] place-items-center rounded-full bg-brand-600 font-bold text-white"
            aria-hidden="true"
          >
            {{ inisial }}
          </span>
          <button
            type="button"
            class="touch-target rounded-input px-3 text-[13px] font-semibold text-ink-500 hover:bg-panel"
            @click="keluar"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto mt-4 w-full max-w-[1100px] flex-1">
      <div class="layar px-5 py-7 sm:px-7">
        <slot />
      </div>
    </main>

    <footer
      class="mx-auto flex w-full max-w-[1100px] flex-wrap justify-between gap-2 px-2 py-6 text-xs text-brand-800/75"
    >
      <span>ErgoSelf — Dashboard Peneliti · Magister Terapan K3 UGM</span>
      <span>Data penelitian bersifat rahasia</span>
    </footer>
  </div>
</template>
