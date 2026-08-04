<script setup lang="ts">
import { PANJANG_SANDI_MIN, skemaDaftarAkun } from '~~/lib/validasi/akun'
import { petaGalat } from '~~/lib/validasi/responden'

/**
 * Langkah 1 alur responden — Registrasi Akun (mockup layar 01).
 *
 * Halaman ini hanya membuat akun dan merekam persetujuan etik. Data
 * demografi diisi pada langkah berikutnya di `/profil`.
 */
useHead({ title: 'Daftar Responden — ErgoSelf' })

const { fetch: muatSesi } = useUserSession()

const form = reactive({
  nama: '',
  email: '',
  password: '',
  konfirmasiPassword: '',
  setujuEtik: false,
})

const galat = ref<Record<string, string>>({})
const galatUmum = ref('')
const mengirim = ref(false)
const lihatSandi = ref(false)

function bersihkanGalat(field: string) {
  if (galat.value[field]) delete galat.value[field]
}

async function daftar() {
  galatUmum.value = ''

  const cek = skemaDaftarAkun.safeParse(form)
  if (!cek.success) {
    galat.value = petaGalat(cek.error)
    galatUmum.value = 'Periksa kembali isian yang ditandai merah.'
    await nextTick()
    document
      .querySelector('[data-galat="true"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  galat.value = {}
  mengirim.value = true

  try {
    await $fetch('/api/auth/daftar', { method: 'POST', body: cek.data })
    await muatSesi()
    await navigateTo('/profil')
  } catch (error: any) {
    const dariServer = error?.data?.data?.galat ?? error?.data?.galat
    if (dariServer) {
      galat.value = dariServer
      galatUmum.value =
        error?.data?.statusMessage ?? 'Periksa kembali isian yang ditandai merah.'
    } else {
      galatUmum.value =
        error?.data?.statusMessage ??
        error?.statusMessage ??
        'Gagal membuat akun. Periksa koneksi Anda lalu coba lagi.'
    }
  } finally {
    mengirim.value = false
  }
}

function kelasFor(field: string) {
  return ['isian focus:isian-fokus', galat.value[field] ? 'isian-galat' : '']
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-4">
    <UiProgres :tahap="1" :total-tahap="5" keterangan="Registrasi akun" />

    <div class="kartu space-y-4 p-5">
      <div>
        <p class="label-seksi">Registrasi Akun</p>
        <h1 class="mt-1 text-[22px] font-extrabold text-ink">
          Daftar Responden Baru
        </h1>
        <p class="mt-2 text-sm leading-relaxed text-ink-600">
          Silakan lengkapi formulir di bawah ini untuk bergabung dalam penelitian
          kesehatan kerja kami.
        </p>
      </div>

      <p
        v-if="galatUmum"
        class="rounded-input bg-risiko-tinggi-bg px-4 py-3 text-sm font-semibold text-risiko-tinggi-teks"
        role="alert"
      >
        {{ galatUmum }}
      </p>

      <form class="space-y-4" novalidate @submit.prevent="daftar">
        <UiKolom
          label="Nama lengkap"
          untuk="nama"
          wajib
          :galat="galat.nama"
          :data-galat="!!galat.nama"
        >
          <input
            id="nama"
            v-model="form.nama"
            type="text"
            autocomplete="name"
            placeholder="Contoh: Budi Santoso"
            :class="kelasFor('nama')"
            @input="bersihkanGalat('nama')"
          />
        </UiKolom>

        <UiKolom
          label="Email"
          untuk="email"
          wajib
          petunjuk="Dipakai untuk masuk kembali ke aplikasi"
          :galat="galat.email"
          :data-galat="!!galat.email"
        >
          <input
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            placeholder="email@perusahaan.co.id"
            :class="kelasFor('email')"
            @input="bersihkanGalat('email')"
          />
        </UiKolom>

        <UiKolom
          label="Kata sandi"
          untuk="password"
          wajib
          :petunjuk="`Minimal ${PANJANG_SANDI_MIN} karakter`"
          :galat="galat.password"
          :data-galat="!!galat.password"
        >
          <div class="relative">
            <input
              id="password"
              v-model="form.password"
              :type="lihatSandi ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="••••••••"
              :class="[...kelasFor('password'), 'pr-16']"
              @input="bersihkanGalat('password')"
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

        <UiKolom
          label="Konfirmasi kata sandi"
          untuk="konfirmasi"
          wajib
          :galat="galat.konfirmasiPassword"
          :data-galat="!!galat.konfirmasiPassword"
        >
          <input
            id="konfirmasi"
            v-model="form.konfirmasiPassword"
            :type="lihatSandi ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="••••••••"
            :class="kelasFor('konfirmasiPassword')"
            @input="bersihkanGalat('konfirmasiPassword')"
          />
        </UiKolom>

        <PersetujuanEtik />

        <div :data-galat="!!galat.setujuEtik">
          <label
            class="flex cursor-pointer items-start gap-2.5 rounded-input border p-3 transition"
            :class="
              galat.setujuEtik
                ? 'border-risiko-tinggi bg-aksen-lembut/60'
                : form.setujuEtik
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-garis-kuat bg-white hover:bg-brand-50'
            "
          >
            <input
              v-model="form.setujuEtik"
              type="checkbox"
              class="mt-0.5 h-4.5 w-4.5 shrink-0 accent-teal-600"
              @change="bersihkanGalat('setujuEtik')"
            />
            <span class="text-[13px] leading-relaxed text-ink-700">
              Saya telah membaca dan menyetujui
              <strong>ketentuan penelitian</strong> serta kebijakan kerahasiaan
              data kesehatan, dan bersedia mengikuti penelitian ini secara
              sukarela.
            </span>
          </label>
          <p
            v-if="galat.setujuEtik"
            class="mt-1.5 flex items-start gap-1 text-xs font-semibold text-risiko-tinggi"
            role="alert"
          >
            <UiIkon nama="peringatan" :ukuran="15" />
            <span>{{ galat.setujuEtik }}</span>
          </p>
        </div>

        <UiTombol varian="aksen" type="submit" :disabled="mengirim">
          {{ mengirim ? 'Mendaftarkan…' : 'Daftar Sekarang' }}
        </UiTombol>
      </form>

      <p class="border-t border-garis pt-4 text-center text-sm text-ink-600">
        Sudah memiliki akun?
        <NuxtLink to="/masuk" class="font-bold text-brand-600 hover:underline">
          Masuk di sini
        </NuxtLink>
      </p>
    </div>

    <div class="flex flex-wrap justify-center gap-2.5">
      <span
        v-for="t in [
          { ikon: 'terkunci', teks: 'Data Terenkripsi' },
          { ikon: 'registrasi', teks: 'Standar Etik Penelitian' },
        ] as const"
        :key="t.teks"
        class="inline-flex items-center gap-1.5 rounded-full border border-garis-kuat bg-white px-3.5 py-2 text-xs text-ink-700"
      >
        <UiIkon :nama="t.ikon" :ukuran="15" class="text-brand-600" />
        {{ t.teks }}
      </span>
    </div>
  </div>
</template>
