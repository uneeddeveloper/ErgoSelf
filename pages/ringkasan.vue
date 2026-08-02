<script setup lang="ts">
/**
 * Langkah 6 alur responden — Ringkasan Riset / laporan akhir
 * (mockup layar 07): skor CMDQ, skor SUS, dan rekomendasi ergonomi praktis.
 */
definePageMeta({ middleware: 'responden' })
useHead({ title: 'Ringkasan Riset — ErgoSelf' })

const { data: laporan, pending, error } = await useFetch('/api/ringkasan')

const GAYA_RISIKO = {
  TINGGI: { warna: '#dc2626', lencana: 'bg-risiko-tinggi-bg text-risiko-tinggi-teks' },
  SEDANG: { warna: '#b45309', lencana: 'bg-risiko-sedang-bg text-risiko-sedang' },
  RENDAH: { warna: '#0d9488', lencana: 'bg-risiko-rendah-bg text-risiko-rendah' },
} as const
type Kunci = keyof typeof GAYA_RISIKO

function cetak() {
  window.print()
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="pending" class="text-sm text-ink-500">Menyusun laporan…</p>

    <div v-else-if="error" class="kartu space-y-3 p-6 text-center">
      <p class="text-3xl" aria-hidden="true">📄</p>
      <h1 class="text-lg font-extrabold text-ink">Ringkasan belum tersedia</h1>
      <p class="text-sm text-ink-600">
        Selesaikan dulu kuesioner keluhan tubuh untuk mendapatkan laporan akhir.
      </p>
      <UiTombol ke="/kuesioner">Isi Kuesioner Sekarang</UiTombol>
    </div>

    <template v-else-if="laporan">
      <header>
        <p class="text-xs font-bold tracking-widest text-ink-500 uppercase">
          Final Report
        </p>
        <h1 class="mt-0.5 text-[26px] font-extrabold text-ink">Ringkasan Riset</h1>
      </header>

      <p class="rounded-input bg-brand-150 px-3.5 py-2.5 text-[13px] text-ink-700">
        Kode Responden:
        <strong class="font-mono text-brand-700">
          {{ laporan.responden.kodeResponden }}
        </strong>
      </p>

      <div
        v-if="!laporan.lengkap"
        class="rounded-input bg-risiko-sedang-bg px-4 py-3 text-[13px] font-semibold text-risiko-sedang"
      >
        ⌛ Kuesioner penilaian aplikasi (SUS) belum diisi — laporan ini masih
        sebagian.
      </div>

      <!-- ── Skor CMDQ ─────────────────────────────────────────────────── -->
      <section class="kartu space-y-2.5 p-4.5">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-base font-extrabold text-ink">Skor CMDQ</h2>
          <span
            class="lencana"
            :class="GAYA_RISIKO[laporan.cmdq.kategoriRisiko as Kunci].lencana"
          >
            {{ laporan.cmdq.labelKategoriRisiko.toUpperCase() }}
          </span>
        </div>

        <p class="text-[38px] leading-none font-extrabold text-ink">
          {{ laporan.cmdq.skorTotal }}
          <span class="text-base font-semibold text-ink-400">
            / {{ laporan.cmdq.skorTotalMaks }}
          </span>
        </p>
        <p class="text-xs text-ink-500">
          Setara {{ laporan.cmdq.persenDariMaks }}% dari skor maksimum
        </p>

        <p class="text-[13px] leading-relaxed text-ink-600">
          {{ laporan.cmdq.saran }}
        </p>

        <ul class="space-y-1.5 pt-1">
          <li
            v-for="s in laporan.cmdq.sorotan"
            :key="s"
            class="flex items-start gap-2 text-[13px] text-ink-700"
          >
            <span
              class="shrink-0"
              :style="{ color: GAYA_RISIKO[laporan.cmdq.kategoriRisiko as Kunci].warna }"
              aria-hidden="true"
            >
              ✓
            </span>
            {{ s }}
          </li>
        </ul>

        <!-- Titik ketidaknyamanan -->
        <div class="mt-2 space-y-3 rounded-xl bg-panel-2 p-3.5">
          <p class="text-center text-[10px] font-bold tracking-widest text-ink-500">
            TITIK KETIDAKNYAMANAN
          </p>

          <PetaTubuh
            v-if="laporan.cmdq.jumlahSegmenBermasalah > 0"
            :skor="laporan.cmdq.skorPerSegmen"
          />

          <div class="text-center">
            <p v-if="laporan.cmdq.areaPrioritas.length" class="text-sm font-bold text-brand-600">
              {{ laporan.cmdq.areaPrioritas.map((a) => a.nama).join(' · ') }}
            </p>
            <p v-else class="text-sm font-bold text-brand-600">
              Tidak ada keluhan yang dilaporkan
            </p>
            <p class="mt-0.5 text-[11px] text-ink-500">
              {{
                laporan.cmdq.areaPrioritas.length
                  ? 'Area prioritas perhatian'
                  : 'Pertahankan kondisi kerja Anda saat ini'
              }}
            </p>
          </div>

          <div
            v-if="laporan.cmdq.regioBermasalah.length"
            class="flex flex-wrap justify-center gap-1.5"
          >
            <span
              v-for="r in laporan.cmdq.regioBermasalah"
              :key="r.kode"
              class="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-600"
            >
              {{ r.label }}
            </span>
          </div>
        </div>
      </section>

      <!-- ── Skor SUS ──────────────────────────────────────────────────── -->
      <section v-if="laporan.sus" class="kartu space-y-2 p-4.5">
        <h2 class="text-[15px] font-bold text-ink-700">Skor SUS</h2>
        <p class="text-[32px] leading-none font-extrabold text-ink">
          {{ laporan.sus.skorTotal }}
        </p>
        <span
          class="lencana w-fit"
          :class="
            laporan.sus.memenuhiTarget
              ? 'bg-ink-700 text-white'
              : 'bg-risiko-sedang-bg text-risiko-sedang'
          "
        >
          {{ laporan.sus.memenuhiTarget ? '✓' : '⚠' }} Grade
          {{ laporan.sus.gradeHuruf }} / {{ laporan.sus.adjektif }}
        </span>

        <p class="text-[13px] leading-relaxed text-ink-600">
          {{
            laporan.sus.memenuhiTarget
              ? 'Aplikasi ErgoSelf dinilai mudah digunakan dan efisien dalam membantu proses asesmen mandiri.'
              : 'Penilaian Anda menunjukkan aplikasi ini masih perlu penyederhanaan agar lebih mudah digunakan.'
          }}
        </p>

        <div class="pt-1">
          <div class="flex justify-between text-[11px] text-ink-500">
            <span>Usability Score</span>
            <span>{{ laporan.sus.labelInterpretasi }}</span>
          </div>
          <div class="mt-1 h-[5px] overflow-hidden rounded-full bg-garis">
            <div
              class="h-full rounded-full bg-ink-700"
              :style="{ width: `${laporan.sus.skorTotal}%` }"
            />
          </div>
          <p class="mt-1 text-[11px] text-ink-400">
            Rata-rata industri: {{ laporan.sus.target }}
          </p>
        </div>
      </section>

      <NuxtLink
        v-else
        to="/sus"
        class="block rounded-kartu border border-brand-300 bg-brand-150 p-4 text-center"
      >
        <p class="text-sm font-bold text-brand-800">
          📝 Lengkapi Penilaian Aplikasi (SUS) →
        </p>
      </NuxtLink>

      <!-- ── Rekomendasi ───────────────────────────────────────────────── -->
      <h2 class="flex items-center gap-2 pt-1 text-base font-extrabold text-ink">
        💡 Rekomendasi Ergonomi &amp; Langkah Selanjutnya
      </h2>

      <article
        v-for="r in laporan.rekomendasi"
        :key="r.judul"
        class="space-y-1.5 rounded-xl bg-panel-2 p-4"
      >
        <p class="text-xl" aria-hidden="true">{{ r.ikon }}</p>
        <h3 class="text-sm font-bold text-ink">{{ r.judul }}</h3>
        <p class="text-[13px] leading-relaxed text-ink-600">{{ r.isi }}</p>
        <p class="text-[11px] text-ink-400 italic">Dasar saran: {{ r.pemicu }}</p>
      </article>

      <div class="space-y-2 pt-1 print:hidden">
        <UiTombol type="button" @click="cetak">🖨 Simpan / Cetak sebagai PDF</UiTombol>
        <UiTombol varian="kedua" ke="/beranda">Selesai</UiTombol>
      </div>

      <p class="pt-2 text-center text-[11px] leading-relaxed text-ink-400">
        Laporan ini bersifat penilaian mandiri dan bukan diagnosis medis.
        Bila keluhan berlanjut atau memberat, periksakan diri ke tenaga
        kesehatan.
      </p>
    </template>
  </div>
</template>

<style>
@media print {
  /* Sembunyikan kerangka aplikasi supaya cetakan hanya berisi laporan */
  header[class*='sticky'],
  nav,
  footer {
    display: none !important;
  }
  main {
    padding: 0 !important;
    max-width: none !important;
  }
}
</style>
