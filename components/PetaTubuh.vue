<script setup lang="ts">
import {
  AREA_SEGMEN,
  BERKAS_CAHAYA,
  CINCIN,
  DETAIL_TAMPAK,
  FIGUR_TUBUH,
  JUDUL_TAMPAK,
  LEBAR_KANVAS,
  PARTIKEL,
  PUSAT_TAMPAK,
  TINGGI_KANVAS,
  type Tampak,
} from '~~/lib/cmdq/bodymap'
import { SEGMEN_TUBUH } from '~~/lib/cmdq/segmen'
import { kategorikanSkorSegmen } from '~~/lib/cmdq/skoring'

/**
 * Peta tubuh interaktif 28 segmen Nordic Body Map, bergaya hologram.
 *
 * Responden menyentuh bagian tubuh yang terasa nyeri; warna area berubah
 * mengikuti tingkat keluhan yang sudah diisi. Setiap area juga dapat dicapai
 * lewat papan tik (Tab + Enter) dan punya `aria-label` berisi nama segmen
 * serta status jawabannya.
 *
 * Latar gelap dipilih supaya guratan tubuh dan sorotan warna keluhan terbaca
 * jelas — termasuk di layar HP yang dipakai di lantai produksi.
 */

const props = defineProps<{
  /** Skor per kode segmen; kunci yang tidak ada berarti belum dijawab */
  skor: Record<string, number>
  /** Segmen yang sedang dibuka panel pertanyaannya */
  aktif?: string | null
}>()

const emit = defineEmits<{ pilih: [kode: string] }>()

/**
 * Smart focus — saat responden mengarahkan kursor/jari ke satu segmen,
 * segmen itu diperbesar sedikit dan area lain diredupkan, sehingga jelas
 * bagian mana yang akan terpilih. Penting pada layar HP, di mana jari
 * menutupi sebagian gambar.
 */
const disorot = ref<string | null>(null)

/** Segmen yang sedang jadi pusat perhatian: disorot > sedang aktif */
const fokus = computed(() => disorot.value ?? props.aktif ?? null)

/** Area lain diredupkan hanya ketika ada yang sedang disorot jari/kursor. */
function opasitas(kode: string): number {
  if (!disorot.value) return 1
  return disorot.value === kode ? 1 : 0.3
}

/** Perbesar sedikit segmen yang sedang difokus, berporos di tengah area. */
function transformasi(a: { x: number; y: number; w: number; h: number }, kode: string) {
  if (fokus.value !== kode) return undefined
  const cx = a.x + a.w / 2
  const cy = a.y + a.h / 2
  return `translate(${cx} ${cy}) scale(1.18) translate(${-cx} ${-cy})`
}

const namaSegmen = new Map(SEGMEN_TUBUH.map((s) => [s.kode, s.nama]))

/**
 * Palet hologram: isian tembus pandang + garis menyala. `pendar` menandai
 * status yang perlu efek cahaya — hanya dipakai pada segmen berkeluhan supaya
 * penapis blur SVG tidak dijalankan 28 kali sekaligus.
 */
const GAYA = {
  BELUM: {
    isi: 'rgba(52,211,153,0.07)',
    garis: 'rgba(167,243,208,0.35)',
    tebal: 1,
    pendar: false,
  },
  TIDAK_ADA: {
    isi: 'rgba(190,205,196,0.10)',
    garis: 'rgba(190,205,196,0.40)',
    tebal: 1,
    pendar: false,
  },
  RENDAH: {
    isi: 'rgba(205,240,90,0.28)',
    garis: '#cdf05a',
    tebal: 1.6,
    pendar: true,
  },
  SEDANG: {
    isi: 'rgba(251,191,36,0.30)',
    garis: '#fcd34d',
    tebal: 1.6,
    pendar: true,
  },
  TINGGI: {
    isi: 'rgba(244,98,58,0.38)',
    garis: '#ff9270',
    tebal: 1.8,
    pendar: true,
  },
} as const

type StatusArea = keyof typeof GAYA

function status(kode: string): StatusArea {
  const nilai = props.skor[kode]
  if (nilai === undefined) return 'BELUM'
  if (nilai <= 0) return 'TIDAK_ADA'
  return kategorikanSkorSegmen(nilai) as StatusArea
}

function keterangan(kode: string): string {
  const nama = namaSegmen.get(kode) ?? kode
  const nilai = props.skor[kode]
  if (nilai === undefined) return `${nama} — belum dijawab`
  if (nilai <= 0) return `${nama} — tidak ada keluhan`
  return `${nama} — skor ${nilai}`
}

/** Penapis cahaya dipasang saat segmen berkeluhan atau sedang disorot. */
function penapis(kode: string): string | undefined {
  return GAYA[status(kode)].pendar || fokus.value === kode
    ? 'url(#pendar-segmen)'
    : undefined
}

function tekan(event: KeyboardEvent, kode: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('pilih', kode)
  }
}

