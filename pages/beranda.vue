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
      ikon: '🔐',
      judul: 'Registrasi & Persetujuan',
      keterangan: 'Akun dibuat, persetujuan etik terekam',
      status: 'SELESAI' as const,
      tautan: null,
      terkunci: false,
    },
    {
      no: 2,
      ikon: '👤',
      judul: 'Profil Pekerja',
      keterangan: 'Demografi, pekerjaan, tinggi & berat badan',
      status: p.statusProfil,
      tautan: '/profil',
      terkunci: false,
    },
    {
      no: 3,
      ikon: '🗺',
      judul: 'Kuesioner CMDQ',
      keterangan: 'Peta tubuh 28 bagian + frekuensi & intensitas',
      status: p.statusCmdq,
      tautan: '/kuesioner',
      terkunci: !cmdqSiap,
    },
    {
      no: 4,
      ikon: '📝',
      judul: 'Penilaian Aplikasi (SUS)',
      keterangan: '10 pernyataan singkat',
      status: p.statusSus,
      tautan: '/sus',
      terkunci: !susSiap,
    },
    {
      no: 5,
      ikon: '📄',
      judul: 'Ringkasan Riset',
      keterangan: 'Laporan akhir + rekomendasi ergonomi',
      status: (p.statusCmdq === 'SELESAI' ? 'SELESAI' : 'BELUM') as const,
      tautan: '/ringkasan',
      terkunci: p.statusCmdq !== 'SELESAI',
    },
  ]
})

const gayaStatus = {
  SELESAI: { kelas: 'bg-brand-150 text-brand-800', label: '✓ Selesai' },
  BERLANGSUNG: {
    kelas: 'bg-risiko-sedang-bg text-risiko-sedang',
    label: '⌛ Belum selesai',
  },
  BELUM: { kelas: 'bg-panel text-ink-600', label: 'Belum diisi' },
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
        <div class="p-5" style="background: linear-gradient(165deg, #dcf7f1, #f3fdfb)">
          <p class="text-xs text-ink-500">Selamat datang,</p>
          <h1 class="mt-0.5 text-xl font-extrabold text-ink">{{ profil.nama }}</h1>
          <p class="mt-1 font-mono text-sm font-bold text-brand-600">
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
        class="block rounded-kartu bg-brand-600 p-4 text-white transition hover:bg-brand-700"
      >
        <p class="text-xs opacity-80">Langkah berikutnya</p>
        <p class="mt-0.5 text-base font-extrabold">
          {{ berikutnya.ikon }} {{ berikutnya.judul }} →
        </p>
      </NuxtLink>

      <!-- Peta jalan -->
      <section class="space-y-2.5">
        <h2 class="text-sm font-bold text-ink">Langkah Pengisian</h2>

        <div
          v-for="l in langkah"
          :key="l.no"
          class="kartu flex flex-wrap items-center gap-3 p-4"
          :class="l.terkunci ? 'opacity-55' : ''"
        >
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold"
            :class="
              l.status === 'SELESAI'
                ? 'bg-brand-600 text-white'
                : 'bg-panel text-ink-500'
            "
            aria-hidden="true"
          >
            {{ l.status === 'SELESAI' ? '✓' : l.no }}
          </span>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-ink">{{ l.ikon }} {{ l.judul }}</p>
            <p class="text-xs text-ink-500">{{ l.keterangan }}</p>
          </div>

          <span class="lencana" :class="gayaStatus[l.status].kelas">
            {{ gayaStatus[l.status].label }}
          </span>

          <NuxtLink
            v-if="l.tautan && !l.terkunci"
            :to="l.tautan"
            class="inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[13px] font-bold transition"
            :class="
              l.status === 'SELESAI'
                ? 'border border-garis-kuat text-ink-700 hover:bg-panel'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            "
          >
            {{ l.status === 'SELESAI' ? 'Lihat / Ubah' : 'Isi Sekarang' }}
          </NuxtLink>

          <span
            v-else-if="l.terkunci"
            class="shrink-0 text-xs text-ink-400"
            aria-label="Terkunci"
          >
            🔒 Selesaikan langkah sebelumnya
          </span>
        </div>
      </section>

      <!-- Pintasan hasil -->
      <div class="space-y-2">
        <NuxtLink
          v-if="profil.statusCmdq === 'SELESAI'"
          to="/hasil"
          class="block rounded-kartu border border-brand-300 bg-brand-150 p-4 transition hover:bg-brand-200"
        >
          <p class="text-sm font-bold text-brand-800">
            📈 Hasil Keluhan Tubuh (CMDQ) →
          </p>
        </NuxtLink>

        <NuxtLink
          v-if="profil.statusSus === 'SELESAI'"
          to="/sus/hasil"
          class="block rounded-kartu border border-brand-300 bg-brand-150 p-4 transition hover:bg-brand-200"
        >
          <p class="text-sm font-bold text-brand-800">
            ✅ Hasil Penilaian Aplikasi (SUS) →
          </p>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
