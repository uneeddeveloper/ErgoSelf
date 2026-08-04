<script setup lang="ts">
const { loggedIn, user } = useUserSession()

useHead({ title: 'ErgoSelf — Pengukuran Mandiri Keluhan MSDs' })

const langkah = [
  {
    ikon: 'registrasi',
    judul: 'Daftar Akun',
    isi: 'Buat akun dengan email dan kata sandi, disertai lembar persetujuan penelitian.',
  },
  {
    ikon: 'profil',
    judul: 'Profil Pekerja',
    isi: 'Isi data diri, pekerjaan, tinggi & berat badan. Indeks Massa Tubuh dihitung otomatis.',
  },
  {
    ikon: 'peta-tubuh',
    judul: 'Peta Tubuh',
    isi: 'Tandai bagian tubuh yang terasa nyeri, lalu jawab 3 pertanyaan singkat untuk tiap bagian.',
  },
  {
    ikon: 'penilaian',
    judul: 'Penilaian Aplikasi',
    isi: 'Sepuluh pernyataan singkat untuk menilai kemudahan penggunaan aplikasi ini.',
  },
  {
    ikon: 'ringkasan',
    judul: 'Ringkasan Riset',
    isi: 'Laporan akhir berisi skor risiko, area prioritas, dan rekomendasi ergonomi praktis.',
  },
] as const
</script>

<template>
  <div class="space-y-6">
    <section class="kartu-gelap overflow-hidden">
      <div class="p-6 sm:p-7">
        <p class="label-seksi text-sorot">Instrumen Penelitian</p>
        <h1 class="mt-2 text-2xl leading-tight font-extrabold">
          Pengukuran Mandiri Keluhan Otot &amp; Rangka pada Pengguna Komputer
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-brand-100/90">
          Kuesioner ini membantu Anda menilai sendiri keluhan pada otot dan rangka
          tubuh yang mungkin timbul akibat bekerja dengan komputer. Pengisian
          memakan waktu sekitar <strong>10–15 menit</strong> dan dapat dilakukan
          lewat HP maupun komputer.
        </p>

        <div class="mt-6 space-y-2">
          <UiTombol varian="aksen" :ke="loggedIn ? '/beranda' : '/daftar'">
            {{ loggedIn ? 'Lanjutkan Pengisian' : 'Mulai — Daftar Akun' }}
          </UiTombol>
          <UiTombol v-if="!loggedIn" varian="kedua" ke="/masuk">
            Sudah punya akun
          </UiTombol>
        </div>
      </div>
    </section>

    <section class="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <article v-for="(l, i) in langkah" :key="l.judul" class="kartu-lembut p-4">
        <div class="flex items-center gap-2">
          <span
            class="grid h-9 w-9 place-items-center rounded-xl bg-white/80 text-brand-700 ring-1 ring-brand-600/12"
          >
            <UiIkon :nama="l.ikon" />
          </span>
          <span
            class="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-[11px] font-extrabold text-white"
            aria-hidden="true"
          >
            {{ i + 1 }}
          </span>
        </div>
        <h2 class="mt-2.5 text-sm font-bold text-ink">{{ l.judul }}</h2>
        <p class="mt-1 text-[13px] leading-relaxed text-ink-600">{{ l.isi }}</p>
      </article>
    </section>

    <section class="rounded-kartu border border-brand-300 bg-brand-150 p-5">
      <h2 class="text-sm font-bold text-brand-800">
        Sebelum mulai, mohon diperhatikan
      </h2>
      <ul
        class="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-ink-700"
      >
        <li>
          Isilah sesuai kondisi yang benar-benar Anda rasakan selama 7 hari
          terakhir.
        </li>
        <li>Tidak ada jawaban benar atau salah — kejujuran Anda menentukan mutu hasil.</li>
        <li>
          Identitas Anda tidak akan dipublikasikan; data dilaporkan dalam bentuk
          gabungan seluruh responden.
        </li>
        <li>Keikutsertaan bersifat sukarela dan dapat dihentikan kapan saja.</li>
      </ul>
    </section>

    <p class="text-center text-xs text-ink-500">
      <template v-if="!loggedIn">
        Peneliti?
        <NuxtLink to="/admin/masuk" class="font-semibold text-brand-600 hover:underline">
          Masuk ke dashboard
        </NuxtLink>
      </template>
      <NuxtLink
        v-else-if="user?.tipe === 'ADMIN'"
        to="/admin"
        class="font-semibold text-brand-600 hover:underline"
      >
        Buka dashboard peneliti
      </NuxtLink>
    </p>
  </div>
</template>
