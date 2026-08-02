<script setup lang="ts">
/**
 * Hasil analisis usabilitas (SUS) — mengikuti mockup layar 06:
 * gauge setengah lingkaran, lencana akseptabilitas, dan perbandingan
 * terhadap rata-rata industri (68).
 */
definePageMeta({ middleware: 'responden' })
useHead({ title: 'Hasil Penilaian Aplikasi — ErgoSelf' })

const { data: hasil, pending, error } = await useFetch('/api/sus/saya')

const GAYA = {
  ACCEPTABLE: { warna: '#0d9488', lencana: 'bg-brand-600 text-white', ikon: '✓' },
  MARGINAL: {
    warna: '#b45309',
    lencana: 'bg-risiko-sedang-bg text-risiko-sedang',
    ikon: '⚠',
  },
  NOT_ACCEPTABLE: {
    warna: '#dc2626',
    lencana: 'bg-risiko-tinggi-bg text-risiko-tinggi-teks',
    ikon: '⚠',
  },
} as const

type Kunci = keyof typeof GAYA

/** Gauge setengah lingkaran: 0–100 dipetakan ke 0–180 derajat. */
const sudut = computed(() =>
  Math.min(180, Math.max(0, ((hasil.value?.skorTotal ?? 0) / 100) * 180)),
)

const posisiTarget = computed(() => `${hasil.value?.target ?? 68}%`)
const posisiSkor = computed(() => `${Math.min(100, hasil.value?.skorTotal ?? 0)}%`)

const rekomendasi = computed(() => {
  if (!hasil.value) return ''
  if (hasil.value.skorTotal >= 80)
    return 'Pertahankan alur navigasi saat ini dan fokus pada optimasi fitur pendukung lainnya.'
  if (hasil.value.memenuhiTarget)
    return 'Usabilitas sudah di atas rata-rata. Perbaikan kecil pada kejelasan istilah dan alur pengisian masih dapat meningkatkan skor.'
  return 'Skor masih di bawah rata-rata industri. Perlu penyederhanaan alur pengisian dan kejelasan petunjuk pada aplikasi.'
})
</script>

<template>
  <div class="space-y-4">
    <p v-if="pending" class="text-sm text-ink-500">Memuat hasil…</p>

    <div v-else-if="error" class="kartu space-y-3 p-6 text-center">
      <p class="text-3xl" aria-hidden="true">📝</p>
      <h1 class="text-lg font-extrabold text-ink">Belum ada penilaian</h1>
      <p class="text-sm text-ink-600">
        Anda belum mengisi kuesioner penilaian aplikasi.
      </p>
      <UiTombol ke="/sus">Isi Penilaian Sekarang</UiTombol>
    </div>

    <template v-else-if="hasil">
      <div class="flex items-start justify-between gap-3">
        <h1 class="text-xl leading-tight font-extrabold text-brand-600">
          Hasil Analisis<br />Usabilitas (SUS)
        </h1>
        <span
          class="shrink-0 text-right text-xs font-bold whitespace-nowrap text-brand-600"
        >
          Langkah 4<br />dari 4
        </span>
      </div>
      <div class="h-1.5 rounded-full bg-brand-600" />

      <!-- Gauge skor -->
      <section class="kartu flex flex-col items-center gap-3 p-5">
        <div
          class="relative h-[100px] w-[190px]"
          :style="{
            borderRadius: '190px 190px 0 0',
            background: `conic-gradient(from 270deg at 50% 100%, ${GAYA[hasil.interpretasi as Kunci].warna} 0deg, ${GAYA[hasil.interpretasi as Kunci].warna} ${sudut}deg, #e5e7eb ${sudut}deg, #e5e7eb 180deg)`,
          }"
          role="img"
          :aria-label="`Skor SUS ${hasil.skorTotal} dari 100`"
        >
          <div
            class="absolute top-3.5 right-3.5 left-3.5 h-[82px] bg-white"
            style="border-radius: 160px 160px 0 0"
          />
          <div class="absolute inset-x-0 bottom-0.5 text-center">
            <div class="text-3xl font-extrabold text-ink">{{ hasil.skorTotal }}</div>
            <div class="text-[11px] tracking-wider text-ink-500">SKOR SUS</div>
          </div>
        </div>

        <span class="lencana" :class="GAYA[hasil.interpretasi as Kunci].lencana">
          {{ GAYA[hasil.interpretasi as Kunci].ikon }}
          {{ hasil.labelInterpretasi.toUpperCase() }}
        </span>

        <p class="text-center text-[13px] leading-relaxed text-ink-600">
          Skor {{ hasil.skorTotal }}
          {{ hasil.memenuhiTarget ? 'berada di atas' : 'masih di bawah' }}
          rata-rata industri ({{ hasil.target }}),
          {{
            hasil.memenuhiTarget
              ? 'menunjukkan aplikasi mudah digunakan oleh responden.'
              : 'sehingga masih ada ruang perbaikan pada kemudahan penggunaan.'
          }}
        </p>
      </section>

      <!-- Perbandingan terhadap target -->
      <section class="kartu space-y-3.5 p-4.5">
        <h2 class="text-base font-extrabold text-brand-600">
          Visualisasi Perbandingan
        </h2>

        <div class="relative pt-6">
          <span
            class="absolute top-0 -translate-x-1/2 text-[11px] font-bold whitespace-nowrap text-ink-700"
            :style="{ left: posisiTarget }"
          >
            Rata-rata ({{ hasil.target }})
          </span>

          <div class="relative h-1.5 rounded-full bg-garis">
            <!-- Penanda target -->
            <span
              class="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-ink-700"
              :style="{ left: posisiTarget }"
              aria-hidden="true"
            />
            <!-- Bilah skor responden -->
            <span
              class="absolute top-0 left-0 h-full rounded-full"
              :style="{
                width: posisiSkor,
                background: GAYA[hasil.interpretasi as Kunci].warna,
              }"
            />
            <span
              class="absolute top-1/2 h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              :style="{
                left: posisiSkor,
                background: GAYA[hasil.interpretasi as Kunci].warna,
              }"
              aria-hidden="true"
            />
          </div>

          <div class="mt-2 flex justify-between text-xs text-ink-700">
            <span>0 (Buruk)</span>
            <span>100 (Sempurna)</span>
          </div>
        </div>
      </section>

      <section class="space-y-2.5 rounded-kartu bg-panel-2 p-4">
        <h2 class="flex items-center gap-1.5 text-sm font-bold text-brand-600">
          😊 Grade Penilaian
        </h2>
        <p class="text-[13px] leading-relaxed text-ink-700">
          Berdasarkan skala penentuan grade, skor ini termasuk
          <strong>Grade {{ hasil.gradeHuruf }}</strong> — kategori
          "{{ hasil.adjektif }}".
        </p>
      </section>

      <section class="space-y-2.5 rounded-kartu bg-panel-2 p-4">
        <h2 class="flex items-center gap-1.5 text-sm font-bold text-brand-600">
          📈 Rekomendasi
        </h2>
        <p class="text-[13px] leading-relaxed text-ink-700">{{ rekomendasi }}</p>
      </section>

      <div class="space-y-2 pt-1">
        <UiTombol ke="/ringkasan">Lihat Ringkasan Riset 📄</UiTombol>
        <UiTombol varian="kedua" ke="/sus">Ubah Jawaban Penilaian</UiTombol>
      </div>
    </template>
  </div>
</template>
