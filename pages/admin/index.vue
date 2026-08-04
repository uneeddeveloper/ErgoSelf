<script setup lang="ts">
import { WARNA } from '~~/lib/viz'
import { LABEL_REGIO } from '~~/lib/cmdq/segmen'

/**
 * Dashboard peneliti — mengikuti mockup layar 08.
 *
 * Seluruh angka (kartu ringkasan, grafik, tabel, dan berkas ekspor) berasal
 * dari himpunan responden yang sama: filter di halaman ini diteruskan apa
 * adanya ke ketiga endpoint.
 */
definePageMeta({ middleware: 'admin', layout: 'admin' })
useHead({ title: 'Dashboard Peneliti — ErgoSelf' })

const filter = reactive({
  jenisKelamin: '',
  usiaMin: '',
  usiaMaks: '',
  kategoriImt: '',
  statusProfil: '',
  cari: '',
})

const halaman = ref(1)

/** Query string yang dipakai bersama oleh statistik, rekap, dan ekspor. */
const kueri = computed(() => {
  const q: Record<string, string> = {}
  for (const [k, v] of Object.entries(filter)) if (v !== '') q[k] = String(v)
  return q
})

watch(kueri, () => (halaman.value = 1))

const { data: statistik, pending: memuatStatistik } = await useFetch(
  '/api/admin/statistik',
  { query: kueri },
)
const { data: rekap, pending: memuatRekap } = await useFetch('/api/admin/rekap', {
  query: computed(() => ({ ...kueri.value, halaman: halaman.value, perHalaman: 15 })),
})

// ── Data grafik ───────────────────────────────────────────────────────────

/** 28 segmen, urut jumlah pengeluh terbanyak — batang mendatar (label panjang) */
const grafikSegmen = computed(() => {
  const baris = [...(statistik.value?.keluhanPerSegmen ?? [])].sort(
    (a, b) => b.jumlahMengeluh - a.jumlahMengeluh || a.urutan - b.urutan,
  )
  return {
    label: baris.map((s) => s.nama),
    nilai: baris.map((s) => s.jumlahMengeluh),
    catatan: baris.map(
      (s) => `${s.persenMengeluh}% responden · skor rata-rata ${s.skorRataRata}`,
    ),
  }
})

const grafikRisiko = computed(() => {
  const baris = statistik.value?.distribusiRisiko ?? []
  return {
    label: baris.map((r) => r.label.replace('Risiko ', '')),
    nilai: baris.map((r) => r.jumlah),
    warna: baris.map(
      (r) => WARNA.risiko[r.kategori as keyof typeof WARNA.risiko],
    ),
  }
})

const grafikImt = computed(() => {
  const baris = statistik.value?.distribusiImt ?? []
  return { label: baris.map((r) => r.label), nilai: baris.map((r) => r.jumlah) }
})

const grafikRegio = computed(() => {
  const baris = [...(statistik.value?.keluhanPerRegio ?? [])].sort(
    (a, b) => b.skorTotal - a.skorTotal,
  )
  return { label: baris.map((r) => r.label), nilai: baris.map((r) => r.skorTotal) }
})

// ── Ekspor ────────────────────────────────────────────────────────────────

function unduh(format: 'xlsx' | 'csv') {
  const q = new URLSearchParams({ ...kueri.value, format })
  window.location.href = `/api/admin/ekspor?${q}`
}

function aturUlang() {
  Object.assign(filter, {
    jenisKelamin: '',
    usiaMin: '',
    usiaMaks: '',
    kategoriImt: '',
    statusProfil: '',
    cari: '',
  })
}

const adaFilter = computed(() => Object.values(filter).some((v) => v !== ''))

const kelasPilih =
  'mt-1.5 w-full min-h-11 rounded-input border border-garis-kuat bg-white px-3 text-sm text-ink outline-none focus:border-brand-600'
const kelasLabelFilter =
  'text-[11px] font-bold tracking-wider text-ink-500 uppercase'

const gayaStatus = {
  SELESAI: 'bg-brand-150 text-brand-800',
  BERLANGSUNG: 'bg-risiko-sedang-bg text-risiko-sedang',
  BELUM: 'bg-panel text-ink-600',
} as const

/** Empat langkah: registrasi (selalu selesai), profil, CMDQ, SUS. */
function progresPersen(r: {
  statusProfil: string
  statusCmdq: string
  statusSus: string
}) {
  let n = 25 // registrasi + persetujuan etik selalu sudah dilalui
  if (r.statusProfil === 'SELESAI') n += 25
  if (r.statusCmdq === 'SELESAI') n += 25
  if (r.statusSus === 'SELESAI') n += 25
  return n
}
</script>

