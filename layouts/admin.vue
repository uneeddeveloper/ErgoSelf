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
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-30 border-b border-garis bg-white">
      <div class="mx-auto flex max-w-[1100px] items-center gap-2.5 px-5 py-4 sm:px-7">
        <span class="text-lg text-brand-600" aria-hidden="true">📊</span>
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

    <main class="mx-auto w-full max-w-[1100px] flex-1 px-5 py-7 sm:px-7">
      <slot />
    </main>

    <footer class="border-t border-garis bg-white">
      <div
        class="mx-auto flex max-w-[1100px] flex-wrap justify-between gap-2 px-5 py-4 text-xs text-ink-500 sm:px-7"
      >
        <span>ErgoSelf — Dashboard Peneliti · Magister Terapan K3 UGM</span>
        <span>Data penelitian bersifat rahasia</span>
      </div>
    </footer>
  </div>
</template>
