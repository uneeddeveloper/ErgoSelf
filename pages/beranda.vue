<script setup lang="ts">
/**
 * Beranda responden — peta jalan seluruh alur asesmen:
 * registrasi → profil → peta tubuh → penilaian SUS → ringkasan riset.
 */
definePageMeta({ middleware: 'responden' })
useHead({ title: 'Beranda Responden — ErgoSelf' })

const { data: profil, pending, error } = await useFetch('/api/responden/saya')

const LABEL_JK = { LAKI_LAKI: 'Laki-laki', PEREMPUAN: 'Perempuan' } as const

const langkah = computed(() => {
  const p = profil.value
  if (!p) return []

  const cmdqSiap = p.statusProfil === 'SELESAI'
  const susSiap = p.statusCmdq === 'SELESAI'

  return [
    {
      no: 1,
      ikon: 'registrasi',
      judul: 'Registrasi & Persetujuan',
      keterangan: 'Akun dibuat, persetujuan etik terekam',
      status: 'SELESAI' as const,
      tautan: null,
      terkunci: false,
    },
    {
      no: 2,
      ikon: 'profil',
      judul: 'Profil Pekerja',
      keterangan: 'Demografi, pekerjaan, tinggi & berat badan',
      status: p.statusProfil,
      tautan: '/profil',
      terkunci: false,
    },
    {
      no: 3,
      ikon: 'peta-tubuh',
      judul: 'Kuesioner CMDQ',
      keterangan: 'Peta tubuh 28 bagian + frekuensi & intensitas',
      status: p.statusCmdq,
      tautan: '/kuesioner',
      terkunci: !cmdqSiap,
    },
    {
      no: 4,
      ikon: 'penilaian',
      judul: 'Penilaian Aplikasi (SUS)',
      keterangan: '10 pernyataan singkat',
      status: p.statusSus,
      tautan: '/sus',
      terkunci: !susSiap,
    },
    {
      no: 5,
      ikon: 'ringkasan',
      judul: 'Ringkasan Riset',
      keterangan: 'Laporan akhir + rekomendasi ergonomi',
      status: (p.statusCmdq === 'SELESAI' ? 'SELESAI' : 'BELUM') as const,
      tautan: '/ringkasan',
      terkunci: p.statusCmdq !== 'SELESAI',
    },
  ]
})

const gayaStatus = {
  SELESAI: {
    kelas: 'bg-brand-600 text-white',
    label: 'Selesai',
    ikon: 'selesai',
  },
  BERLANGSUNG: {
    kelas: 'bg-risiko-sedang-bg text-risiko-sedang',
    label: 'Belum selesai',
    ikon: 'menunggu',
  },
  BELUM: {
    kelas: 'bg-white/80 text-ink-600 ring-1 ring-garis-kuat',
    label: 'Belum diisi',
    ikon: 'menunggu',
  },
} as const

/** Langkah berikutnya yang perlu dikerjakan responden. */
const berikutnya = computed(() =>
  langkah.value.find((l) => l.status !== 'SELESAI' && !l.terkunci),
)

const tahapSekarang = computed(() => {
  const p = profil.value
  if (!p) return 1
  if (p.statusSus === 'SELESAI') return 5
  if (p.statusCmdq === 'SELESAI') return 4
  if (p.statusProfil === 'SELESAI') return 3
  return 2
})
</script>

