<script setup lang="ts">
import { evaluasiImt } from '~~/lib/imt'
import {
  petaGalat,
  skemaProfilResponden,
  BATAS_FREKUENSI_OLAHRAGA,
} from '~~/lib/validasi/responden'
import { nomorTahap } from '~~/lib/alur'
import { OPSI_YA_TIDAK } from '~~/types/ui'
import {
  NILAI_LAINNYA,
  OPSI_DIVISI,
  OPSI_DURASI_KOMPUTER,
  OPSI_JABATAN,
  OPSI_JENIS_KELAMIN,
  OPSI_MASA_KERJA,
  OPSI_USIA,
  PILIHAN_DIVISI,
  PILIHAN_JABATAN,
} from '~~/lib/sosiodemografi'

/**
 * Langkah 2 alur responden — Data Sosiodemografis (mockup layar 02).
 */
definePageMeta({ middleware: 'responden' })
useHead({ title: 'Data Sosiodemografis — ErgoSelf' })

const { data: profil } = await useFetch('/api/responden/saya')

const form = reactive({
  usia: '',
  jenisKelamin: undefined as 'LAKI_LAKI' | 'PEREMPUAN' | undefined,
  /**
   * Tombol yang sedang aktif — bisa bernilai `NILAI_LAINNYA`. Nilai yang
   * benar-benar dikirim ke server dihitung oleh `divisiFinal`/`jabatanFinal`.
   */
  divisiPilihan: '',
  divisiLainnya: '',
  jabatanPilihan: '',
  jabatanLainnya: '',
  unitKerja: '',
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

/**
 * Nilai yang benar-benar dikirim ke server: label dari daftar, atau teks yang
 * diketik responden bila ia memilih "Lainnya".
 *
 * Yang tersimpan tidak pernah berupa kata "Lainnya" — lihat alasannya di
 * `lib/sosiodemografi.ts`. Bila kolom teksnya masih kosong, nilainya dibiarkan
 * `NILAI_LAINNYA` supaya validasi menolaknya dengan pesan yang menunjuk ke
 * kolom itu, bukan mengirim string kosong dengan pesan "wajib dipilih" yang
 * membingungkan karena responden merasa sudah memilih.
 */
const divisiFinal = computed(() =>
  form.divisiPilihan === NILAI_LAINNYA
    ? form.divisiLainnya.trim() || NILAI_LAINNYA
    : form.divisiPilihan,
)
const jabatanFinal = computed(() =>
  form.jabatanPilihan === NILAI_LAINNYA
    ? form.jabatanLainnya.trim() || NILAI_LAINNYA
    : form.jabatanPilihan,
)

/**
 * Memulihkan keadaan tombol dari satu nilai tersimpan: nilai yang ada di
 * daftar menyalakan tombolnya, nilai lain berarti responden dulu memakai
 * "Lainnya" sehingga tombol itu yang menyala dan teksnya dikembalikan.
 */
function pulihkanPilihan(tersimpan: string | null | undefined, daftar: readonly string[]) {
  if (!tersimpan) return { pilihan: '', lainnya: '' }
  return daftar.includes(tersimpan)
    ? { pilihan: tersimpan, lainnya: '' }
    : { pilihan: NILAI_LAINNYA, lainnya: tersimpan }
}

// Isi ulang bila responden kembali untuk mengoreksi profilnya.
watch(
  profil,
  (p) => {
    if (!p || p.statusProfil !== 'SELESAI') return
    const divisi = pulihkanPilihan(p.divisi, OPSI_DIVISI)
    const jabatan = pulihkanPilihan(p.jabatan, OPSI_JABATAN)
    Object.assign(form, {
      usia: p.usia ?? '',
      jenisKelamin: p.jenisKelamin ?? undefined,
      divisiPilihan: divisi.pilihan,
      divisiLainnya: divisi.lainnya,
      jabatanPilihan: jabatan.pilihan,
      jabatanLainnya: jabatan.lainnya,
      unitKerja: p.unitKerja ?? '',
      masaKerjaTahun: p.masaKerjaTahun ?? '',
      durasiKomputerJamPerHari: p.durasiKomputerJamPerHari ?? '',
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
    divisi: divisiFinal.value,
    jabatan: jabatanFinal.value,
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
    // SOLUSI: Gunakan window.location.href menggantikan navigateTo
    // Ini memaksa browser memuat cookie sesi baru dari server tanpa tertahan middleware client
    window.location.href = '/kuesioner'
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
    <UiProgres :tahap="nomorTahap('PROFIL')" keterangan="Data sosiodemografis" />

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
      <!--
        Data sosiodemografis — karakteristik individu dan okupasional dalam
        satu seksi. Keduanya digabung karena memang satu kelompok variabel:
        usia dan jenis kelamin sama sosiodemografisnya dengan divisi dan
        jabatan, dan di Bab IV ketiganya sama-sama menjadi variabel yang
        ditabulasi-silang dengan skor CMDQ.
      -->
      <fieldset class="kartu space-y-4 p-4">
        <legend class="label-seksi float-none flex items-center gap-1.5"><UiIkon nama="profil" :ukuran="16" /> Data Sosiodemografis</legend>

        <UiKolom label="Nama / Kode Responden">
          <input
            :value="profil?.nama"
            disabled
            type="text"
            class="isian bg-gray-50 opacity-70 cursor-not-allowed"
          />
        </UiKolom>

        <div class="grid gap-4 sm:grid-cols-2">
          <UiKolom
            label="Usia (Tahun)"
            wajib
            :galat="galat.usia"
            :data-galat="!!galat.usia"
          >
            <UiPilihanKotak
              v-model="form.usia"
              nama="usia"
              :opsi="OPSI_USIA"
              :galat="!!galat.usia"
              @update:model-value="bersihkanGalat('usia')"
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
        </div>

        <UiKolom
          label="Divisi"
          wajib
          :galat="galat.divisi"
          :data-galat="!!galat.divisi"
        >
          <UiPilihanKotak
            v-model="form.divisiPilihan"
            nama="divisi"
            :kolom="2"
            :opsi="PILIHAN_DIVISI"
            :galat="!!galat.divisi"
            @update:model-value="bersihkanGalat('divisi')"
          />
          <input
            v-if="form.divisiPilihan === NILAI_LAINNYA"
            v-model="form.divisiLainnya"
            type="text"
            placeholder="Tuliskan nama divisi Anda"
            aria-label="Nama divisi lainnya"
            :class="[...kelasFor('divisi'), 'mt-2']"
            @input="bersihkanGalat('divisi')"
          />
        </UiKolom>

        <UiKolom
          label="Jabatan"
          wajib
          :galat="galat.jabatan"
          :data-galat="!!galat.jabatan"
        >
          <UiPilihanKotak
            v-model="form.jabatanPilihan"
            nama="jabatan"
            :kolom="2"
            :opsi="PILIHAN_JABATAN"
            :galat="!!galat.jabatan"
            @update:model-value="bersihkanGalat('jabatan')"
          />
          <input
            v-if="form.jabatanPilihan === NILAI_LAINNYA"
            v-model="form.jabatanLainnya"
            type="text"
            placeholder="Tuliskan jabatan Anda"
            aria-label="Jabatan lainnya"
            :class="[...kelasFor('jabatan'), 'mt-2']"
            @input="bersihkanGalat('jabatan')"
          />
        </UiKolom>

        <UiKolom
          label="Sub-bagian / seksi"
          untuk="unitKerja"
          petunjuk="Opsional — lebih rinci dari divisi, mis. Seksi Pajak"
          :galat="galat.unitKerja"
        >
          <input
            id="unitKerja"
            v-model="form.unitKerja"
            type="text"
            placeholder="Contoh: Seksi Pajak"
            :class="kelasFor('unitKerja')"
            @input="bersihkanGalat('unitKerja')"
          />
        </UiKolom>

        <UiKolom
          label="Masa Kerja (Tahun)"
          wajib
          :galat="galat.masaKerjaTahun"
          :data-galat="!!galat.masaKerjaTahun"
        >
          <UiPilihanKotak
            v-model="form.masaKerjaTahun"
            nama="masaKerjaTahun"
            :opsi="OPSI_MASA_KERJA"
            :galat="!!galat.masaKerjaTahun"
            @update:model-value="bersihkanGalat('masaKerjaTahun')"
          />
        </UiKolom>

        <UiKolom
          label="Durasi Penggunaan Komputer (Jam/Hari)"
          wajib
          :galat="galat.durasiKomputerJamPerHari"
          :data-galat="!!galat.durasiKomputerJamPerHari"
        >
          <UiPilihanKotak
            v-model="form.durasiKomputerJamPerHari"
            nama="durasiKomputerJamPerHari"
            :kolom="2"
            :opsi="OPSI_DURASI_KOMPUTER"
            :galat="!!galat.durasiKomputerJamPerHari"
            @update:model-value="bersihkanGalat('durasiKomputerJamPerHari')"
          />
        </UiKolom>
      </fieldset>

      <!-- Statistik fisik -->
      <fieldset class="kartu space-y-4 p-4">
        <legend class="label-seksi float-none flex items-center gap-1.5"><UiIkon nama="statistik-fisik" :ukuran="16" /> Statistik Fisik</legend>

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
        <legend class="label-seksi float-none flex items-center gap-1.5"><UiIkon nama="kebiasaan" :ukuran="16" /> Kebiasaan Hidup</legend>

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
        <legend class="label-seksi float-none flex items-center gap-1.5"><UiIkon nama="medis" :ukuran="16" /> Riwayat Medis</legend>

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
        <UiTombol varian="aksen" type="submit" :disabled="mengirim">
          {{ mengirim ? 'Menyimpan…' : 'Mulai Kuesioner →' }}
        </UiTombol>
      </div>
    </form>
  </div>
</template>