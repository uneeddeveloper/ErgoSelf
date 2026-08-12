<script setup lang="ts">
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import { GAYA_GRAFIK, WARNA } from '~~/lib/viz'

/**
 * Grafik batang untuk dashboard peneliti.
 *
 * Satu seri saja — panjang batang yang mengkodekan besaran, bukan warna,
 * sehingga tidak perlu legenda. Warna per batang hanya dipakai bila datanya
 * memang berstatus (rendah/sedang/tinggi), dan di situ label sumbu selalu
 * tampil sehingga identitas tidak bergantung pada warna semata.
 */

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const props = withDefaults(
  defineProps<{
    label: readonly string[]
    nilai: readonly number[]
    /** Warna per batang; bila kosong seluruh batang memakai warna merek */
    warna?: readonly string[]
    /** 'y' = batang mendatar (untuk label panjang), 'x' = tegak */
    arah?: 'x' | 'y'
    satuan?: string
    /** Keterangan tambahan pada tooltip, sejajar indeks data */
    catatan?: readonly string[]
  }>(),
  { arah: 'x', satuan: '' },
)

const data = computed(() => ({
  labels: [...props.label],
  datasets: [
    {
      data: [...props.nilai],
      backgroundColor: props.warna ? [...props.warna] : WARNA.utama,
      borderRadius: GAYA_GRAFIK.radiusBatang,
      // Bulatkan hanya ujung data; pangkal tetap menempel garis dasar
      borderSkipped: props.arah === 'y' ? 'left' : 'bottom',
      categoryPercentage: GAYA_GRAFIK.tebalKategori,
      barPercentage: GAYA_GRAFIK.tebalBatang,
      maxBarThickness: 34,
    },
  ],
}))

/**
 * Angka pada sumbu memakai huruf mono, sama seperti tabel rekapitulasi.
 * Bukan kosmetik: lebar digitnya seragam, sehingga label "8" dan "18" pada
 * sumbu tidak bergeser dan grafik tidak tampak "bergetar" saat filter diubah.
 */
const FONT_ANGKA = {
  family: "'IBM Plex Mono', ui-monospace, monospace",
  size: 11,
} as const

const opsi = computed(() => ({
  indexAxis: props.arah === 'y' ? ('y' as const) : ('x' as const),
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: 4, right: 12 } },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0b1f18',
      padding: 10,
      cornerRadius: 6,
      titleFont: { size: 12, weight: 600 as const },
      bodyFont: { size: 12 },
      displayColors: false,
      callbacks: {
        label: (ctx: { parsed: { x: number; y: number }; dataIndex: number }) => {
          const nilai = props.arah === 'y' ? ctx.parsed.x : ctx.parsed.y
          const baris = [`${nilai}${props.satuan ? ` ${props.satuan}` : ''}`]
          const catatan = props.catatan?.[ctx.dataIndex]
          if (catatan) baris.push(catatan)
          return baris
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      border: { display: false },
      grid: {
        display: props.arah === 'y',
        color: WARNA.grid,
        drawTicks: false,
      },
      ticks: {
        color: WARNA.teksRedup,
        font: props.arah === 'y' ? FONT_ANGKA : { size: 11 },
        maxRotation: props.arah === 'x' ? 45 : 0,
        autoSkip: false,
      },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: {
        display: props.arah === 'x',
        color: WARNA.grid,
        drawTicks: false,
      },
      ticks: {
        color: WARNA.teksRedup,
        font: props.arah === 'x' ? FONT_ANGKA : { size: 11 },
        autoSkip: false,
      },
    },
  },
}))
</script>

<template>
  <Bar :data="data" :options="opsi" />
</template>
