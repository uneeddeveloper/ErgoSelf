<script setup lang="ts">
/** Masuk responden — email + kata sandi (mockup layar "Masuk"). */
useHead({ title: 'Masuk Responden — ErgoSelf' })

const route = useRoute()
const { fetch: muatSesi } = useUserSession()

const form = reactive({ email: '', password: '' })
const galat = ref('')
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