<template>
  <div class="space-y-4">
    <p v-if="pending" class="text-sm text-ink-500">Memuat data…</p>

    <div
      v-else-if="error"
      class="rounded-kartu bg-risiko-tinggi-bg p-5 text-sm text-risiko-tinggi-teks"
    >
      Gagal memuat data Anda. Coba muat ulang halaman.
    </div>

    <template v-else-if="profil">
      <!-- Sapaan + identitas -->
      <header class="kartu overflow-hidden">
        <div
          class="p-5 text-white"
          style="background: linear-gradient(150deg, #2f6b52, #163d2f)"
        >
          <p class="text-xs text-brand-100/80">Selamat datang,</p>
          <h1 class="mt-0.5 text-xl font-extrabold">{{ profil.nama }}</h1>
          <p class="mt-1 font-mono text-sm font-bold text-sorot">
            {{ profil.kodeResponden }}
          </p>
        </div>

        <dl
          v-if="profil.statusProfil === 'SELESAI'"
          class="grid grid-cols-2 gap-4 border-t border-garis p-5 sm:grid-cols-4"
        >
          <div>
            <dt class="text-[11px] text-ink-500">Usia</dt>
            <dd class="text-sm font-bold text-ink">{{ profil.usia }} tahun</dd>
          </div>
          <div>
            <dt class="text-[11px] text-ink-500">Jenis kelamin</dt>
            <dd class="text-sm font-bold text-ink">
              {{ profil.jenisKelamin ? LABEL_JK[profil.jenisKelamin] : '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-[11px] text-ink-500">IMT</dt>
            <dd class="text-sm font-bold text-ink">{{ profil.imt }}</dd>
          </div>
          <div>
            <dt class="text-[11px] text-ink-500">Pakai komputer</dt>
            <dd class="text-sm font-bold text-ink">
              {{ profil.durasiKomputerJamPerHari }} jam/hari
            </dd>
          </div>
        </dl>
        <p
          v-if="profil.labelKategoriImt"
          class="border-t border-garis px-5 py-2.5 text-xs text-ink-500"
        >
          Kategori IMT:
          <strong class="text-ink-700">{{ profil.labelKategoriImt }}</strong>
        </p>
      </header>

      <UiProgres :tahap="tahapSekarang" :total-tahap="5" keterangan="Kemajuan keseluruhan" />

      <!-- Ajakan ke langkah berikutnya -->
      <NuxtLink
        v-if="berikutnya?.tautan"
        :to="berikutnya.tautan"
        class="block rounded-kartu bg-aksen p-4 text-white shadow-(--shadow-timbul) transition hover:bg-aksen-kuat"
      >
        <p class="text-xs opacity-85">Langkah berikutnya</p>
        <p class="mt-0.5 flex items-center gap-2 text-base font-extrabold">
          <UiIkon :nama="berikutnya.ikon" :ukuran="22" />
          {{ berikutnya.judul }}
          <span class="ml-auto" aria-hidden="true">→</span>
        </p>
      </NuxtLink>

      <!-- Peta jalan -->
      <section class="space-y-2.5">
        <h2 class="text-sm font-bold text-ink">Langkah Pengisian</h2>

        <div
          v-for="l in langkah"
          :key="l.no"
          class="kartu-lembut flex flex-wrap items-center gap-x-3 gap-y-2.5 p-4"
          :class="l.terkunci ? 'opacity-60' : ''"
        >
          <!-- Lencana ikon: nomor langkah tetap terbaca lewat tanda centang
               atau angka di pojoknya, jadi urutan tidak hilang. -->
          <span class="relative shrink-0">
            <span
              class="grid h-12 w-12 place-items-center rounded-2xl transition"
              :class="
                l.status === 'SELESAI'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white/80 text-brand-700 ring-1 ring-brand-600/12'
              "
            >
              <UiIkon :nama="l.ikon" :ukuran="24" />
            </span>
            <span
              class="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-extrabold text-brand-700 shadow-(--shadow-kartu) ring-1 ring-brand-600/12"
              aria-hidden="true"
            >
              <UiIkon v-if="l.status === 'SELESAI'" nama="centang" :ukuran="12" />
              <template v-else>{{ l.no }}</template>
            </span>
          </span>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-ink">{{ l.judul }}</p>
            <p class="mt-0.5 text-xs leading-relaxed text-ink-500">
              {{ l.keterangan }}
            </p>
          </div>

          <span class="lencana" :class="gayaStatus[l.status].kelas">
            <UiIkon :nama="gayaStatus[l.status].ikon" :ukuran="14" />
            {{ gayaStatus[l.status].label }}
          </span>

          <NuxtLink
            v-if="l.tautan && !l.terkunci"
            :to="l.tautan"
            class="inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[13px] font-bold transition"
            :class="
              l.status === 'SELESAI'
                ? 'bg-white/80 text-brand-700 ring-1 ring-garis-kuat hover:bg-white'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            "
          >
            {{ l.status === 'SELESAI' ? 'Lihat / Ubah' : 'Isi Sekarang' }}
          </NuxtLink>

          <span
            v-else-if="l.terkunci"
            class="inline-flex shrink-0 items-center gap-1.5 text-xs text-ink-400"
          >
            <UiIkon nama="terkunci" :ukuran="14" />
            Selesaikan langkah sebelumnya
          </span>
        </div>
      </section>

      <!-- Pintasan hasil -->
      <div class="space-y-2">
        <NuxtLink
          v-if="profil.statusCmdq === 'SELESAI'"
          to="/hasil"
          class="kartu-lembut block p-4 transition hover:brightness-[0.98]"
        >
          <p class="flex items-center gap-2 text-sm font-bold text-brand-800">
            <UiIkon nama="hasil" />
            Hasil Keluhan Tubuh (CMDQ)
            <span class="ml-auto" aria-hidden="true">→</span>
          </p>
        </NuxtLink>

        <NuxtLink
          v-if="profil.statusSus === 'SELESAI'"
          to="/sus/hasil"
          class="kartu-lembut block p-4 transition hover:brightness-[0.98]"
        >
          <p class="flex items-center gap-2 text-sm font-bold text-brand-800">
            <UiIkon nama="selesai" />
            Hasil Penilaian Aplikasi (SUS)
            <span class="ml-auto" aria-hidden="true">→</span>
          </p>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
