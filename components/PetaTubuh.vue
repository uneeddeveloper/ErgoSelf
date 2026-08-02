<script setup lang="ts">
import {
  AREA_SEGMEN,
  JUDUL_TAMPAK,
  LEBAR_KANVAS,
  SILUET,
  TINGGI_KANVAS,
} from '~~/lib/cmdq/bodymap'
import { SEGMEN_TUBUH } from '~~/lib/cmdq/segmen'
import { kategorikanSkorSegmen } from '~~/lib/cmdq/skoring'

/**
 * Peta tubuh interaktif 28 segmen Nordic Body Map.
 *
 * Responden menyentuh bagian tubuh yang terasa nyeri; warna area berubah
 * mengikuti tingkat keluhan yang sudah diisi. Setiap area juga dapat dicapai
 * lewat papan tik (Tab + Enter) dan punya `aria-label` berisi nama segmen
 * serta status jawabannya.
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
  return disorot.value === kode ? 1 : 0.35
}

/** Perbesar sedikit segmen yang sedang difokus, berporos di tengah area. */
function transformasi(a: { x: number; y: number; w: number; h: number }, kode: string) {
  if (fokus.value !== kode) return undefined
  const cx = a.x + a.w / 2
  const cy = a.y + a.h / 2
  return `translate(${cx} ${cy}) scale(1.18) translate(${-cx} ${-cy})`
}

const namaSegmen = new Map(SEGMEN_TUBUH.map((s) => [s.kode, s.nama]))

const GAYA = {
  BELUM: { isi: '#ffffff', garis: '#d1d5db', tebal: 1 },
  TIDAK_ADA: { isi: '#eceeee', garis: '#d1d5db', tebal: 1 },
  RENDAH: { isi: '#d7e9e4', garis: '#0d9488', tebal: 1.5 },
  SEDANG: { isi: '#fde8cc', garis: '#b45309', tebal: 1.5 },
  TINGGI: { isi: '#fecaca', garis: '#dc2626', tebal: 1.5 },
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

function tekan(event: KeyboardEvent, kode: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('pilih', kode)
  }
}

const areaDepan = AREA_SEGMEN.filter((a) => a.tampak === 'DEPAN')
const areaBelakang = AREA_SEGMEN.filter((a) => a.tampak === 'BELAKANG')
</script>

<template>
  <div class="kartu p-3.5">
    <div class="mb-1 flex justify-around text-xs font-bold text-ink-700">
      <span>{{ JUDUL_TAMPAK.DEPAN.label }}</span>
      <span>{{ JUDUL_TAMPAK.BELAKANG.label }}</span>
    </div>

    <svg
      :viewBox="`0 0 ${LEBAR_KANVAS} ${TINGGI_KANVAS}`"
      class="w-full touch-manipulation"
      role="group"
      aria-label="Peta tubuh — pilih bagian yang terasa nyeri"
    >
      <!-- Siluet figur (tidak dapat diklik) -->
      <g fill="#f3f4f4" stroke="#e5e7eb" stroke-width="1">
        <template v-for="(b, i) in SILUET" :key="`siluet-${i}`">
          <ellipse
            v-if="b.tipe === 'ellipse'"
            :cx="b.x + b.w / 2"
            :cy="b.y + b.h / 2"
            :rx="b.w / 2"
            :ry="b.h / 2"
          />
          <rect
            v-else
            :x="b.x"
            :y="b.y"
            :width="b.w"
            :height="b.h"
            :rx="b.rx ?? 8"
          />
        </template>
      </g>

      <!-- Garis pemisah dua tampak -->
      <line
        x1="200"
        y1="8"
        x2="200"
        y2="264"
        stroke="#e5e7eb"
        stroke-width="1"
        stroke-dasharray="4 5"
      />

      <!-- Area segmen yang dapat dipilih -->
      <g
        v-for="a in [...areaDepan, ...areaBelakang]"
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
          :stroke="fokus === a.kode ? '#0d9488' : GAYA[status(a.kode)].garis"
          :stroke-width="fokus === a.kode ? 2.5 : GAYA[status(a.kode)].tebal"
          :transform="transformasi(a, a.kode)"
          class="transition-[fill,stroke,stroke-width,transform] duration-150"
          style="transform-box: view-box"
        />
        <title>{{ keterangan(a.kode) }}</title>
      </g>

      <!-- Nama segmen yang sedang disorot, tampil di bawah figur -->
      <text
        v-if="fokus"
        :x="LEBAR_KANVAS / 2"
        :y="TINGGI_KANVAS - 2"
        text-anchor="middle"
        font-size="13"
        font-weight="700"
        fill="#0d9488"
      >
        {{ namaSegmen.get(fokus) }}
      </text>
    </svg>

    <p class="mt-2 text-center text-xs text-ink-500" aria-live="polite">
      <template v-if="fokus">
        {{ keterangan(fokus) }} — ketuk untuk mengisi
      </template>
      <template v-else>Ketuk bagian tubuh yang terasa nyeri</template>
    </p>

    <!-- Keterangan warna -->
    <div
      class="mt-3 flex flex-wrap justify-center gap-x-3.5 gap-y-1.5 border-t border-garis pt-3 text-[11px] text-ink-500"
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

    <p class="mt-2.5 rounded-input bg-brand-150 px-3 py-2 text-[11px] leading-relaxed text-brand-800">
      <strong>Catatan:</strong> tampak depan digambar seperti bercermin — sisi
      <em>kiri</em> Anda berada di sebelah kanan gambar. Nama bagian tubuh selalu
      muncul saat Anda menyentuhnya, jadi tidak perlu ragu.
    </p>
  </div>
</template>
