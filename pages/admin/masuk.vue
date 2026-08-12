<script setup lang="ts">
/**
 * Pintu masuk konsol peneliti.
 *
 * Memakai `layout: false` — bukan kerangka responden. Halaman ini adalah
 * ambang menuju konsol, dan bila ia tampil dengan bilah navigasi responden
 * lalu berpindah ke layar gelap padat, peneliti sempat mengira salah alamat.
 */
definePageMeta({ layout: false })
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
  <div class="grid min-h-screen bg-rail lg:grid-cols-[1.1fr_1fr]">
    <!-- Sisi kiri: identitas instrumen. Disembunyikan di layar sempit supaya
         form tidak terdorong ke bawah lipatan. -->
    <aside class="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
      <!-- Kisi kertas milimeter, motif yang sama dengan permukaan kerja konsol -->
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.07]"
        style="
          background-image:
            linear-gradient(#fff 1px, transparent 1px),
            linear-gradient(90deg, #fff 1px, transparent 1px);
          background-size: 28px 28px;
        "
        aria-hidden="true"
      />

      <div class="relative flex items-center gap-2.5">
        <UiLogo :ukuran="32" />
        <div>
          <p class="text-[16px] leading-tight font-bold text-white">ErgoSelf</p>
          <p class="konsol-label text-[10px] text-rail-teks">Konsol Peneliti</p>
        </div>
      </div>

      <div class="relative max-w-lg">
        <h2 class="text-[26px] leading-tight font-bold text-white">
          Pengukuran mandiri keluhan muskuloskeletal pada pengguna komputer
        </h2>
        <p class="mt-3 text-[13px] leading-relaxed text-rail-teks">
          Instrumen Cornell Musculoskeletal Discomfort Questionnaire (18 item)
          dan Cornell Hand Discomfort Questionnaire (6 area × 2 tangan),
          didampingi System Usability Scale.
        </p>

        <dl class="mt-7 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-konsol-kecil border border-rail-garis bg-rail-garis">
          <div class="bg-rail-2 px-3 py-2.5">
            <dt class="konsol-label text-[10px] text-rail-teks">CMDQ</dt>
            <dd class="konsol-angka text-[15px] font-semibold text-white">
              18 item
            </dd>
          </div>
          <div class="bg-rail-2 px-3 py-2.5">
            <dt class="konsol-label text-[10px] text-rail-teks">CHDQ</dt>
            <dd class="konsol-angka text-[15px] font-semibold text-white">
              12 area
            </dd>
          </div>
          <div class="bg-rail-2 px-3 py-2.5">
            <dt class="konsol-label text-[10px] text-rail-teks">SUS</dt>
            <dd class="konsol-angka text-[15px] font-semibold text-white">
              10 item
            </dd>
          </div>
        </dl>
      </div>

      <p class="relative text-[11px] leading-relaxed text-rail-teks">
        Magister Terapan Keselamatan dan Kesehatan Kerja · Universitas Gadjah
        Mada
      </p>
    </aside>

    <!-- Sisi kanan: form -->
    <main class="konsol-ground flex items-center justify-center p-6">
      <div class="w-full max-w-sm">
        <div class="mb-6 flex items-center gap-2.5 lg:hidden">
          <UiLogo :ukuran="28" />
          <div>
            <p class="text-[15px] leading-tight font-bold text-ink">ErgoSelf</p>
            <p class="konsol-label text-[10px]">Konsol Peneliti</p>
          </div>
        </div>

        <h1 class="text-xl font-bold text-ink">Masuk Peneliti</h1>
        <p class="mt-1 text-[13px] leading-relaxed text-ink-600">
          Akses rekapitulasi, grafik deskriptif, pengaturan instrumen, dan
          ekspor data penelitian.
        </p>

        <p
          v-if="galat"
          class="mt-5 rounded-konsol-kecil border border-risiko-tinggi/30 bg-risiko-tinggi-bg px-3 py-2.5 text-[13px] font-medium text-risiko-tinggi-teks"
          role="alert"
        >
          {{ galat }}
        </p>

        <form class="mt-5 space-y-3.5" novalidate @submit.prevent="masuk">
          <div>
            <label class="konsol-label" for="email">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="username"
              required
              class="konsol-isian mt-1.5 h-10"
            />
          </div>

          <div>
            <label class="konsol-label" for="password">Kata sandi</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              required
              class="konsol-isian mt-1.5 h-10"
            />
          </div>

          <button
            type="submit"
            class="konsol-tombol-utama h-10 w-full"
            :disabled="mengirim"
            :class="mengirim && 'opacity-60'"
          >
            {{ mengirim ? 'Memeriksa…' : 'Masuk' }}
          </button>
        </form>

        <p class="mt-6 border-t border-kertas-garis pt-4 text-[13px] text-ink-600">
          Anda responden?
          <NuxtLink to="/masuk" class="font-semibold text-brand-600 hover:underline">
            Masuk di sini
          </NuxtLink>
        </p>
      </div>
    </main>
  </div>
</template>
