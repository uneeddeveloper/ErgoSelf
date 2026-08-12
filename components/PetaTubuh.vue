<script setup lang="ts">
import {
  AREA_SEGMEN,
  JALUR_DETAIL,
  JALUR_TUBUH,
  LEBAR_KANVAS,
  TINGGI_KANVAS,
  pusatArea,
} from '~~/lib/cmdq/bodymap'
import { SEGMEN_TUBUH } from '~~/lib/cmdq/segmen'
import { AMBANG_SEGMEN_SEDANG, AMBANG_SEGMEN_TINGGI } from '~~/lib/cmdq/skala'

/**
 * Peta tubuh interaktif 18 item CMDQ.
 *
 * Figurnya diekstrak langsung dari `mmsquest.pdf` milik Cornell (lihat
 * `lib/cmdq/bodymap.ts`) — garis anatomis sungguhan, bukan susunan persegi
 * membulat seperti versi sebelumnya.
 *
 * FIGUR INI TAMPAK BELAKANG, sehingga sisi kanan layar adalah sisi kanan
 * responden. Tidak ada efek cermin. Alasannya diuraikan di modul geometri;
 * yang penting di sini: jangan menambahkan pembalikan kiri–kanan "supaya
 * terasa seperti bercermin", karena itu akan menukar seluruh pasangan
 * kiri/kanan pada data.
 *
 * Latar terang dan garis gelap dipilih menggantikan gaya hologram lama: seni
 * garis setipis ini hilang di atas latar gelap, dan warna keluhan justru harus
 * menjadi satu-satunya hal yang menyala.
 */

const props = withDefaults(
  defineProps<{
    /** Skor per kode item; kunci yang tidak ada berarti tidak ada keluhan */
    skor: Record<string, number>
    /** Item yang sedang dibuka panel pertanyaannya */
    aktif?: string | null
    /**
     * Bila false, peta hanya menampilkan hasil: tanpa `role="button"`,
     * tanpa `tabindex`, tanpa penangan sentuh. Dipakai di halaman ringkasan
     * yang mencetak laporan — di sana 18 tombol yang tidak melakukan apa-apa
     * hanya menjadi perhentian tab yang membingungkan.
     */
    interaktif?: boolean
  }>(),
  { aktif: null, interaktif: true },
)

const emit = defineEmits<{ pilih: [kode: string] }>()

const disorot = ref<string | null>(null)
const fokus = computed(() => disorot.value ?? props.aktif ?? null)

const segmen = new Map(SEGMEN_TUBUH.map((s) => [s.kode, s]))

const area = computed(() =>
  AREA_SEGMEN.map((a) => {
    const s = segmen.get(a.kode)
    return {
      ...a,
      nama: s?.nama ?? a.kode,
      /**
       * Penjelasan pembeda ikut dibawa ke label peta, bukan hanya ke panel
       * pertanyaan. Panel itu baru terbuka SETELAH responden mengetuk;
       * artinya orang yang belum yakin batas anatomisnya harus menebak dulu
       * untuk membaca penjelasan yang justru dimaksudkan mencegah tebakan.
       */
      petunjuk: s?.petunjuk ?? null,
      skor: props.skor[a.kode] ?? 0,
      pusat: pusatArea(a),
    }
  }),
)

function warna(skor: number) {
  if (skor <= 0) return { isi: 'fill-brand-600/8', garis: 'stroke-brand-600/25' }
  if (skor <= AMBANG_SEGMEN_SEDANG)
    return { isi: 'fill-risiko-rendah/40', garis: 'stroke-risiko-rendah/70' }
  if (skor <= AMBANG_SEGMEN_TINGGI)
    return { isi: 'fill-risiko-sedang/45', garis: 'stroke-risiko-sedang/70' }
  return { isi: 'fill-risiko-tinggi/50', garis: 'stroke-risiko-tinggi/70' }
}

function label(a: { nama: string; petunjuk: string | null; skor: number }) {
  const bagian = [a.nama]
  if (a.petunjuk) bagian.push(a.petunjuk)
  bagian.push(a.skor > 0 ? `skor ${a.skor}` : 'belum ditandai')
  return bagian.join(', ')
}
</script>

