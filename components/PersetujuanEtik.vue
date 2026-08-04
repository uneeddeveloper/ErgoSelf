<script setup lang="ts">
/**
 * Naskah persetujuan etik penelitian (informed consent).
 *
 * Ditampilkan sebelum responden mendaftar. Isinya mengikuti butir-butir baku
 * lembar persetujuan penelitian kesehatan: tujuan, prosedur, risiko, manfaat,
 * kerahasiaan, dan hak untuk mengundurkan diri.
 *
 * >>> PERIKSAKAN NASKAH INI KE KOMISI ETIK / PEMBIMBING sebelum pengambilan
 *     data. Isi di bawah adalah rancangan awal, bukan naskah tervalidasi. <<<
 */
const terbuka = ref(false)

const butir = [
  {
    judul: 'Tujuan penelitian',
    isi: 'Penelitian ini mengukur keluhan otot dan rangka (musculoskeletal disorders) pada pekerja pengguna komputer, serta menguji kemudahan penggunaan aplikasi pengukuran mandiri ini.',
  },
  {
    judul: 'Prosedur yang Anda jalani',
    isi: 'Anda akan mengisi data diri, menandai bagian tubuh yang terasa nyeri pada peta tubuh, menjawab tiga pertanyaan untuk tiap bagian, lalu menilai kemudahan penggunaan aplikasi. Seluruhnya memakan waktu sekitar 10–15 menit.',
  },
  {
    judul: 'Risiko & ketidaknyamanan',
    isi: 'Tidak ada tindakan medis maupun perlakuan fisik apa pun. Risiko yang mungkin timbul hanyalah rasa tidak nyaman ringan saat mengingat kembali keluhan yang Anda rasakan.',
  },
  {
    judul: 'Manfaat',
    isi: 'Anda langsung menerima skor keluhan dan saran perbaikan postur kerja. Hasil gabungan seluruh responden dipakai perusahaan dan peneliti untuk memperbaiki kondisi ergonomi di tempat kerja.',
  },
  {
    judul: 'Kerahasiaan data',
    isi: 'Identitas Anda diganti dengan kode responden anonim pada seluruh pelaporan. Nama Anda tidak akan muncul dalam tesis, publikasi, maupun laporan ke perusahaan. Data disimpan terbatas untuk keperluan penelitian.',
  },
  {
    judul: 'Hak mengundurkan diri',
    isi: 'Keikutsertaan bersifat sukarela. Anda boleh berhenti kapan saja tanpa alasan dan tanpa konsekuensi apa pun terhadap pekerjaan Anda.',
  },
]
</script>

<template>
  <div class="rounded-kartu border border-garis bg-panel-2">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      :aria-expanded="terbuka"
      aria-controls="isi-persetujuan"
      @click="terbuka = !terbuka"
    >
      <span class="text-[13px] font-bold text-ink-700">
        <UiIkon nama="dokumen" :ukuran="17" /> Baca lembar persetujuan penelitian
      </span>
      <span class="shrink-0 text-ink-500" aria-hidden="true">
        {{ terbuka ? '▲' : '▼' }}
      </span>
    </button>

    <div
      v-show="terbuka"
      id="isi-persetujuan"
      class="max-h-72 space-y-3 overflow-y-auto border-t border-garis px-4 py-3.5"
    >
      <p class="text-[13px] leading-relaxed text-ink-600">
        Penelitian tesis Program Magister Terapan Keselamatan dan Kesehatan
        Kerja, Universitas Gadjah Mada.
      </p>

      <div v-for="b in butir" :key="b.judul">
        <h3 class="text-[13px] font-bold text-brand-700">{{ b.judul }}</h3>
        <p class="mt-0.5 text-[13px] leading-relaxed text-ink-600">{{ b.isi }}</p>
      </div>

      <p class="border-t border-garis pt-3 text-xs leading-relaxed text-ink-500">
        Dengan mencentang kotak persetujuan, Anda menyatakan telah membaca dan
        memahami keterangan di atas, serta bersedia mengikuti penelitian ini
        secara sukarela. Tanggal persetujuan Anda akan direkam oleh sistem.
      </p>
    </div>
  </div>
</template>