<template>
  <div class="space-y-6">
    <!-- Kepala + ekspor -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="flex items-center gap-2 text-[19px] font-extrabold text-ink">
        <UiIkon nama="cari" :ukuran="17" /> Filter Deskriptif (Bab IV)
      </h1>
      <div class="flex gap-2">
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-input bg-brand-600 px-4 text-[13px] font-bold text-white transition hover:bg-brand-700"
          @click="unduh('xlsx')"
        >
          ⇩ Export Excel
        </button>
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-input border border-garis-kuat bg-white px-4 text-[13px] font-bold text-ink-700 transition hover:bg-panel"
          @click="unduh('csv')"
        >
          ⇩ CSV
        </button>
      </div>
    </div>

    <!-- Filter -->
    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label :class="kelasLabelFilter" for="f-jk">Jenis Kelamin</label>
        <select id="f-jk" v-model="filter.jenisKelamin" :class="kelasPilih">
          <option value="">Semua Gender</option>
          <option value="LAKI_LAKI">Laki-laki</option>
          <option value="PEREMPUAN">Perempuan</option>
        </select>
      </div>

      <div>
        <span :class="kelasLabelFilter">Rentang Usia</span>
        <div class="mt-1.5 flex items-center gap-2">
          <input
            v-model="filter.usiaMin"
            type="number"
            min="17"
            max="70"
            placeholder="Min"
            aria-label="Usia minimum"
            class="min-h-11 w-full rounded-input border border-garis-kuat bg-white px-3 text-sm outline-none focus:border-brand-600"
          />
          <span class="text-ink-400">–</span>
          <input
            v-model="filter.usiaMaks"
            type="number"
            min="17"
            max="70"
            placeholder="Maks"
            aria-label="Usia maksimum"
            class="min-h-11 w-full rounded-input border border-garis-kuat bg-white px-3 text-sm outline-none focus:border-brand-600"
          />
        </div>
      </div>

      <div>
        <label :class="kelasLabelFilter" for="f-imt">Kategori IMT</label>
        <select id="f-imt" v-model="filter.kategoriImt" :class="kelasPilih">
          <option value="">Semua Kategori</option>
          <option value="KURUS_BERAT">Kurus berat</option>
          <option value="KURUS_RINGAN">Kurus ringan</option>
          <option value="NORMAL">Normal</option>
          <option value="GEMUK_RINGAN">Gemuk ringan</option>
          <option value="OBESITAS">Obesitas</option>
        </select>
      </div>

      <div>
        <label :class="kelasLabelFilter" for="f-status">Status Data</label>
        <select id="f-status" v-model="filter.statusProfil" :class="kelasPilih">
          <option value="">Semua Status</option>
          <option value="SELESAI">Profil sudah lengkap</option>
          <option value="BELUM">Profil belum diisi</option>
        </select>
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-3">
      <input
        v-model="filter.cari"
        type="search"
        placeholder="Cari nama, kode, atau unit kerja…"
        class="min-h-11 flex-1 rounded-input border border-garis-kuat bg-white px-3.5 text-sm outline-none focus:border-brand-600"
      />
      <button
        v-if="adaFilter"
        type="button"
        class="min-h-11 rounded-input px-3 text-[13px] font-semibold text-brand-600 hover:bg-brand-50"
        @click="aturUlang"
      >
        Atur ulang filter
      </button>
    </div>

    <!-- Kartu ringkasan -->
    <section class="grid gap-4 sm:grid-cols-3">
      <article class="rounded-r-input bg-white p-4" style="border-left: 4px solid #1c4c3b">
        <p :class="kelasLabelFilter">Total Responden</p>
        <p class="mt-0.5 text-3xl font-extrabold text-ink">
          {{ statistik?.jumlahResponden ?? 0 }}
        </p>
        <p class="text-xs text-ink-500">
          Profil {{ statistik?.progres.profilSelesai ?? 0 }} · CMDQ
          {{ statistik?.progres.cmdqSelesai ?? 0 }} · SUS
          {{ statistik?.progres.susSelesai ?? 0 }} selesai
        </p>
      </article>

      <article class="rounded-r-input bg-white p-4" style="border-left: 4px solid #33443c">
        <div class="flex items-start justify-between gap-2">
          <p :class="kelasLabelFilter">Skor SUS (rata-rata)</p>
          <span
            v-if="statistik?.sus"
            class="lencana"
            :class="
              statistik.sus.memenuhiTarget
                ? 'bg-info-bg text-info'
                : 'bg-risiko-sedang-bg text-risiko-sedang'
            "
          >
            {{ statistik.sus.memenuhiTarget ? 'Memenuhi target' : 'Di bawah target' }}
          </span>
        </div>
        <p class="mt-0.5 text-3xl font-extrabold text-ink">
          {{ statistik?.sus?.skorRataRata ?? '—' }}
        </p>
        <p class="text-xs text-ink-500">
          <template v-if="statistik?.sus">
            n = {{ statistik.sus.n }} · rentang {{ statistik.sus.skorTerendah }}–{{
              statistik.sus.skorTertinggi
            }}
            · target ≥ {{ statistik.sus.target }}
          </template>
          <template v-else>Belum ada responden yang mengisi SUS</template>
        </p>
      </article>

      <article class="rounded-r-input bg-white p-4" style="border-left: 4px solid #a8680f">
        <p :class="kelasLabelFilter">Skor CMDQ (rata-rata)</p>
        <p class="mt-0.5 text-3xl font-extrabold text-ink">
          {{ statistik?.cmdq?.skorRataRata ?? '—' }}
        </p>
        <p class="text-xs text-ink-500">
          <template v-if="statistik?.cmdq">
            n = {{ statistik.cmdq.n }} · rentang {{ statistik.cmdq.skorTerendah }}–{{
              statistik.cmdq.skorTertinggi
            }}
            dari maks {{ statistik.cmdq.skorTotalMaks }}
          </template>
          <template v-else>Belum ada responden yang mengisi CMDQ</template>
        </p>
      </article>
    </section>

    <p v-if="memuatStatistik" class="text-sm text-ink-500">Memuat statistik…</p>

    <template v-else-if="statistik && statistik.jumlahResponden > 0">
      <!-- Distribusi keluhan per segmen -->
      <section class="kartu p-5">
        <h2 class="text-base font-extrabold text-ink">
          Distribusi Keluhan MSDs (28 Segmen Tubuh)
        </h2>
        <p class="mb-3 text-[13px] text-ink-500">
          Jumlah responden yang melaporkan keluhan pada tiap segmen, dari
          {{ statistik.progres.cmdqSelesai }} responden yang sudah mengisi CMDQ
        </p>
        <div class="h-[620px]">
          <GrafikBatang
            arah="y"
            satuan="responden"
            :label="grafikSegmen.label"
            :nilai="grafikSegmen.nilai"
            :catatan="grafikSegmen.catatan"
          />
        </div>
      </section>

      <div class="grid gap-5 lg:grid-cols-2">
        <!-- Distribusi risiko -->
        <section class="kartu p-5">
          <h2 class="text-base font-extrabold text-ink">Distribusi Kategori Risiko</h2>
          <p class="mb-3 text-[13px] text-ink-500">
            Berdasarkan skor total CMDQ tiap responden
          </p>
          <div class="h-[240px]">
            <GrafikBatang
              satuan="responden"
              :label="grafikRisiko.label"
              :nilai="grafikRisiko.nilai"
              :warna="grafikRisiko.warna"
            />
          </div>
        </section>

        <!-- Distribusi IMT -->
        <section class="kartu p-5">
          <h2 class="text-base font-extrabold text-ink">Distribusi Kategori IMT</h2>
          <p class="mb-3 text-[13px] text-ink-500">
            Klasifikasi Kemenkes RI atas seluruh responden terfilter
          </p>
          <div class="h-[240px]">
            <GrafikBatang
              satuan="responden"
              :label="grafikImt.label"
              :nilai="grafikImt.nilai"
            />
          </div>
        </section>
      </div>

      <!-- Keluhan per regio -->
      <section class="kartu p-5">
        <h2 class="text-base font-extrabold text-ink">Total Skor Keluhan per Regio Tubuh</h2>
        <p class="mb-3 text-[13px] text-ink-500">
          Penjumlahan skor seluruh segmen dalam satu regio
          ({{ Object.values(LABEL_REGIO).length }} regio)
        </p>
        <div class="h-[240px]">
          <GrafikBatang
            satuan="poin"
            :label="grafikRegio.label"
            :nilai="grafikRegio.nilai"
          />
        </div>
      </section>
    </template>

    <div
      v-else-if="statistik"
      class="kartu p-8 text-center text-sm text-ink-500"
    >
      Tidak ada responden yang cocok dengan filter saat ini.
    </div>

    <!-- Tabel rekapitulasi -->
    <section class="kartu p-5">
      <h2 class="text-base font-extrabold text-ink">Rekapitulasi Progres Responden</h2>
      <p class="mb-3 text-[13px] text-ink-500">
        Monitoring status pengisian instrumen CMDQ &amp; SUS
      </p>

      <p v-if="memuatRekap" class="py-6 text-center text-sm text-ink-500">Memuat…</p>

      <div v-else-if="rekap && rekap.total > 0" class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-[13px]">
          <thead>
            <tr class="border-b border-garis text-[11px] tracking-wider text-ink-500 uppercase">
              <th scope="col" class="pb-2.5 font-bold">Kode</th>
              <th scope="col" class="pb-2.5 font-bold">Demografi</th>
              <th scope="col" class="pb-2.5 font-bold">CMDQ</th>
              <th scope="col" class="pb-2.5 font-bold">SUS</th>
              <th scope="col" class="pb-2.5 font-bold">Progres</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="b in rekap.baris"
              :key="b.id"
              class="border-b border-panel-2 last:border-0"
            >
              <td class="py-3.5 font-bold text-ink">
                {{ b.kodeResponden }}
                <span class="block text-xs font-normal text-ink-500">{{ b.nama }}</span>
              </td>
              <td class="py-3.5">
                <template v-if="b.statusProfil === 'SELESAI'">
                  <span class="font-semibold text-ink-700">
                    {{ b.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan' }},
                    {{ b.usia }} th
                  </span>
                  <span class="block text-xs text-ink-500">
                    IMT {{ b.imt }} · {{ b.labelKategoriImt }}
                  </span>
                </template>
                <span v-else class="lencana bg-panel text-ink-600">
                  Profil belum diisi
                </span>
              </td>
              <td class="py-3.5">
                <span class="lencana" :class="gayaStatus[b.statusCmdq]">
                  <UiIkon
                    :nama="b.statusCmdq === 'SELESAI' ? 'centang' : 'menunggu'"
                    :ukuran="14"
                  />
                  {{ b.statusCmdq === 'SELESAI' ? 'Selesai' : 'Belum' }}
                </span>
                <span v-if="b.cmdq" class="mt-1 block text-xs text-ink-500">
                  Skor {{ b.cmdq.skorTotal }} · {{ b.cmdq.labelKategoriRisiko }}
                </span>
              </td>
              <td class="py-3.5">
                <span class="lencana" :class="gayaStatus[b.statusSus]">
                  <UiIkon
                    :nama="b.statusSus === 'SELESAI' ? 'centang' : 'menunggu'"
                    :ukuran="14"
                  />
                  {{ b.statusSus === 'SELESAI' ? 'Selesai' : 'Belum' }}
                </span>
                <span v-if="b.sus" class="mt-1 block text-xs text-ink-500">
                  Skor {{ b.sus.skorTotal }} · Grade {{ b.sus.gradeHuruf }}
                </span>
              </td>
              <td class="py-3.5">
                <div
                  class="h-1.5 w-28 overflow-hidden rounded-full bg-garis"
                  role="progressbar"
                  :aria-valuenow="progresPersen(b)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    class="h-full rounded-full bg-brand-600"
                    :style="{ width: `${progresPersen(b)}%` }"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Penomoran halaman -->
        <div
          v-if="rekap.totalHalaman > 1"
          class="mt-4 flex items-center justify-between gap-3 border-t border-garis pt-4 text-[13px]"
        >
          <span class="text-ink-500">
            Halaman {{ rekap.halaman }} dari {{ rekap.totalHalaman }} ·
            {{ rekap.total }} responden
          </span>
          <div class="flex gap-2">
            <button
              type="button"
              class="min-h-10 rounded-input border border-garis-kuat px-3 font-semibold disabled:opacity-40"
              :disabled="rekap.halaman <= 1"
              @click="halaman--"
            >
              ← Sebelumnya
            </button>
            <button
              type="button"
              class="min-h-10 rounded-input border border-garis-kuat px-3 font-semibold disabled:opacity-40"
              :disabled="rekap.halaman >= rekap.totalHalaman"
              @click="halaman++"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      </div>

      <p v-else class="py-8 text-center text-sm text-ink-500">
        Belum ada responden yang cocok dengan filter.
      </p>
    </section>
  </div>
</template>
