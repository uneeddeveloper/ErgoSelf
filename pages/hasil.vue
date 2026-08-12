<script setup lang="ts">
import { nomorTahap } from '~~/lib/alur'
import { belumAdaData } from '~~/lib/galat'
import { SKALA_FREKUENSI, SKALA_GANGGUAN, SKALA_KETIDAKNYAMANAN } from '~~/lib/cmdq/skala'

/**
 * Modul 3 — Hasil analisis keluhan CMDQ, ditampilkan langsung setelah
 * responden mengirim kuesioner (umpan balik seketika).
 */
definePageMeta({ middleware: 'responden' })
useHead({ title: 'Hasil Analisis Keluhan — ErgoSelf' })

const { data: hasil, pending, error, refresh } = await useFetch('/api/cmdq/saya')

/**
 * Hasil CHDQ, bila responden sudah mengisinya.
 *
 * 404 wajar dan tidak diperlakukan sebagai galat: keluhan tangan adalah tahap
 * BERIKUTNYA, jadi saat halaman ini pertama kali dibuka — tepat setelah peta
 * tubuh dikirim — memang belum ada isinya.
 */
const { data: hasilTangan } = await useFetch('/api/chdq/saya', {
  onResponseError: () => {},
})

const GAYA_RISIKO = {
  TINGGI: {
    warna: '#cf4436',
    lencana: 'bg-risiko-tinggi-bg text-risiko-tinggi-teks',
    teks: 'text-risiko-tinggi',
    ikon: 'peringatan',
  },
  SEDANG: {
    warna: '#a8680f',
    lencana: 'bg-risiko-sedang-bg text-risiko-sedang',
    teks: 'text-risiko-sedang',
    ikon: 'peringatan',
  },
  RENDAH: {
    warna: '#1c4c3b',
    lencana: 'bg-risiko-rendah-bg text-risiko-rendah',
    teks: 'text-risiko-rendah',
    ikon: 'selesai',
  },
} as const

type Kunci = keyof typeof GAYA_RISIKO

/** Segmen berkeluhan saja, urut dari yang paling berat. */
const segmenBermasalah = computed(
  () =>
    hasil.value?.perSegmen
      .filter((s) => s.skor > 0)
      .sort((a, b) => b.skor - a.skor) ?? [],
)