<template>
  <figure class="rounded-kartu border border-garis bg-white p-3">
    <figcaption
      class="mb-1 flex items-baseline justify-center gap-2 text-center text-[11px] text-ink-500"
    >
      <span class="font-bold text-ink">Tampak belakang</span>
      <span>· sisi kanan layar = sisi kanan Anda</span>
    </figcaption>

    <!--
      Lebar dibatasi 260px, bukan lebih kecil. Perbandingan figur Cornell
      ±1:3, jadi setiap pengecilan lebar langsung memangkas tinggi area sentuh:
      di bawah 260px, pita bahu turun ke bawah 44px dan tidak lagi layak
      dikenai jari. Konsekuensinya gambar ini tinggi (±800px) dan halaman perlu
      digulir — itu ditukar dengan target sentuh yang benar-benar bisa dikenai,
      dan daftar nama di bawah peta tetap menjadi jalur cepat.
    -->
    <svg
      :viewBox="`0 0 ${LEBAR_KANVAS} ${TINGGI_KANVAS}`"
      class="mx-auto block w-full max-w-[260px] touch-manipulation"
      role="group"
      aria-label="Peta tubuh — tampak belakang"
    >
      <!-- Area sentuh + warna keluhan, digambar di bawah garis anatomi -->
      <g
        v-for="a in area"
        :key="a.kode"
        :class="props.interaktif ? 'cursor-pointer' : undefined"
        :role="props.interaktif ? 'button' : undefined"
        :tabindex="props.interaktif ? 0 : undefined"
        :aria-label="props.interaktif ? label(a) : undefined"
        :aria-pressed="props.interaktif ? props.aktif === a.kode : undefined"
        @click="props.interaktif && emit('pilih', a.kode)"
        @keydown.enter.prevent="props.interaktif && emit('pilih', a.kode)"
        @keydown.space.prevent="props.interaktif && emit('pilih', a.kode)"
        @pointerenter="props.interaktif && (disorot = a.kode)"
        @pointerleave="props.interaktif && (disorot = null)"
        @focus="props.interaktif && (disorot = a.kode)"
        @blur="props.interaktif && (disorot = null)"
      >
        <rect
          :x="a.x"
          :y="a.y"
          :width="a.w"
          :height="a.h"
          rx="4"
          :class="[
            warna(a.skor).isi,
            fokus === a.kode ? 'stroke-aksen' : warna(a.skor).garis,
          ]"
          :stroke-width="fokus === a.kode ? 2.4 : 0.8"
        />

        <!-- Angka skor di tengah area, hanya bila ada keluhan -->
        <text
          v-if="a.skor > 0"
          :x="a.pusat.x"
          :y="a.pusat.y + 4"
          text-anchor="middle"
          font-size="11"
          class="pointer-events-none fill-ink font-extrabold"
        >
          {{ a.skor }}
        </text>
      </g>

      <!-- Garis anatomi Cornell — di atas warna, tidak menangkap sentuhan -->
      <g
        class="pointer-events-none fill-none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path :d="JALUR_TUBUH" class="stroke-ink" stroke-width="1.6" />
        <path :d="JALUR_DETAIL" class="stroke-ink-500" stroke-width="1" />
      </g>
    </svg>

    <!-- Nama bagian yang sedang disorot — muncul di tempat tetap supaya tidak
         tertutup jari, dan tingginya dikunci agar peta tidak melompat. -->
    <p
      class="mt-1.5 min-h-9 text-center text-[13px] leading-tight"
      aria-live="polite"
    >
      <template v-if="fokus">
        <span class="font-bold text-ink">
          {{ area.find((a) => a.kode === fokus)?.nama }}
        </span>
        <span
          v-if="area.find((a) => a.kode === fokus)?.petunjuk"
          class="block text-[11px] text-ink-500"
        >
          {{ area.find((a) => a.kode === fokus)?.petunjuk }}
        </span>
      </template>
      <span v-else-if="props.interaktif" class="text-ink-500">
        Sentuh bagian tubuh yang terasa ada keluhan
      </span>
    </p>
  </figure>
</template>
