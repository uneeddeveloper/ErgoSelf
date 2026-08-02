<script setup lang="ts">
useHead({ title: 'Masuk Peneliti — ErgoSelf' })

const route = useRoute()
const { fetch: muatSesi } = useUserSession()

const form = reactive({ email: '', password: '' })
const galat = ref('')
const mengirim = ref(false)

async function masuk() {
  galat.value = ''
  mengirim.value = true

  try {
    await $fetch('/api/auth/admin', { method: 'POST', body: form })
    await muatSesi()

    const lanjut = route.query.lanjut
    await navigateTo(typeof lanjut === 'string' ? lanjut : '/admin')
  } catch (error: any) {
    galat.value =
      error?.data?.statusMessage ??
      error?.statusMessage ??
      'Gagal masuk. Periksa koneksi Anda lalu coba lagi.'
  } finally {
    mengirim.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <div class="kartu p-6">
      <div class="flex items-center gap-2.5">
        <UiLogo :ukuran="30" />
        <p class="label-seksi">Dashboard Peneliti</p>
      </div>
      <h1 class="mt-2 text-xl font-extrabold text-ink">Masuk Peneliti</h1>
      <p class="mt-1.5 text-sm text-ink-600">
        Akses rekapitulasi, grafik deskriptif, dan ekspor data penelitian.
      </p>

      <p
        v-if="galat"
        class="mt-5 rounded-input bg-risiko-tinggi-bg px-4 py-3 text-sm font-semibold text-risiko-tinggi-teks"
        role="alert"
      >
        {{ galat }}
      </p>

      <form class="mt-5 space-y-4" novalidate @submit.prevent="masuk">
        <UiKolom label="Email" untuk="email" wajib>
          <input
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="username"
            required
            class="isian focus:isian-fokus"
          />
        </UiKolom>

        <UiKolom label="Kata sandi" untuk="password" wajib>
          <input
            id="password"
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            required
            class="isian focus:isian-fokus"
          />
        </UiKolom>

        <UiTombol type="submit" :disabled="mengirim">
          {{ mengirim ? 'Memeriksa…' : 'Masuk' }}
        </UiTombol>
      </form>

      <p class="mt-5 border-t border-garis pt-4 text-center text-sm text-ink-600">
        Anda responden?
        <NuxtLink to="/masuk" class="font-bold text-brand-600 hover:underline">
          Masuk di sini
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