function labelFrekuensi(kode: number) {
  return SKALA_FREKUENSI.find((o) => o.nilai === kode)?.label ?? '-'
}
function labelKetidaknyamanan(nilai: number | null) {
  return SKALA_KETIDAKNYAMANAN.find((o) => o.nilai === nilai)?.label ?? '-'
}
function labelGangguan(nilai: number | null) {
  return SKALA_GANGGUAN.find((o) => o.nilai === nilai)?.label ?? '-'
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="pending" class="text-sm text-ink-500">Memuat hasil…</p>

    <!-- Belum mengisi -->
    <div
      v-else-if="error && belumAdaData(error)"
      class="kartu space-y-3 p-6 text-center"
    >
      <UiIkon nama="daftar" :ukuran="34" class="mx-auto text-brand-600" />
      <h1 class="text-lg font-extrabold text-ink">Belum ada hasil</h1>
      <p class="text-sm text-ink-600">
        Anda belum mengisi kuesioner keluhan tubuh. Isi terlebih dahulu untuk
        melihat skor dan tingkat risiko Anda.
      </p>
      <UiTombol ke="/kuesioner">Isi Kuesioner Sekarang</UiTombol>
    </div>

    <!-- Gagal memuat — dibedakan agar responden tidak mengira jawabannya
         hilang lalu mengisi ulang seluruh kuesioner. -->
    <div v-else-if="error" class="kartu space-y-3 p-6 text-center">
      <UiIkon nama="peringatan" :ukuran="34" class="mx-auto text-aksen" />
      <h1 class="text-lg font-extrabold text-ink">Gagal memuat hasil</h1>
      <p class="text-sm text-ink-600">
        Jawaban Anda tetap tersimpan. Periksa koneksi Anda lalu coba lagi.
      </p>
      <UiTombol type="button" @click="refresh()">Coba Lagi</UiTombol>
    </div>

    <template v-else-if="hasil">
      <div class="flex items-start justify-between gap-3">
        <h1 class="text-xl leading-tight font-extrabold text-brand-600">
          Hasil Analisis Keluhan (CMDQ)
        </h1>
      </div>

      <!-- Nomor tahap hanya ditulis sekali, oleh UiProgres. Sebelumnya ada
           teks tangan di atasnya yang menyebut angka berbeda. -->
      <UiProgres :tahap="nomorTahap('KUESIONER')" keterangan="Kemajuan Pengisian" />

      <!--
        Ringkasan CMDQ dan ringkasan CHDQ berdampingan di laptop. Keduanya
        adalah dua pembacaan atas orang yang sama pada minggu yang sama;
        ditumpuk vertikal, yang kedua sudah keluar layar saat yang pertama
        dibaca, sehingga tidak pernah dibandingkan.
      -->
      <div class="grid gap-4 lg:grid-cols-2 lg:items-start">
      <!-- Ringkasan skor total -->
      <section class="kartu flex flex-col items-center gap-3 p-5">
        <div
          class="grid h-[130px] w-[130px] place-items-center rounded-full"
          :style="{
            border: `9px solid ${GAYA_RISIKO[hasil.kategoriRisiko as Kunci].warna}`,
          }"
        >
          <div class="text-center">
            <div class="text-3xl font-extrabold text-ink">{{ hasil.skorTotal }}</div>
            <div class="text-[10px] tracking-wider text-ink-500">TOTAL SKOR</div>
          </div>
        </div>

        <span
          class="lencana"
          :class="GAYA_RISIKO[hasil.kategoriRisiko as Kunci].lencana"
        >
          <UiIkon :nama="GAYA_RISIKO[hasil.kategoriRisiko as Kunci].ikon" :ukuran="15" />
          {{ hasil.labelKategoriRisiko.toUpperCase() }}
        </span>

        <p class="text-center text-[13px] leading-relaxed text-ink-600">
          {{ hasil.saran }}
        </p>

        <dl class="grid w-full grid-cols-3 gap-2 border-t border-garis pt-3 text-center">
          <div>
            <dt class="text-[11px] text-ink-500">Bagian berkeluhan</dt>
            <dd class="text-base font-bold text-ink">
              {{ hasil.jumlahSegmenBermasalah }}<span class="text-xs font-medium text-ink-500">/{{ hasil.jumlahSegmenDinilai }}</span>
            </dd>
          </div>
          <div>
            <dt class="text-[11px] text-ink-500">Skor maksimum</dt>
            <dd class="text-base font-bold text-ink">{{ hasil.skorTotalMaks }}</dd>
          </div>
          <div>
            <dt class="text-[11px] text-ink-500">Persentase</dt>
            <dd class="text-base font-bold text-ink">{{ hasil.persenDariMaks }}%</dd>
          </div>
        </dl>
      </section>

      <!-- ── Keluhan tangan (CHDQ) ─────────────────────────────────────── -->
      <section
        v-if="hasilTangan"
        class="kartu space-y-3 p-5"
        aria-labelledby="judul-tangan"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="judul-tangan" class="text-sm font-bold text-ink">
            Keluhan Tangan
          </h2>
          <span
            class="rounded-lg px-2.5 py-1 text-xs font-bold"
            :class="GAYA_RISIKO[hasilTangan.kategoriRisiko as Kunci].lencana"
          >
            {{ hasilTangan.labelKategoriRisiko }}
          </span>
        </div>

        <dl class="grid grid-cols-3 gap-2 text-center">
          <div
            v-for="t in hasilTangan.perTangan"
            :key="t.tangan"
            class="rounded-input bg-panel px-2 py-2"
          >
            <dt class="text-[11px] text-ink-500">
              {{ t.tangan === 'KANAN' ? 'Tangan kanan' : 'Tangan kiri' }}
            </dt>
            <dd class="text-base font-extrabold text-ink">
              {{ t.skorTotal
              }}<span class="text-[10px] font-semibold text-ink-500">
                /{{ t.skorMaks }}</span
              >
            </dd>
          </div>
          <div class="rounded-input bg-panel px-2 py-2">
            <dt class="text-[11px] text-ink-500">Area berkeluhan</dt>
            <dd class="text-base font-extrabold text-ink">
              {{ hasilTangan.jumlahAreaBermasalah
              }}<span class="text-[10px] font-semibold text-ink-500">
                /{{ hasilTangan.jumlahAreaDinilai }}</span
              >
            </dd>
          </div>
        </dl>

        <p v-if="hasilTangan.areaTertinggi" class="text-xs text-ink-600">
          Keluhan terberat: <strong>{{ hasilTangan.areaTertinggi.nama }}</strong>
          ({{
            hasilTangan.areaTertinggi.tangan === 'KANAN'
              ? 'tangan kanan'
              : 'tangan kiri'
          }}).
        </p>
      </section>
      </div>

      <!-- Rincian per bagian tubuh -->
      <section v-if="segmenBermasalah.length > 0" class="space-y-3">
        <h2 class="text-sm font-bold text-ink">
          Rincian per Bagian Tubuh ({{ segmenBermasalah.length }})
        </h2>

        <!--
          Dua kolom di laptop. Kartunya diurutkan dari skor tertinggi, dan
          urutan itu tetap terbaca menurun-lalu-menyeberang seperti kolom
          koran — bukan pola yang membingungkan, karena tiap kartu sudah
          memuat angkanya sendiri.
        -->
        <div class="grid gap-3 lg:grid-cols-2">
        <article
          v-for="s in segmenBermasalah"
          :key="s.kodeSegmen"
          class="bg-white py-4 pr-4 pl-3.5"
          :style="{
            borderLeft: `4px solid ${GAYA_RISIKO[s.kategori as Kunci].warna}`,
            borderRadius: '0 12px 12px 0',
          }"
        >
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-base font-extrabold text-ink">{{ s.nama }}</h3>
            <span
              class="rounded-lg px-3 py-1 text-sm font-bold"
              :class="GAYA_RISIKO[s.kategori as Kunci].lencana"
            >
              {{ s.skor }}
            </span>
          </div>
          <p
            class="mt-1 text-xs font-bold"
            :class="GAYA_RISIKO[s.kategori as Kunci].teks"
          >
            RISIKO {{ s.kategori }}
          </p>

          <div class="mt-3 space-y-2">
            <div
              v-for="bar in [
                { label: 'Frekuensi', nilai: s.frekuensiKode, maks: 3, ket: labelFrekuensi(s.frekuensiKode) },
                { label: 'Ketidaknyamanan', nilai: s.ketidaknyamananSkor ?? 0, maks: 3, ket: labelKetidaknyamanan(s.ketidaknyamananSkor) },
                { label: 'Gangguan kerja', nilai: s.gangguanSkor ?? 0, maks: 3, ket: labelGangguan(s.gangguanSkor) },
              ]"
              :key="bar.label"
            >
              <div class="flex justify-between text-xs text-ink-700">
                <span>{{ bar.label }}</span>
                <span class="font-semibold">{{ bar.nilai }}/{{ bar.maks }}</span>
              </div>
              <div class="mt-1 h-[5px] overflow-hidden rounded-full bg-panel-2">
                <div
                  class="h-full rounded-full"
                  :style="{
                    width: `${(bar.nilai / bar.maks) * 100}%`,
                    background: GAYA_RISIKO[s.kategori as Kunci].warna,
                  }"
                />
              </div>
              <p class="mt-0.5 text-[11px] text-ink-400">{{ bar.ket }}</p>
            </div>
          </div>
        </article>
        </div>
      </section>

      <div
        v-else
        class="rounded-kartu border-[1.5px] border-dashed border-brand-300 bg-brand-150 p-5 text-center text-[13px] leading-relaxed text-brand-800"
      >
        Anda tidak melaporkan keluhan pada satu pun bagian tubuh. Pertahankan
        postur kerja yang baik dan tetap lakukan peregangan berkala.
      </div>

      <p
        class="rounded-kartu border-[1.5px] border-dashed border-brand-300 bg-brand-150 p-4 text-center text-[13px] leading-relaxed text-brand-800"
      >
        Visualisasi ini membantu Anda memprioritaskan area tubuh yang membutuhkan
        tindakan ergonomis segera.
      </p>

      <!-- Tombol berjajar mulai sm: pada layar lebar, tiga tombol selebar
           penuh yang bertumpuk terbaca sebagai tiga langkah berurutan,
           padahal dua di antaranya adalah jalan mundur. -->
      <div class="space-y-2 pt-1 sm:flex sm:flex-wrap sm:gap-2 sm:space-y-0">
        <!--
          Tahap berikutnya bergantung pada apa yang belum diisi. CHDQ adalah
          instrumen penelitian; SUS hanya menilai aplikasinya. Mengarahkan
          responden ke SUS lebih dulu berarti sebagian besar tidak akan pernah
          kembali untuk mengisi kuesioner tangan — halaman SUS berakhir di
          ringkasan, yang sudah terasa seperti garis akhir.
        -->
        <UiTombol v-if="!hasilTangan" varian="aksen" ke="/tangan" class="sm:w-auto">
          Lanjut ke Kuesioner Keluhan Tangan →
        </UiTombol>
        <UiTombol v-else varian="aksen" ke="/sus" class="sm:w-auto">
          Lanjut ke Kuesioner Penilaian Aplikasi →
        </UiTombol>

        <UiTombol varian="kedua" ke="/kuesioner" class="sm:w-auto">
          <UiIkon nama="peta-tubuh" :ukuran="18" /> Ubah Jawaban Peta Tubuh
        </UiTombol>
        <UiTombol v-if="hasilTangan" varian="kedua" ke="/tangan" class="sm:w-auto">
          Ubah Jawaban Keluhan Tangan
        </UiTombol>
      </div>
    </template>
  </div>
</template>
