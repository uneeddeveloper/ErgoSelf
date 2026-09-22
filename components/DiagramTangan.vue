<script setup lang="ts">
import {
  CERMIN_TANGAN_KIRI,
  JALUR_AREA,
  JALUR_DETAIL,
  JALUR_LUAR,
  LEBAR_DIAGRAM,
  SENTUH_AREA,
  TINGGI_DIAGRAM,
  TITIK_HURUF,
  URUTAN_JARI,
} from '~~/lib/chdq/diagram'
import { AREA_DASAR, LABEL_TANGAN, type Tangan } from '~~/lib/chdq/area'
import { AMBANG_AREA_SEDANG, AMBANG_AREA_TINGGI } from '~~/lib/chdq/skala'

/**
 * Diagram telapak tangan dengan enam area yang bisa disentuh.
 *
 * Gambarnya BUKAN tiruan: jalur vektornya diekstrak langsung dari `rhandq.pdf`
 * milik Cornell (lihat `lib/chdq/diagram.ts`). Tangan kiri adalah cerminannya,
 * sama seperti `lhandq.pdf` yang merupakan cerminan `rhandq.pdf`.
 *
 * Form Cornell menampilkan SATU area terarsir per diagram, enam diagram
 * berderet. Di layar sempit itu tidak mungkin, jadi keenam area digambar pada
 * satu tangan sekaligus — dan justru karena itu arsirannya tidak boleh
 * dihitamkan semua: area tanpa keluhan dibiarkan nyaris bening supaya bentuk
 * tangannya tetap terbaca, dan warna hanya muncul mengikuti keparahan.
 *
 * DUA JALUR MEMILIH, keduanya selalu tampak:
 *   1. mengetuk diagram — cepat bagi yang sudah paham gambarnya;
 *   2. deret tombol A–F di bawah diagram — target 44px penuh, andal untuk
 *      jari besar, tangan gemetar, papan tik, dan pembaca layar.
 *
 * Jalur kedua bukan pelengkap. Arsiran area A dan B sengaja BERTUMPANG TINDIH
 * di jari manis — itu memang isi instrumennya — sehingga betapapun rapinya
 * bantalan sentuh disusun, tepat di jari manis selalu ada ambiguitas visual.
 * Tombol berhuruf tidak punya ambiguitas itu.
 */

const props = defineProps<{
  tangan: Tangan
  /** Skor per kode area, mis. { KANAN_A: 45 } */
  skor: Record<string, number>
  aktif?: string | null
}>()

const emit = defineEmits<{ pilih: [kode: string] }>()

const cermin = computed(() =>
  props.tangan === 'KIRI' ? CERMIN_TANGAN_KIRI : undefined,
)

/** Posisi huruf ikut dicerminkan, tetapi bentuk hurufnya TIDAK dibalik. */
function x(nilai: number) {
  return props.tangan === 'KIRI' ? LEBAR_DIAGRAM - nilai : nilai
}

const area = computed(() =>
  AREA_DASAR.map((a) => ({
    huruf: a.huruf,
    nama: a.nama,
    kode: `${props.tangan}_${a.huruf}`,
    jalur: JALUR_AREA[a.huruf],
    sentuh: SENTUH_AREA.find((s) => s.huruf === a.huruf)!.bentuk,
    titik: TITIK_HURUF[a.huruf],
    skor: props.skor[`${props.tangan}_${a.huruf}`] ?? 0,
  })),
)

/** Urutan jari dibaca kiri→kanan; pada tangan kiri gambarnya tercermin. */
const urutanJari = computed(() =>
  props.tangan === 'KIRI' ? [...URUTAN_JARI].reverse() : [...URUTAN_JARI],
)

function isian(skor: number): string {
  if (skor <= 0) return 'fill-brand-600/10'
  if (skor <= AMBANG_AREA_SEDANG) return 'fill-risiko-rendah/45'
  if (skor <= AMBANG_AREA_TINGGI) return 'fill-risiko-sedang/55'
  return 'fill-risiko-tinggi/60'
}

function gayaTombol(skor: number, terpilih: boolean) {
  if (terpilih) return 'border-aksen bg-aksen-lembut text-aksen-teks'
  if (skor <= 0) return 'border-garis-kuat bg-isian text-ink-700'
  if (skor <= AMBANG_AREA_SEDANG)
    return 'border-risiko-rendah/40 bg-risiko-rendah-bg text-risiko-rendah'
  if (skor <= AMBANG_AREA_TINGGI)
    return 'border-risiko-sedang/40 bg-risiko-sedang-bg text-risiko-sedang'
  return 'border-risiko-tinggi/40 bg-risiko-tinggi-bg text-risiko-tinggi-teks'
}
</script>

