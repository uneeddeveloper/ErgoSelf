<script setup lang="ts">
import { evaluasiImt } from '~~/lib/imt'
import {
  petaGalat,
  skemaProfilResponden,
  BATAS_USIA,
  BATAS_MASA_KERJA,
  BATAS_DURASI_KOMPUTER,
  BATAS_FREKUENSI_OLAHRAGA,
} from '~~/lib/validasi/responden'
import { OPSI_YA_TIDAK } from '~~/types/ui'
import type { OpsiPilihan } from '~~/types/ui'

/**
 * Langkah 2 alur responden — Profil Pekerja (mockup layar 02).
 *
 * Catatan desain: mockup memakai sakelar (toggle) untuk pertanyaan kebiasaan.
 * Di sini sengaja dipakai pilihan Ya/Tidak, karena sakelar selalu punya
 * posisi awal "mati" — responden yang melewatkannya akan terekam sebagai
 * "tidak" tanpa pernah menjawab. Pilihan eksplisit menghilangkan bias itu.
 */
definePageMeta({ middleware: 'responden' })
useHead({ title: 'Profil Pekerja — ErgoSelf' })

const { data: profil } = await useFetch('/api/responden/saya')

const form = reactive({
  unitKerja: '',
  usia: '',
  jenisKelamin: undefined as 'LAKI_LAKI' | 'PEREMPUAN' | undefined,
  masaKerjaTahun: '',
  durasiKomputerJamPerHari: '',
  tinggiBadanCm: '',
  beratBadanKg: '',
  olahraga: undefined as boolean | undefined,
  frekuensiOlahragaPerMinggu: '',
  merokok: undefined as boolean | undefined,
  riwayatMsds: undefined as boolean | undefined,
  keteranganRiwayatMsds: '',
})

// Isi ulang bila responden kembali untuk mengoreksi profilnya.
watch(
  profil,
  (p) => {
    if (!p || p.statusProfil !== 'SELESAI') return
    Object.assign(form, {
      unitKerja: p.unitKerja ?? '',
      usia: String(p.usia ?? ''),
      jenisKelamin: p.jenisKelamin ?? undefined,
      masaKerjaTahun: String(p.masaKerjaTahun ?? ''),
      durasiKomputerJamPerHari: String(p.durasiKomputerJamPerHari ?? ''),
      tinggiBadanCm: String(p.tinggiBadanCm ?? ''),
      beratBadanKg: String(p.beratBadanKg ?? ''),
      olahraga: p.olahraga ?? undefined,
      frekuensiOlahragaPerMinggu: String(p.frekuensiOlahragaPerMinggu ?? ''),
      merokok: p.merokok ?? undefined,
      riwayatMsds: p.riwayatMsds ?? undefined,
      keteranganRiwayatMsds: p.keteranganRiwayatMsds ?? '',
    })
  },
  { immediate: true },
)

const galat = ref<Record<string, string>>({})
const galatUmum = ref('')
const mengirim = ref(false)

const OPSI_JENIS_KELAMIN: OpsiPilihan<'LAKI_LAKI' | 'PEREMPUAN'>[] = [
  { nilai: 'LAKI_LAKI', label: 'Laki-laki' },
  { nilai: 'PEREMPUAN', label: 'Perempuan' },
]

/** Pratinjau IMT langsung saat responden mengetik tinggi & berat badan. */
const pratinjauImt = computed(() => {
  const tinggi = Number(form.tinggiBadanCm.replace(',', '.'))
  const berat = Number(form.beratBadanKg.replace(',', '.'))
  if (!tinggi || !berat) return null
  try {
    return evaluasiImt(berat, tinggi)
  } catch {
    return null
  }
})

