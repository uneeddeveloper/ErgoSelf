<script setup lang="ts">
import { nomorTahap } from '~~/lib/alur'

/**
 * Modul 4 — Kuesioner System Usability Scale (SUS).
 * Sepuluh pernyataan baku, skala Likert 1–5, sesuai mockup layar 05.
 */
definePageMeta({ middleware: 'responden' })
useHead({ title: 'Penilaian Aplikasi (SUS) — ErgoSelf' })

const jawaban = ref<Record<number, number>>({})
const mengirim = ref(false)
const galat = ref('')
const galatItem = ref<number | null>(null)
const terkirim = ref(false)

// Dipulihkan sebelum data server diminta — lihat penjaga di pengamat bawah.
const draf = useDrafJawaban('sus', jawaban)
draf.pulihkan()
draf.pantau()

const { data: instrumen } = await useFetch('/api/sus/item')
const { data: tersimpan } = await useFetch('/api/sus/saya', {
  server: false,
  onResponseError: () => {},
})

watch(
  tersimpan,
  (nilai) => {
    if (!nilai?.perItem) return
    // Jangan menimpa jawaban yang sudah diisi responden di layar ini.
    if (Object.keys(jawaban.value).length > 0) return
    const hasil: Record<number, number> = {}
    for (const i of nilai.perItem) hasil[i.nomor] = i.skorJawaban
    jawaban.value = hasil
  },
  { immediate: true },
)

onBeforeRouteLeave(() => {
  if (terkirim.value || Object.keys(jawaban.value).length === 0) return true
  return window.confirm(
    'Penilaian Anda belum dikirim. Tinggalkan halaman ini? Jawaban tetap tersimpan di perangkat ini.',
  )
})

const opsiSkala = computed(
  () =>
    instrumen.value?.skala.map((s) => ({ nilai: s.nilai, label: String(s.nilai) })) ??
    [],
)

const jumlahTerjawab = computed(() => Object.keys(jawaban.value).length)
const totalItem = computed(() => instrumen.value?.item.length ?? 10)
const lengkap = computed(() => jumlahTerjawab.value === totalItem.value)

async function kirim() {
  galat.value = ''
  galatItem.value = null

  const belum = instrumen.value?.item.find((i) => jawaban.value[i.nomor] === undefined)
  if (belum) {
    galatItem.value = belum.nomor
    galat.value = `Pernyataan nomor ${belum.nomor} belum dijawab.`
    await nextTick()
    document
      .getElementById(`item-${belum.nomor}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  mengirim.value = true
  try {
    await $fetch('/api/sus', {
      method: 'POST',
      body: {
        jawaban: Object.entries(jawaban.value).map(([nomor, skor]) => ({
          itemNomor: Number(nomor),
          skorJawaban: skor,
        })),
      },
    })
    terkirim.value = true
    draf.bersihkan()
    await navigateTo('/sus/hasil')
  } catch (error: any) {
    const pesan =
      error?.data?.statusMessage ??
      error?.statusMessage ??
      'Gagal mengirim jawaban. Periksa koneksi Anda lalu coba lagi.'
    galat.value = `${pesan} Jawaban Anda masih tersimpan di perangkat ini.`
    mengirim.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-4">
    <UiProgres :tahap="nomorTahap('SUS')" keterangan="Kuesioner SUS" />

    <header>
      <h1 class="text-[22px] font-extrabold text-brand-600">
        Penilaian Aplikasi (SUS)
      </h1>
      <p class="mt-2 text-sm leading-relaxed text-ink-600">
        Silakan berikan penilaian objektif Anda untuk mengukur tingkat kemudahan
        penggunaan aplikasi ini. Jawaban Anda membantu menyempurnakan alat
        penelitian kesehatan kerja.
      </p>
    </header>

    <!--
      Sebagian item SUS bernada negatif dan dinilai terbalik. Bila responden
      tidak menyadarinya, ia cenderung menjawab lurus ke bawah (straightlining)
      — yang membalik separuh instrumen dan menghasilkan skor palsu di kisaran
      60-an berapa pun usabilitas sebenarnya. Teks item TIDAK diubah karena
      merupakan terjemahan tervalidasi; yang ditambah hanya penanda visual.
    -->
    <p class="rounded-input bg-panel-2 px-3.5 py-2.5 text-xs leading-relaxed text-ink-700">
      Sebagian pernyataan sengaja bernada <strong>negatif</strong> dan ditandai
      garis oranye. Mohon baca setiap kalimat sampai selesai sebelum memilih.
    </p>

    <p class="text-xs text-ink-500" aria-live="polite">
      Terjawab <strong class="text-ink-700">{{ jumlahTerjawab }}</strong> dari
      {{ totalItem }} pernyataan
    </p>

    <section v-if="instrumen" class="space-y-3">
      <article
        v-for="item in instrumen.item"
        :id="`item-${item.nomor}`"
        :key="item.nomor"
        class="kartu space-y-2.5 p-4 transition"
        :class="[
          galatItem === item.nomor ? 'border-risiko-tinggi bg-aksen-lembut/60' : '',
          item.nada === 'NEGATIF' ? 'border-l-4 border-l-aksen' : '',
        ]"
      >
        <p class="text-sm leading-snug font-bold text-ink">
          {{ item.nomor }}. {{ item.pernyataan }}
          <span v-if="item.nada === 'NEGATIF'" class="sr-only">
            (pernyataan bernada negatif)
          </span>
        </p>

        <UiPilihan
          v-model="jawaban[item.nomor]"
          tata="angka"
          :nama="`sus-${item.nomor}`"
          :opsi="opsiSkala"
          :galat="galatItem === item.nomor"
          @update:model-value="galatItem = null"
        />

        <!-- Angka pada skala hanya 1–5, jadi dua keterangan inilah yang
             membawa seluruh maknanya. Ukurannya dinaikkan dari 10px. -->
        <div class="flex justify-between text-xs font-bold tracking-wide text-ink-600">
          <span>SANGAT TIDAK SETUJU</span>
          <span>SANGAT SETUJU</span>
        </div>
      </article>
    </section>

    <p
      v-if="galat"
      class="rounded-input bg-risiko-tinggi-bg px-4 py-3 text-sm font-semibold text-risiko-tinggi-teks"
      role="alert"
    >
      {{ galat }}
    </p>

    <div class="space-y-2 pt-1">
      <UiTombol varian="aksen" type="button" :disabled="mengirim" @click="kirim">
        {{ mengirim ? 'Menghitung…' : lengkap ? 'Selesai & Kirim ▷' : 'Kirim Jawaban' }}
      </UiTombol>
      <UiTombol varian="kedua" ke="/hasil">Kembali ke Hasil CMDQ</UiTombol>
    </div>
  </div>
</template>