<template>
  <figure class="rounded-kartu border border-garis bg-white p-3">
    <figcaption class="mb-1 text-center text-sm font-bold text-ink">
      {{ LABEL_TANGAN[tangan] }}
    </figcaption>

    <svg
      :viewBox="`0 0 ${LEBAR_DIAGRAM} ${TINGGI_DIAGRAM}`"
      class="mx-auto block w-full max-w-[320px] touch-manipulation"
      role="group"
      :aria-label="`Diagram ${LABEL_TANGAN[tangan].toLowerCase()}`"
    >
      <g :transform="cermin">
        <!-- Arsiran area — digambar lebih dulu agar berada di bawah garis -->
        <g class="pointer-events-none">
          <path
            v-for="a in area"
            :key="`arsir-${a.kode}`"
            :d="a.jalur"
            :class="[
              isian(a.skor),
              props.aktif === a.kode ? 'stroke-aksen' : 'stroke-brand-600/40',
            ]"
            :stroke-width="props.aktif === a.kode ? 1.4 : 0.4"
            stroke-linejoin="round"
          />
        </g>

        <!-- Garis luar & guratan detail, persis dari form Cornell -->
        <g
          class="pointer-events-none fill-none stroke-ink"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path :d="JALUR_LUAR" stroke-width="0.9" />
          <path :d="JALUR_DETAIL" stroke-width="0.45" class="stroke-ink-500" />
        </g>

        <!--
          Lapisan penangkap sentuhan — dirender PALING AKHIR supaya selalu di
          atas gambar. Bening dan tanpa garis: yang dilihat responden tetap
          arsiran Cornell, yang ditangkap jarinya adalah kotak yang lapang.
        -->
        <g>
          <g
            v-for="a in area"
            :key="`sentuh-${a.kode}`"
            class="cursor-pointer"
            role="button"
            tabindex="0"
            :aria-label="`Area ${a.huruf}, ${a.nama}${props.skor[a.kode] !== undefined ? `, skor ${a.skor}` : ', belum ditandai'}`"
            :aria-pressed="props.aktif === a.kode"
            @click="emit('pilih', a.kode)"
            @keydown.enter.prevent="emit('pilih', a.kode)"
            @keydown.space.prevent="emit('pilih', a.kode)"
          >
            <rect
              v-for="(b, i) in a.sentuh"
              :key="`hit-${a.kode}-${i}`"
              :x="b.x"
              :y="b.y"
              :width="b.w"
              :height="b.h"
              fill="transparent"
            />
          </g>
        </g>
      </g>

      <!-- Huruf DI LUAR grup bercermin: kalau ikut dicerminkan, teksnya
           terbalik seperti di cermin dan tidak terbaca pada tangan kiri. -->
      <g class="pointer-events-none" aria-hidden="true">
        <g v-for="a in area" :key="`huruf-${a.kode}`">
          <circle
            :cx="x(a.titik.x)"
            :cy="a.titik.y"
            r="4.6"
            class="fill-white"
            :class="props.aktif === a.kode ? 'stroke-aksen' : 'stroke-brand-600/60'"
            stroke-width="0.7"
          />
          <text
            :x="x(a.titik.x)"
            :y="a.titik.y + 2.1"
            text-anchor="middle"
            font-size="6"
            class="fill-ink font-extrabold"
          >
            {{ props.skor[a.kode] !== undefined ? a.skor : a.huruf }}
          </text>
        </g>
      </g>
    </svg>

    <!-- Urutan jari sebagai keterangan, bukan label di dalam gambar: pada
         bingkai selebar 65 satuan, lima label tambahan menutupi gambarnya. -->
    <p class="mt-1 text-center text-[10px] leading-tight text-ink-500">
      {{ urutanJari.join(' · ') }}
    </p>

    <!--
      Deret tombol A–F: jalur pilih yang tidak menuntut ketepatan sama sekali.
      Setinggi 44px penuh dan selebar seperenam kartu, jadi tetap layak sentuh
      di layar 360px sekalipun.
    -->
    <div
      class="mt-2 grid grid-cols-6 gap-1"
      role="group"
      :aria-label="`Pilih area ${LABEL_TANGAN[tangan].toLowerCase()}`"
    >
      <button
        v-for="a in area"
        :key="`tombol-${a.kode}`"
        type="button"
        class="touch-target flex flex-col items-center justify-center rounded-input border px-0.5 py-1 transition"
        :class="gayaTombol(a.skor, props.aktif === a.kode)"
        :aria-label="`Area ${a.huruf}, ${a.nama}${props.skor[a.kode] !== undefined ? `, skor ${a.skor}` : ', belum ditandai'}`"
        @click="emit('pilih', a.kode)"
      >
        <span class="text-sm leading-none font-extrabold">{{ a.huruf }}</span>
        <span
          v-if="props.skor[a.kode] !== undefined"
          class="mt-0.5 text-[9px] leading-none font-bold tabular-nums"
        >
          {{ a.skor }}
        </span>
      </button>
    </div>
  </figure>
</template>
