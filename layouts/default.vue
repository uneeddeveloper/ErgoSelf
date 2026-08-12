<script setup lang="ts">
/**
 * Kerangka tampilan responden — tema "klinik sage":
 * latar hijau sage, bilah atas berbentuk pil mengambang, isi halaman di
 * dalam panel krem membulat besar (seperti bodi ponsel).
 *
 * LEBAR TUMBUH BERTAHAP, tidak dikunci pada satu ukuran ponsel.
 * Sebelumnya seluruh kerangka dipaku `max-w-2xl` (672px), sehingga pada
 * laptop 1440px aplikasi tampil sebagai pita sempit di tengah lautan hijau —
 * dan halaman hasil yang isinya berupa tumpukan kartu harus digulir jauh
 * padahal ruang mendatarnya berlimpah. Kini panelnya melebar di `lg`, dan
 * halaman yang memang punya isi berdampingan (hasil, ringkasan, peta tubuh)
 * memakai ruang itu lewat grid dua kolomnya sendiri.
 *
 * Navigasi pindah tempat, bukan sekadar ikut melebar: pil bawah di ponsel
 * (terjangkau ibu jari), deret mendatar di kepala pada laptop (tidak ada ibu
 * jari yang perlu dijangkau, dan tinggi layar justru yang paling terbatas).
 */
const { loggedIn, user, clear } = useUserSession()

const adalahResponden = computed(
  () => loggedIn.value && user.value?.tipe === 'RESPONDEN',
)

async function keluar() {
  await $fetch('/api/auth/keluar', { method: 'POST' })
  await clear()
  await navigateTo('/')
}
</script>

<template>
  <div class="flex min-h-screen flex-col px-3 pt-3 sm:px-5 sm:pt-5">
    <header class="sticky top-3 z-30 mx-auto w-full max-w-2xl lg:max-w-6xl sm:top-5">
      <div
        class="flex items-center gap-3 rounded-full bg-white/85 py-2 pr-2 pl-3.5 shadow-(--shadow-kartu) backdrop-blur"
      >
        <NuxtLink to="/" class="flex shrink-0 items-center gap-2.5">
          <UiLogo :ukuran="30" />
          <span class="text-[17px] leading-none font-extrabold text-brand-600">
            ErgoSelf
          </span>
        </NuxtLink>

        <!-- Navigasi mendatar hanya di laptop; di bawah itu ia ada di pil bawah -->
        <nav
          v-if="adalahResponden"
          class="mx-auto hidden lg:flex"
          aria-label="Navigasi utama"
        >
          <NavResponden varian="atas" />
        </nav>

        <div class="ml-auto flex shrink-0 items-center gap-2">
          <template v-if="loggedIn && user">
            <!--
              Muncul di `sm` (ponsel besar & tablet, tanpa navigasi mendatar)
              lalu SEMBUNYI lagi di `lg` sampai `xl`. Di rentang itu bilah
              kepala harus memuat logo, enam tab, identitas, dan tombol keluar
              sekaligus — pada 1024px totalnya melewati lebar yang tersedia,
              dan tab terakhir terdorong keluar pil.
            -->
            <span
              class="hidden text-right text-[11px] leading-tight sm:block lg:hidden xl:block"
            >
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

    <main class="mx-auto mt-4 w-full max-w-2xl flex-1 lg:max-w-6xl">
      <div class="layar px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </div>
    </main>

    <!-- Navigasi bawah — pil mengambang, hanya untuk responden di layar sempit -->
    <nav
      v-if="adalahResponden"
      class="sticky bottom-3 z-30 mx-auto mt-4 w-full max-w-lg sm:bottom-5 lg:hidden"
      aria-label="Navigasi utama"
    >
      <NavResponden varian="bawah" />
    </nav>

    <footer class="mx-auto w-full max-w-2xl px-2 py-6 lg:max-w-6xl">
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