const warnaImt: Record<string, string> = {
  KURUS_BERAT: 'bg-risiko-sedang-bg text-risiko-sedang',
  KURUS_RINGAN: 'bg-risiko-sedang-bg text-risiko-sedang',
  NORMAL: 'bg-brand-200 text-brand-800',
  GEMUK_RINGAN: 'bg-risiko-sedang-bg text-risiko-sedang',
  OBESITAS: 'bg-risiko-tinggi-bg text-risiko-tinggi-teks',
}

function bersihkanGalat(field: string) {
  if (galat.value[field]) delete galat.value[field]
}

async function kirim() {
  galatUmum.value = ''

  const cek = skemaProfilResponden.safeParse({
    ...form,
    frekuensiOlahragaPerMinggu: form.olahraga
      ? form.frekuensiOlahragaPerMinggu
      : undefined,
  })

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
    await $fetch('/api/responden/profil', { method: 'PUT', body: cek.data })
    await navigateTo('/kuesioner')
  } catch (error: any) {
    const dariServer = error?.data?.data?.galat ?? error?.data?.galat
    if (dariServer) {
      galat.value = dariServer
      galatUmum.value = 'Periksa kembali isian yang ditandai merah.'
    } else {
      galatUmum.value =
        error?.data?.statusMessage ??
        error?.statusMessage ??
        'Gagal menyimpan data. Periksa koneksi Anda lalu coba lagi.'
    }
    mengirim.value = false
  }
}

function kelasFor(field: string) {
  return ['isian focus:isian-fokus', galat.value[field] ? 'isian-galat' : '']
}
</script>

