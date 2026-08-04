<script setup lang="ts">
import {
  BriefcaseIcon,
  ChartBarIcon,
  ChartPieIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CursorArrowRaysIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  HeartIcon,
  HomeIcon,
  LightBulbIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MapIcon,
  PencilSquareIcon,
  PrinterIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserCircleIcon,
} from '@heroicons/vue/24/outline'

/**
 * Ikon garis (Heroicons 24 outline) — satu pintu untuk seluruh aplikasi.
 *
 * Menggantikan emoji: emoji dirender berbeda-beda di tiap sistem operasi
 * (Windows, Android, iOS), ukurannya tidak dapat disamakan dengan teks di
 * sebelahnya, dan warnanya tidak mengikuti tema. Ikon garis mewarisi
 * `currentColor` sehingga selalu selaras dengan warna teks induknya.
 *
 * Nama ikon memakai istilah domain (bukan nama bentuk), supaya pemakaian
 * tetap masuk akal bila suatu saat bentuk ikonnya diganti.
 */
const PETA = {
  beranda: HomeIcon,
  'peta-tubuh': MapIcon,
  hasil: ChartBarIcon,
  penilaian: ClipboardDocumentCheckIcon,
  ringkasan: DocumentTextIcon,
  dokumen: DocumentTextIcon,
  dasbor: ChartPieIcon,

  registrasi: ShieldCheckIcon,
  profil: UserCircleIcon,
  pekerjaan: BriefcaseIcon,
  'statistik-fisik': ScaleIcon,
  kebiasaan: SparklesIcon,
  medis: HeartIcon,

  selesai: CheckCircleIcon,
  centang: CheckIcon,
  menunggu: ClockIcon,
  terkunci: LockClosedIcon,
  peringatan: ExclamationTriangleIcon,
  saran: LightBulbIcon,
  puas: FaceSmileIcon,

  cari: MagnifyingGlassIcon,
  daftar: ClipboardDocumentListIcon,
  cetak: PrinterIcon,
  ubah: PencilSquareIcon,
  tunjuk: CursorArrowRaysIcon,
} as const

const props = withDefaults(
  defineProps<{
    nama: keyof typeof PETA
    /** Sisi ikon dalam piksel */
    ukuran?: number
    /**
     * Isi hanya bila ikon menyampaikan makna yang TIDAK ada pada teks di
     * sekitarnya; selain itu ikon disembunyikan dari pembaca layar supaya
     * maknanya tidak dibacakan dua kali.
     */
    label?: string
  }>(),
  { ukuran: 20 },
)
</script>

<template>
  <component
    :is="PETA[props.nama]"
    class="inline-block shrink-0 align-[-0.15em]"
    :style="{ width: `${props.ukuran}px`, height: `${props.ukuran}px` }"
    :aria-hidden="props.label ? undefined : 'true'"
    :aria-label="props.label"
    :role="props.label ? 'img' : undefined"
  />
</template>
