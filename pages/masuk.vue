<script setup lang="ts">
/** Masuk responden — email + kata sandi (mockup layar "Masuk"). */
useHead({ title: 'Masuk Responden — ErgoSelf' })

const route = useRoute()
const { fetch: muatSesi } = useUserSession()

const form = reactive({ email: '', password: '' })
const galat = ref(
  route.query.galat === 'google' ? 'Gagal masuk dengan Google. Silakan coba lagi.' : '',
)
const mengirim = ref(false)
const lihatSandi = ref(false)

async function masuk() {
  galat.value = ''
  mengirim.value = true

  try {
    const hasil = await $fetch('/api/auth/responden', {
      method: 'POST',
      body: form,
    })
    await muatSesi()

    const lanjut = route.query.lanjut
    if (typeof lanjut === 'string') {
      await navigateTo(lanjut)
      return
    }
    // Arahkan langsung ke langkah yang belum selesai.
    await navigateTo(
      hasil.responden.statusProfil === 'SELESAI' ? '/beranda' : '/profil',
    )
  } catch (error: any) {
    galat.value =
      error?.data?.statusMessage ??
      error?.statusMessage ??
      'Gagal masuk. Periksa koneksi Anda lalu coba lagi.'
  } finally {
    mengirim.value = false
  }
}
//  Fungsi untuk mengarahkan pengguna ke endpoint OAuth Google
function masukDenganGoogle() {
  window.location.href = '/api/auth/google'
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <div class="kartu space-y-4 p-5">
      <div>
        <p class="label-seksi">Masuk Responden</p>
        <h1 class="mt-1 text-[22px] font-extrabold text-ink">Selamat Datang Kembali</h1>
        <p class="mt-2 text-sm leading-relaxed text-ink-600">
          Masuk dengan email dan kata sandi yang Anda buat saat mendaftar untuk
          melanjutkan pengisian.
        </p>
      </div>

      <p
        v-if="galat"
        class="rounded-input bg-risiko-tinggi-bg px-4 py-3 text-sm font-semibold text-risiko-tinggi-teks"
        role="alert"
      >
        {{ galat }}
      </p>

      <form class="space-y-4" novalidate @submit.prevent="masuk">
        <UiKolom label="Email" untuk="email" wajib>
          <input
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            required
            placeholder="email@perusahaan.co.id"
            class="isian focus:isian-fokus"
            @input="galat = ''"
          />
        </UiKolom>

        <UiKolom label="Kata sandi" untuk="password" wajib>
          <div class="relative">
            <input
              id="password"
              v-model="form.password"
              :type="lihatSandi ? 'text' : 'password'"
              autocomplete="current-password"
              required
              placeholder="••••••••"
              class="isian pr-16 focus:isian-fokus"
              @input="galat = ''"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 px-3 text-xs font-bold text-brand-600"
              :aria-label="lihatSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
              @click="lihatSandi = !lihatSandi"
            >
              {{ lihatSandi ? 'Tutup' : 'Lihat' }}
            </button>
          </div>
        </UiKolom>

        <UiTombol type="submit" :disabled="mengirim">
          {{ mengirim ? 'Memeriksa…' : 'Masuk' }}
        </UiTombol>
      </form>

      <!-- Pembatas "atau" & Tombol Google -->
      <div class="relative flex items-center py-1">
        <div class="flex-grow border-t border-garis"></div>
        <span class="flex-shrink-0 px-3 text-xs text-ink-500">atau</span>
        <div class="flex-grow border-t border-garis"></div>
      </div>

      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-input border border-garis bg-white py-2.5 text-sm font-bold text-ink transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        @click="masukDenganGoogle"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Masuk dengan Google
      </button>

      <p class="border-t border-garis pt-4 text-center text-sm text-ink-600">
        Belum punya akun?
        <NuxtLink to="/daftar" class="font-bold text-brand-600 hover:underline">
          Daftar di sini
        </NuxtLink>
      </p>
    </div>

    <p class="mt-4 text-center text-xs text-ink-500">
      Peneliti?
      <NuxtLink to="/admin/masuk" class="font-semibold text-brand-600 hover:underline">
        Masuk ke dashboard
      </NuxtLink>
    </p>
  </div>
</template>