<template>
  <div class="space-y-4">
    <UiProgres :tahap="2" :total-tahap="5" keterangan="Profil pekerja" />

    <header class="rounded-kartu bg-brand-150 p-5">
      <h1 class="text-lg font-extrabold text-brand-800">
        Halo, {{ profil?.nama?.split(' ')[0] ?? 'Rekan Kerja' }}!
      </h1>
      <p class="mt-1.5 text-sm leading-relaxed text-ink-700">
        Silakan lengkapi data profil Anda untuk memulai asesmen kesehatan kerja.
        Kolom bertanda <span class="font-bold text-risiko-tinggi">*</span> wajib
        diisi.
      </p>
      <p v-if="profil" class="mt-2.5 rounded-input bg-white/70 px-3 py-2 text-[13px]">
        Kode Responden Anda:
        <strong class="font-mono text-brand-700">{{ profil.kodeResponden }}</strong>
      </p>
    </header>

    <p
      v-if="galatUmum"
      class="rounded-input bg-risiko-tinggi-bg px-4 py-3 text-sm font-semibold text-risiko-tinggi-teks"
      role="alert"
    >
      {{ galatUmum }}
    </p>

    <form class="space-y-4" novalidate @submit.prevent="kirim">
      <!-- Informasi pribadi -->
      <fieldset class="kartu space-y-4 p-4">
        <legend class="label-seksi float-none">👤 Informasi Pribadi</legend>

        <UiKolom
          label="Usia (tahun)"
          untuk="usia"
          wajib
          :petunjuk="`${BATAS_USIA.min}–${BATAS_USIA.maks} tahun`"
          :galat="galat.usia"
          :data-galat="!!galat.usia"
        >
          <input
            id="usia"
            v-model="form.usia"
            type="number"
            inputmode="numeric"
            :min="BATAS_USIA.min"
            :max="BATAS_USIA.maks"
            placeholder="Contoh: 32"
            :class="kelasFor('usia')"
            @input="bersihkanGalat('usia')"
          />
        </UiKolom>

        <UiKolom
          label="Jenis kelamin"
          wajib
          :galat="galat.jenisKelamin"
          :data-galat="!!galat.jenisKelamin"
        >
          <UiPilihan
            v-model="form.jenisKelamin"
            nama="jenisKelamin"
            tata="padat"
            :opsi="OPSI_JENIS_KELAMIN"
            :galat="!!galat.jenisKelamin"
            @update:model-value="bersihkanGalat('jenisKelamin')"
          />
        </UiKolom>

        <UiKolom
          label="Unit kerja / bagian"
          untuk="unitKerja"
          petunjuk="Opsional"
          :galat="galat.unitKerja"
        >
          <input
            id="unitKerja"
            v-model="form.unitKerja"
            type="text"
            placeholder="Contoh: Keuangan"
            :class="kelasFor('unitKerja')"
            @input="bersihkanGalat('unitKerja')"
          />
        </UiKolom>
      </fieldset>

      <!-- Informasi pekerjaan -->
      <fieldset class="kartu space-y-4 p-4">
        <legend class="label-seksi float-none">💼 Informasi Pekerjaan</legend>

        <UiKolom
          label="Masa kerja (tahun)"
          untuk="masaKerja"
          wajib
          :petunjuk="`Boleh desimal, mis. 2,5 · maksimal ${BATAS_MASA_KERJA.maks} tahun`"
          :galat="galat.masaKerjaTahun"
          :data-galat="!!galat.masaKerjaTahun"
        >
          <input
            id="masaKerja"
            v-model="form.masaKerjaTahun"
            type="text"
            inputmode="decimal"
            placeholder="Contoh: 5"
            :class="kelasFor('masaKerjaTahun')"
            @input="bersihkanGalat('masaKerjaTahun')"
          />
        </UiKolom>

        <UiKolom
          label="Durasi penggunaan komputer (jam/hari)"
          untuk="durasi"
          wajib
          :petunjuk="`Rata-rata per hari, 0–${BATAS_DURASI_KOMPUTER.maks} jam`"
          :galat="galat.durasiKomputerJamPerHari"
          :data-galat="!!galat.durasiKomputerJamPerHari"
        >
          <input
            id="durasi"
            v-model="form.durasiKomputerJamPerHari"
            type="text"
            inputmode="decimal"
            placeholder="Contoh: 8"
            :class="kelasFor('durasiKomputerJamPerHari')"
            @input="bersihkanGalat('durasiKomputerJamPerHari')"
          />
        </UiKolom>
      </fieldset>

      <!-- Statistik fisik -->
      <fieldset class="kartu space-y-4 p-4">
        <legend class="label-seksi float-none">📏 Statistik Fisik</legend>

        <div class="grid gap-4 sm:grid-cols-2">
          <UiKolom
            label="Tinggi badan (cm)"
            untuk="tinggi"
            wajib
            :galat="galat.tinggiBadanCm"
            :data-galat="!!galat.tinggiBadanCm"
          >
            <input
              id="tinggi"
              v-model="form.tinggiBadanCm"
              type="text"
              inputmode="decimal"
              placeholder="170"
              :class="kelasFor('tinggiBadanCm')"
              @input="bersihkanGalat('tinggiBadanCm')"
            />
          </UiKolom>

          <UiKolom
            label="Berat badan (kg)"
            untuk="berat"
            wajib
            :galat="galat.beratBadanKg"
            :data-galat="!!galat.beratBadanKg"
          >
            <input
              id="berat"
              v-model="form.beratBadanKg"
              type="text"
              inputmode="decimal"
              placeholder="65"
              :class="kelasFor('beratBadanKg')"
              @input="bersihkanGalat('beratBadanKg')"
            />
          </UiKolom>
        </div>

        <!-- Pratinjau IMT otomatis -->
        <div
          class="flex items-center justify-between gap-3 rounded-input px-4 py-3"
          :class="pratinjauImt ? warnaImt[pratinjauImt.kategori] : 'bg-panel'"
          aria-live="polite"
        >
          <div>
            <p class="text-xs opacity-80">Indeks Massa Tubuh (IMT)</p>
            <p class="text-xl font-extrabold">
              {{ pratinjauImt ? pratinjauImt.imt : '——' }}
            </p>
          </div>
          <p class="max-w-[55%] text-right text-xs leading-snug font-semibold">
            {{ pratinjauImt ? pratinjauImt.label : 'Lengkapi tinggi & berat badan' }}
          </p>
        </div>
      </fieldset>

      <!-- Kebiasaan hidup -->
      <fieldset class="kartu space-y-5 p-4">
        <legend class="label-seksi float-none">🧘 Kebiasaan Hidup</legend>

        <UiKolom
          label="Apakah Anda rutin berolahraga?"
          wajib
          :galat="galat.olahraga"
          :data-galat="!!galat.olahraga"
        >
          <UiPilihan
            v-model="form.olahraga"
            nama="olahraga"
            tata="padat"
            :opsi="OPSI_YA_TIDAK"
            :galat="!!galat.olahraga"
            @update:model-value="bersihkanGalat('olahraga')"
          />
        </UiKolom>

        <UiKolom
          v-if="form.olahraga === true"
          label="Berapa kali dalam seminggu?"
          untuk="frekOlahraga"
          wajib
          :petunjuk="`${BATAS_FREKUENSI_OLAHRAGA.min}–${BATAS_FREKUENSI_OLAHRAGA.maks} kali per minggu`"
          :galat="galat.frekuensiOlahragaPerMinggu"
          :data-galat="!!galat.frekuensiOlahragaPerMinggu"
        >
          <input
            id="frekOlahraga"
            v-model="form.frekuensiOlahragaPerMinggu"
            type="number"
            inputmode="numeric"
            :min="BATAS_FREKUENSI_OLAHRAGA.min"
            :max="BATAS_FREKUENSI_OLAHRAGA.maks"
            placeholder="Contoh: 3"
            :class="kelasFor('frekuensiOlahragaPerMinggu')"
            @input="bersihkanGalat('frekuensiOlahragaPerMinggu')"
          />
        </UiKolom>

        <UiKolom
          label="Apakah Anda merokok?"
          wajib
          :galat="galat.merokok"
          :data-galat="!!galat.merokok"
        >
          <UiPilihan
            v-model="form.merokok"
            nama="merokok"
            tata="padat"
            :opsi="OPSI_YA_TIDAK"
            :galat="!!galat.merokok"
            @update:model-value="bersihkanGalat('merokok')"
          />
        </UiKolom>
      </fieldset>

      <!-- Riwayat medis -->
      <fieldset class="kartu space-y-5 p-4">
        <legend class="label-seksi float-none">💊 Riwayat Medis</legend>

        <UiKolom
          label="Pernah mengalami gangguan otot/rangka sebelumnya?"
          wajib
          petunjuk="Misalnya cedera, saraf terjepit, nyeri kronis, atau pernah dirawat karena keluhan otot/tulang"
          :galat="galat.riwayatMsds"
          :data-galat="!!galat.riwayatMsds"
        >
          <UiPilihan
            v-model="form.riwayatMsds"
            nama="riwayatMsds"
            tata="padat"
            :opsi="OPSI_YA_TIDAK"
            :galat="!!galat.riwayatMsds"
            @update:model-value="bersihkanGalat('riwayatMsds')"
          />
        </UiKolom>

        <UiKolom
          v-if="form.riwayatMsds === true"
          label="Jelaskan singkat"
          untuk="ketRiwayat"
          wajib
          petunjuk="Maksimal 500 karakter"
          :galat="galat.keteranganRiwayatMsds"
          :data-galat="!!galat.keteranganRiwayatMsds"
        >
          <textarea
            id="ketRiwayat"
            v-model="form.keteranganRiwayatMsds"
            rows="3"
            maxlength="500"
            placeholder="Contoh: pernah nyeri pinggang bawah tahun 2023, dirawat 1 minggu"
            :class="kelasFor('keteranganRiwayatMsds')"
          />
        </UiKolom>
      </fieldset>

      <div class="space-y-2 pt-1">
        <UiTombol type="submit" :disabled="mengirim">
          {{ mengirim ? 'Menyimpan…' : 'Mulai Kuesioner →' }}
        </UiTombol>
      </div>
    </form>
  </div>
</template>