/** Setengah lingkaran bawah — bagian cincin yang lewat di DEPAN figur. */
function busurDepan(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`
}

const TAMPAK: readonly Tampak[] = ['DEPAN', 'BELAKANG']
const areaTersusun = [
  ...AREA_SEGMEN.filter((a) => a.tampak === 'DEPAN'),
  ...AREA_SEGMEN.filter((a) => a.tampak === 'BELAKANG'),
]
</script>

<template>
  <div class="peta-holo rounded-kartu p-3.5">
    <div class="mb-1 flex justify-around text-xs font-bold tracking-wide text-brand-100">
      <span>{{ JUDUL_TAMPAK.DEPAN.label }}</span>
      <span>{{ JUDUL_TAMPAK.BELAKANG.label }}</span>
    </div>

    <svg
      :viewBox="`0 0 ${LEBAR_KANVAS} ${TINGGI_KANVAS}`"
      class="w-full touch-manipulation"
      role="group"
      aria-label="Peta tubuh — pilih bagian yang terasa nyeri"
    >
      <defs>
        <radialGradient id="latar-holo" cx="50%" cy="42%" r="72%">
          <stop offset="0%" stop-color="#155e46" />
          <stop offset="55%" stop-color="#0a3226" />
          <stop offset="100%" stop-color="#04160f" />
        </radialGradient>

        <linearGradient id="isi-tubuh" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#34d399" stop-opacity="0.34" />
          <stop offset="55%" stop-color="#2dd4bf" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#0f766e" stop-opacity="0.14" />
        </linearGradient>

        <linearGradient id="berkas" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#34d399" stop-opacity="0" />
          <stop offset="35%" stop-color="#a7f3d0" stop-opacity="0.4" />
          <stop offset="65%" stop-color="#a7f3d0" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#34d399" stop-opacity="0" />
        </linearGradient>

        <!-- Pendar hijau untuk siluet dan cincin -->
        <filter id="pendar-tubuh" x="-30%" y="-15%" width="160%" height="130%">
          <feGaussianBlur stdDeviation="2.6" result="kabur" />
          <feMerge>
            <feMergeNode in="kabur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Pendar untuk area segmen yang sedang menyala -->
        <filter id="pendar-segmen" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="kabur" />
          <feMerge>
            <feMergeNode in="kabur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Bintik cahaya hanya boleh tampil di dalam tubuh -->
        <clipPath id="klip-figur">
          <path :d="FIGUR_TUBUH" />
        </clipPath>
      </defs>

      <rect
        x="0"
        y="0"
        :width="LEBAR_KANVAS"
        :height="TINGGI_KANVAS"
        rx="12"
        fill="url(#latar-holo)"
      />

      <!-- Dua figur: geometri sama, digeser 200 unit untuk tampak belakang -->
      <g
        v-for="t in TAMPAK"
        :key="t"
        :transform="`translate(${PUSAT_TAMPAK[t] - PUSAT_TAMPAK.DEPAN} 0)`"
      >
        <!-- Berkas cahaya vertikal -->
        <line
          v-for="(dx, i) in BERKAS_CAHAYA"
          :key="`berkas-${i}`"
          :x1="PUSAT_TAMPAK.DEPAN + dx"
          y1="10"
          :x2="PUSAT_TAMPAK.DEPAN + dx"
          y2="312"
          stroke="url(#berkas)"
          stroke-width="1.5"
        />

        <!-- Separuh cincin yang lewat di BELAKANG figur -->
        <g filter="url(#pendar-tubuh)">
          <ellipse
            v-for="(c, i) in CINCIN"
            :key="`cincin-belakang-${i}`"
            :cx="PUSAT_TAMPAK.DEPAN"
            :cy="c.cy"
            :rx="c.rx"
            :ry="c.ry"
            fill="none"
            stroke="#34d399"
            stroke-width="1.1"
            stroke-opacity="0.45"
            class="cincin"
            :style="{ animationDelay: `${i * 0.35}s` }"
          />
        </g>

        <!-- Siluet tubuh -->
        <g filter="url(#pendar-tubuh)">
          <path
            :d="FIGUR_TUBUH"
            fill="url(#isi-tubuh)"
            stroke="#a7f3d0"
            stroke-width="0.9"
            stroke-opacity="0.85"
            stroke-linejoin="round"
          />
        </g>

        <!-- Bintik cahaya di dalam tubuh -->
        <g clip-path="url(#klip-figur)" fill="#ecfdf5">
          <circle
            v-for="(p, i) in PARTIKEL"
            :key="`titik-${i}`"
            :cx="p.x"
            :cy="p.y"
            :r="p.r"
            :opacity="p.o"
          />
        </g>

        <!-- Garis anatomi -->
        <path
          :d="DETAIL_TAMPAK[t]"
          fill="none"
          stroke="#a7f3d0"
          stroke-width="0.7"
          stroke-opacity="0.5"
          stroke-linecap="round"
        />

        <!-- Separuh cincin yang lewat di DEPAN figur -->
        <g filter="url(#pendar-tubuh)">
          <path
            v-for="(c, i) in CINCIN"
            :key="`cincin-depan-${i}`"
            :d="busurDepan(PUSAT_TAMPAK.DEPAN, c.cy, c.rx, c.ry)"
            fill="none"
            stroke="#a7f3d0"
            stroke-width="1.6"
            stroke-opacity="0.9"
            stroke-linecap="round"
            class="cincin"
            :style="{ animationDelay: `${i * 0.35}s` }"
          />
        </g>
      </g>

      <!-- Garis pemisah dua tampak -->
      <line
        x1="200"
        y1="16"
        x2="200"
        y2="290"
        stroke="#34d399"
        stroke-opacity="0.25"
        stroke-width="1"
        stroke-dasharray="3 7"
      />

      <!-- Area segmen yang dapat dipilih -->
      <g
        v-for="a in areaTersusun"
        :key="a.kode"
        role="button"
        tabindex="0"
        class="cursor-pointer outline-none transition-opacity duration-150"
        :style="{ opacity: opasitas(a.kode) }"
        :aria-label="keterangan(a.kode)"
        :aria-pressed="props.aktif === a.kode"
        @click="emit('pilih', a.kode)"
        @keydown="tekan($event, a.kode)"
        @pointerenter="disorot = a.kode"
        @pointerleave="disorot = null"
        @focus="disorot = a.kode"
        @blur="disorot = null"
      >
        <!-- Lapisan tak terlihat: memperbesar target sentuh ±5 unit -->
        <rect
          :x="a.x - 5"
          :y="a.y - 5"
          :width="a.w + 10"
          :height="a.h + 10"
          fill="transparent"
        />
        <rect
          :x="a.x"
          :y="a.y"
          :width="a.w"
          :height="a.h"
          :rx="a.rx ?? Math.min(a.w, a.h) / 2"
          :fill="GAYA[status(a.kode)].isi"
          :stroke="fokus === a.kode ? '#ffffff' : GAYA[status(a.kode)].garis"
          :stroke-width="fokus === a.kode ? 2 : GAYA[status(a.kode)].tebal"
          :filter="penapis(a.kode)"
          :transform="transformasi(a, a.kode)"
          class="transition-[fill,stroke,stroke-width,transform] duration-150"
          style="transform-box: view-box"
        />
        <title>{{ keterangan(a.kode) }}</title>
      </g>

      <!-- Nama segmen yang sedang disorot, tampil di lorong antara dua figur -->
      <text
        v-if="fokus"
        :x="LEBAR_KANVAS / 2"
        :y="TINGGI_KANVAS - 6"
        text-anchor="middle"
        font-size="13"
        font-weight="700"
        fill="#a7f3d0"
      >
        {{ namaSegmen.get(fokus) }}
      </text>
    </svg>

    <p class="mt-2 text-center text-xs text-brand-100/85" aria-live="polite">
      <template v-if="fokus">
        {{ keterangan(fokus) }} — ketuk untuk mengisi
      </template>
      <template v-else>Ketuk bagian tubuh yang terasa nyeri</template>
    </p>

    <!-- Keterangan warna -->
    <div
      class="mt-3 flex flex-wrap justify-center gap-x-3.5 gap-y-1.5 border-t border-brand-400/25 pt-3 text-[11px] text-brand-100/75"
    >
      <span
        v-for="k in [
          { s: 'BELUM', t: 'Belum dijawab' },
          { s: 'TIDAK_ADA', t: 'Tidak ada keluhan' },
          { s: 'RENDAH', t: 'Ringan' },
          { s: 'SEDANG', t: 'Sedang' },
          { s: 'TINGGI', t: 'Berat' },
        ]"
        :key="k.s"
        class="inline-flex items-center gap-1.5"
      >
        <span
          class="inline-block h-3 w-3 rounded-full border"
          :style="{
            background: GAYA[k.s as StatusArea].isi,
            borderColor: GAYA[k.s as StatusArea].garis,
          }"
          aria-hidden="true"
        />
        {{ k.t }}
      </span>
    </div>

    <p
      class="mt-2.5 rounded-input border border-brand-400/25 bg-brand-400/10 px-3 py-2 text-[11px] leading-relaxed text-brand-100/90"
    >
      <strong>Catatan:</strong> tampak depan digambar seperti bercermin — sisi
      <em>kiri</em> Anda berada di sebelah kanan gambar. Nama bagian tubuh selalu
      muncul saat Anda menyentuhnya, jadi tidak perlu ragu.
    </p>
  </div>
</template>

<style scoped>
.peta-holo {
  background: radial-gradient(120% 90% at 50% 0%, #17624a 0%, #0a3226 55%, #04160f 100%);
  border: 1px solid rgb(52 211 153 / 0.25);
  box-shadow:
    0 0 0 1px rgb(4 22 15 / 0.6),
    0 14px 34px rgb(10 50 38 / 0.45);
}

/* Denyut halus pada cincin cahaya; dimatikan lewat aturan
   prefers-reduced-motion global di assets/css/main.css. */
.cincin {
  animation: denyut-cincin 4.5s ease-in-out infinite;
  transform-box: view-box;
  transform-origin: center;
}

@keyframes denyut-cincin {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}
</style>
