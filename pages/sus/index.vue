<script setup lang="ts">
/**
 * Modul 4 — Kuesioner System Usability Scale (SUS).
 * Sepuluh pernyataan baku, skala Likert 1–5, sesuai mockup layar 05.
 */
definePageMeta({ middleware: 'responden' })
useHead({ title: 'Penilaian Aplikasi (SUS) — ErgoSelf' })

const { data: instrumen } = await useFetch('/api/sus/item')
const { data: tersimpan } = await useFetch('/api/sus/saya', {
  server: false,
  onResponseError: () => {},
})

const jawaban = ref<Record<number, number>>({})
const mengirim = ref(false)
const galat = ref('')
const galatItem = ref<number | null>(null)

watch(
  tersimpan,
  (nilai) => {
    if (!nilai?.perItem) return
    const hasil: Record<number, number> = {}
    for (const i of nilai.perItem) hasil[i.nomor] = i.skorJawaban
    jawaban.value = hasil
  },
  { immediate: true },
)

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
    await navigateTo('/sus/hasil')
  } catch (error: any) {
    galat.value =
      error?.data?.statusMessage ??
      error?.statusMessage ??
      'Gagal mengirim jawaban. Periksa koneksi Anda lalu coba lagi.'
    mengirim.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between text-[13px] font-bold">
      <span class="text-brand-600">Tahap 4 dari 4</span>
      <span class="font-semibold text-ink-700">Kuesioner SUS</span>
    </div>
    <div class="h-1.5 overflow-hidden rounded-full bg-garis">
      <div
        class="h-full rounded-full bg-brand-600 transition-[width] duration-300"
        :style="{ width: `${(jumlahTerjawab / totalItem) * 100}%` }"
      />
    </div>

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
        :class="galatItem === item.nomor ? 'border-risiko-tinggi bg-red-50' : ''"
      >
        <p class="text-sm leading-snug font-bold text-ink">
          {{ item.nomor }}. {{ item.pernyataan }}
        </p>

        <UiPilihan
          v-model="jawaban[item.nomor]"
          tata="angka"
          :nama="`sus-${item.nomor}`"
          :opsi="opsiSkala"
          :galat="galatItem === item.nomor"
          @update:model-value="galatItem = null"
        />

        <div
          class="flex justify-between text-[10px] font-bold tracking-wide text-ink-400"
        >
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
      <UiTombol type="button" :disabled="mengirim" @click="kirim">
        {{ mengirim ? 'Menghitung…' : lengkap ? 'Selesai & Kirim ▷' : 'Kirim Jawaban' }}
      </UiTombol>
      <UiTombol varian="kedua" ke="/hasil">Kembali ke Hasil CMDQ</UiTombol>
    </div>
  </div>
</template>
