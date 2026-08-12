<script setup lang="ts">
import { WARNA } from '~~/lib/viz'
import { JUMLAH_SEGMEN, LABEL_REGIO } from '~~/lib/cmdq/segmen'
import { JUMLAH_AREA_TANGAN } from '~~/lib/chdq/area'
import { OPSI_USIA } from '~~/lib/sosiodemografi'

/**
 * Dasbor peneliti — konsol pemantauan pengumpulan data.
 *
 * Seluruh angka (kartu ringkasan, grafik, tabel, dan berkas ekspor) berasal
 * dari himpunan responden yang sama: filter di halaman ini diteruskan apa
 * adanya ke ketiga endpoint.
 */
definePageMeta({ middleware: 'admin', layout: 'admin' })
useHead({ title: 'Dasbor Peneliti — ErgoSelf' })

const filter = reactive({
  jenisKelamin: '',
  /**
   * Kategori rentang, bukan angka minimum/maksimum. Sebelumnya berupa dua
   * kotak angka yang diteruskan sebagai `usiaMin`/`usiaMaks` — pembandingan
   * yang tidak lagi punya arti sejak usia disimpan sebagai label rentang.
   */
  usia: '',
  divisi: '',
  jabatan: '',
  kategoriImt: '',
  statusProfil: '',
  cari: '',
  /**
   * Responden demo (`DEMO-###` dari `prisma/contoh.ts`) dikecualikan secara
   * bawaan agar data fiktif tidak pernah diam-diam masuk statistik, tabulasi
   * silang, maupun berkas ekspor yang menjadi dataset tesis. Saklar ini ada
   * supaya tampilan dasbor tetap bisa diuji tanpa responden sungguhan —
   * dan supaya keikutsertaan data demo selalu merupakan pilihan sadar yang
   * terlihat di layar.
   */
  sertakanContoh: '',
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
  query: computed(() => ({ ...kueri.value, halaman: halaman.value, perHalaman: 25 })),
})

/**
 * Pilihan filter divisi & jabatan.
 *
 * Diambil dari master CMS, termasuk entri NONAKTIF — sengaja berbeda dari
 * `/api/sosiodemografi` yang dipakai form responden. Filter dasbor bekerja atas
 * data yang sudah terkumpul; kalau entri yang dinonaktifkan hilang dari daftar
 * ini, responden dari divisi tersebut tidak bisa lagi disaring untuk ditinjau.
 */
const { data: masterDivisi } = await useFetch('/api/admin/master/divisi')
const { data: masterJabatan } = await useFetch('/api/admin/master/jabatan')

const opsiDivisi = computed(() => masterDivisi.value?.daftar ?? [])
const opsiJabatan = computed(() => masterJabatan.value?.daftar ?? [])

// ── Data grafik ───────────────────────────────────────────────────────────

/** 18 item CMDQ, urut jumlah pengeluh terbanyak — batang mendatar (label panjang) */
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

function petaRisiko(baris: { kategori: string; label: string; jumlah: number }[]) {
  return {
    label: baris.map((r) => r.label.replace('Risiko ', '')),
    nilai: baris.map((r) => r.jumlah),
    warna: baris.map(
      (r) => WARNA.risiko[r.kategori as keyof typeof WARNA.risiko],
    ),
  }
}

const grafikRisiko = computed(() =>
  petaRisiko(statistik.value?.distribusiRisiko ?? []),
)
const grafikRisikoChdq = computed(() =>
  petaRisiko(statistik.value?.distribusiRisikoChdq ?? []),
)

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

/**
 * Berkas ekspor memuat KODE responden, bukan nama dan surel. Itu yang
 * dijanjikan kepada responden pada lembar persetujuan, dan berkas ini
 * berpindah ke luar kendali aplikasi begitu diunduh. Identitas hanya ikut bila
 * peneliti memintanya secara sadar lewat tombol terpisah.
 */
const sertakanIdentitas = ref(false)

function unduh(format: 'xlsx' | 'csv') {
  const q = new URLSearchParams({ ...kueri.value, format })
  if (sertakanIdentitas.value) q.set('identitas', '1')
  window.location.href = `/api/admin/ekspor?${q}`
}

function aturUlang() {
  Object.assign(filter, {
    jenisKelamin: '',
    usia: '',
    divisi: '',
    jabatan: '',
    kategoriImt: '',
    statusProfil: '',
    cari: '',
    // Ikut dikembalikan ke keadaan aman: data contoh kembali dikecualikan.
    sertakanContoh: '',
  })
}

const adaFilter = computed(() => Object.values(filter).some((v) => v !== ''))

/** Banyaknya filter aktif — ditampilkan sebagai penghitung pada bilah saring. */
const jumlahFilter = computed(
  () => Object.values(filter).filter((v) => v !== '').length,
)

const gayaStatus = {
  SELESAI: 'bg-brand-150 text-brand-800',
  BERLANGSUNG: 'bg-risiko-sedang-bg text-risiko-sedang',
  BELUM: 'bg-panel text-ink-500',
} as const

const gayaRisiko = {
  RENDAH: 'bg-risiko-rendah-bg text-risiko-rendah',
  SEDANG: 'bg-risiko-sedang-bg text-risiko-sedang',
  TINGGI: 'bg-risiko-tinggi-bg text-risiko-tinggi-teks',
} as const

/**
 * Kemajuan pengisian, dalam persen.
 *
 * Lima langkah setara: registrasi (selalu terlewati begitu akun ada), profil,
 * CMDQ, CHDQ, SUS. CHDQ ikut dihitung sejak kuesioner tangan menjadi bagian
 * instrumen — tanpa itu bilah menunjukkan 100% untuk responden yang belum
 * mengisi satu instrumen penuh.
 */
function progresPersen(r: {
  statusProfil: string
  statusCmdq: string
  statusChdq: string
  statusSus: string
}) {
  let n = 20
  if (r.statusProfil === 'SELESAI') n += 20
  if (r.statusCmdq === 'SELESAI') n += 20
  if (r.statusChdq === 'SELESAI') n += 20
  if (r.statusSus === 'SELESAI') n += 20
  return n
}
</script>

<template>
  <div class="space-y-4">
    <!-- ── Kepala halaman ─────────────────────────────────────────────── -->
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="konsol-label">Pemantauan pengumpulan data</p>
        <h1 class="mt-0.5 text-xl font-bold text-ink">Dasbor Peneliti</h1>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <label
          class="flex h-[34px] cursor-pointer items-center gap-2 rounded-konsol-kecil border border-garis-kuat bg-white px-2.5 text-[12px] font-medium text-ink-700"
          title="Bawaannya berkas hanya memuat kode responden. Aktifkan hanya bila identitas benar-benar diperlukan."
        >
          <input
            v-model="sertakanIdentitas"
            type="checkbox"
            class="size-3.5 accent-aksen"
          />
          Sertakan identitas
        </label>
        <button type="button" class="konsol-tombol-utama" @click="unduh('xlsx')">
          <UiIkon nama="unduh" :ukuran="15" /> Excel
        </button>
        <button
          type="button"
          class="konsol-tombol"
          title="Hanya memuat lembar profil responden — tanpa skor per item CMDQ/CHDQ, rincian tiga dimensi, dan jawaban item SUS"
          @click="unduh('csv')"
        >
          <UiIkon nama="unduh" :ukuran="15" /> CSV
        </button>
      </div>
    </header>

    <p
      v-if="sertakanIdentitas"
      class="rounded-konsol-kecil border border-aksen/30 bg-aksen-lembut px-3 py-2 text-[12px] leading-relaxed text-aksen-teks"
      role="status"
    >
      Nama dan surel akan ikut dalam berkas unduhan. Berkas itu tidak lagi
      dilindungi aplikasi ini, sementara lembar persetujuan menjanjikan
      identitas responden diganti kode anonim.
    </p>

    <!-- ── Bilah saring ───────────────────────────────────────────────── -->
    <section class="konsol-kartu" aria-label="Filter data">
      <div class="flex flex-wrap items-center gap-2 p-3">
        <span class="konsol-label flex items-center gap-1.5 pr-1">
          <UiIkon nama="saring" :ukuran="14" /> Saring
          <span v-if="jumlahFilter" class="text-brand-600">({{ jumlahFilter }})</span>
        </span>

        <select
          v-model="filter.jenisKelamin"
          class="konsol-isian w-auto min-w-[7.5rem]"
          aria-label="Jenis kelamin"
        >
          <option value="">Semua gender</option>
          <option value="LAKI_LAKI">Laki-laki</option>
          <option value="PEREMPUAN">Perempuan</option>
        </select>

        <select
          v-model="filter.usia"
          class="konsol-isian w-auto min-w-[7.5rem]"
          aria-label="Kelompok usia"
        >
          <option value="">Semua usia</option>
          <option v-for="o in OPSI_USIA" :key="o" :value="o">{{ o }}</option>
        </select>

        <select
          v-model="filter.divisi"
          class="konsol-isian w-auto min-w-[9rem]"
          aria-label="Divisi"
        >
          <option value="">Semua divisi</option>
          <option v-for="o in opsiDivisi" :key="o.id" :value="o.nama">
            {{ o.aktif ? o.nama : `${o.nama} (nonaktif)` }}
          </option>
        </select>

        <select
          v-model="filter.jabatan"
          class="konsol-isian w-auto min-w-[9rem]"
          aria-label="Jabatan"
        >
          <option value="">Semua jabatan</option>
          <option v-for="o in opsiJabatan" :key="o.id" :value="o.nama">
            {{ o.aktif ? o.nama : `${o.nama} (nonaktif)` }}
          </option>
        </select>

        <select
          v-model="filter.kategoriImt"
          class="konsol-isian w-auto min-w-[8rem]"
          aria-label="Kategori IMT"
        >
          <option value="">Semua IMT</option>
          <option value="KURUS_BERAT">Kurus berat</option>
          <option value="KURUS_RINGAN">Kurus ringan</option>
          <option value="NORMAL">Normal</option>
          <option value="GEMUK_RINGAN">Gemuk ringan</option>
          <option value="OBESITAS">Obesitas</option>
        </select>

        <select
          v-model="filter.statusProfil"
          class="konsol-isian w-auto min-w-[9rem]"
          aria-label="Status profil"
        >
          <option value="">Semua status</option>
          <option value="SELESAI">Profil sudah lengkap</option>
          <option value="BELUM">Profil belum diisi</option>
        </select>

        <!-- Satu-satunya jalan menyaring divisi/jabatan hasil isian "Lainnya":
             daftar pilihan di atas hanya memuat kategori baku. -->
        <input
          v-model="filter.cari"
          type="search"
          placeholder="Cari kode, nama, divisi, jabatan, sub-bagian…"
          class="konsol-isian min-w-[16rem] flex-1"
          aria-label="Pencarian bebas"
        />

        <button
          v-if="adaFilter"
          type="button"
          class="konsol-tombol"
          @click="aturUlang"
        >
          Atur ulang
        </button>
      </div>

      <!-- Saklar data contoh: dipisahkan garis karena ia mengubah ARTI seluruh
           angka di halaman, bukan sekadar mempersempitnya seperti filter lain. -->
      <div
        class="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-kertas-garis px-3 py-2"
        :class="filter.sertakanContoh === '1' && 'bg-aksen-lembut'"
      >
        <label class="flex cursor-pointer items-center gap-2 text-[12px]">
          <input
            type="checkbox"
            class="size-3.5 accent-aksen"
            :checked="filter.sertakanContoh === '1'"
            @change="
              filter.sertakanContoh = ($event.target as HTMLInputElement).checked
                ? '1'
                : ''
            "
          />
          <span class="font-semibold" :class="filter.sertakanContoh === '1' ? 'text-aksen-teks' : 'text-ink-700'">
            Tampilkan data contoh (DEMO-…)
          </span>
        </label>
        <span class="text-[12px]" :class="filter.sertakanContoh === '1' ? 'text-aksen-teks' : 'text-ink-500'">
          <template v-if="filter.sertakanContoh === '1'">
            Responden fiktif sedang ikut dihitung — seluruh angka, grafik, dan
            berkas ekspor di halaman ini memuatnya.
          </template>
          <template v-else>
            Data fiktif untuk menguji tampilan. Dikecualikan secara bawaan.
          </template>
        </span>
      </div>
    </section>

    <!-- ── Strip ringkasan ────────────────────────────────────────────── -->
    <!--
      Pembatas antar-tile dibuat dari CELAH 1px berlatar garis, bukan dari
      `border-r` pada tiap anak: pada grid yang berganti dari 4 → 2 → 1 kolom,
      border kanan menyisakan garis menggantung di tepi baris terakhir setiap
      kali jumlah kolomnya berubah. Celah selalu benar karena ia latar induk
      yang tersingkap, bukan properti anak.
    -->
    <section
      class="grid gap-px overflow-hidden rounded-konsol border border-kertas-garis bg-kertas-garis sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Ringkasan"
    >
      <article class="bg-white p-3.5">
        <p class="konsol-label">Total responden</p>
        <p class="konsol-angka mt-1 text-[28px] leading-none font-semibold text-ink">
          {{ statistik?.jumlahResponden ?? 0 }}
        </p>
        <p class="mt-1.5 text-[12px] leading-relaxed text-ink-500">
          Profil {{ statistik?.progres.profilSelesai ?? 0 }} · CMDQ
          {{ statistik?.progres.cmdqSelesai ?? 0 }} · CHDQ
          {{ statistik?.progres.chdqSelesai ?? 0 }} · SUS
          {{ statistik?.progres.susSelesai ?? 0 }}
        </p>
      </article>

      <article class="bg-white p-3.5">
        <p class="konsol-label">CMDQ — keluhan tubuh</p>
        <p class="konsol-angka mt-1 text-[28px] leading-none font-semibold text-ink">
          {{ statistik?.cmdq?.skorRataRata ?? '—' }}
          <span
            v-if="statistik?.cmdq"
            class="text-[13px] font-normal text-ink-400"
          >
            / {{ statistik.cmdq.skorTotalMaks }}
          </span>
        </p>
        <p class="mt-1.5 text-[12px] leading-relaxed text-ink-500">
          <template v-if="statistik?.cmdq">
            n = {{ statistik.cmdq.n }} · rentang {{ statistik.cmdq.skorTerendah }}–{{
              statistik.cmdq.skorTertinggi
            }}
          </template>
          <template v-else>Belum ada yang mengisi</template>
        </p>
      </article>

      <article class="bg-white p-3.5">
        <p class="konsol-label">CHDQ — keluhan tangan</p>
        <p class="konsol-angka mt-1 text-[28px] leading-none font-semibold text-ink">
          {{ statistik?.chdq?.skorRataRata ?? '—' }}
          <span
            v-if="statistik?.chdq"
            class="text-[13px] font-normal text-ink-400"
          >
            / {{ statistik.chdq.skorTotalMaks }}
          </span>
        </p>
        <p class="mt-1.5 text-[12px] leading-relaxed text-ink-500">
          <template v-if="statistik?.chdq">
            n = {{ statistik.chdq.n }} · kanan
            {{ statistik.chdq.rataTanganKanan }} · kiri
            {{ statistik.chdq.rataTanganKiri }}
          </template>
          <template v-else>Belum ada yang mengisi</template>
        </p>
      </article>

      <article class="bg-white p-3.5">
        <div class="flex items-start justify-between gap-2">
          <p class="konsol-label">SUS — kebergunaan</p>
          <span
            v-if="statistik?.sus"
            class="konsol-lencana"
            :class="
              statistik.sus.memenuhiTarget
                ? 'bg-info-bg text-info'
                : 'bg-risiko-sedang-bg text-risiko-sedang'
            "
          >
            {{ statistik.sus.memenuhiTarget ? 'memenuhi' : 'di bawah' }}
          </span>
        </div>
        <p class="konsol-angka mt-1 text-[28px] leading-none font-semibold text-ink">
          {{ statistik?.sus?.skorRataRata ?? '—' }}
        </p>
        <p class="mt-1.5 text-[12px] leading-relaxed text-ink-500">
          <template v-if="statistik?.sus">
            n = {{ statistik.sus.n }} · rentang {{ statistik.sus.skorTerendah }}–{{
              statistik.sus.skorTertinggi
            }}
            · target ≥ {{ statistik.sus.target }}
          </template>
          <template v-else>Belum ada yang mengisi</template>
        </p>
      </article>
    </section>

    <p v-if="memuatStatistik" class="konsol-kartu p-8 text-center text-sm text-ink-500">
      Memuat statistik…
    </p>

    <template v-else-if="statistik && statistik.jumlahResponden > 0">
      <!-- ── Tiga distribusi berdampingan ─────────────────────────────── -->
      <div class="grid gap-4 xl:grid-cols-3">
        <section class="konsol-kartu">
          <div class="konsol-kepala">
            <h2 class="text-[13px] font-semibold text-ink">
              Kategori risiko — CMDQ
            </h2>
            <span class="konsol-label"
              >n = {{ statistik.progres.cmdqSelesai }}</span
            >
          </div>
          <div class="h-[200px] p-3">
            <GrafikBatang
              satuan="responden"
              :label="grafikRisiko.label"
              :nilai="grafikRisiko.nilai"
              :warna="grafikRisiko.warna"
            />
          </div>
        </section>

        <section class="konsol-kartu">
          <div class="konsol-kepala">
            <h2 class="text-[13px] font-semibold text-ink">
              Kategori risiko — CHDQ
            </h2>
            <span class="konsol-label"
              >n = {{ statistik.progres.chdqSelesai }}</span
            >
          </div>
          <div class="h-[200px] p-3">
            <GrafikBatang
              satuan="responden"
              :label="grafikRisikoChdq.label"
              :nilai="grafikRisikoChdq.nilai"
              :warna="grafikRisikoChdq.warna"
            />
          </div>
        </section>

        <section class="konsol-kartu">
          <div class="konsol-kepala">
            <h2 class="text-[13px] font-semibold text-ink">Kategori IMT</h2>
            <span class="konsol-label">Kemenkes RI</span>
          </div>
          <div class="h-[200px] p-3">
            <GrafikBatang
              satuan="responden"
              :label="grafikImt.label"
              :nilai="grafikImt.nilai"
            />
          </div>
        </section>
      </div>

      <!-- ── Keluhan per item & per regio ─────────────────────────────── -->
      <div class="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section class="konsol-kartu">
          <div class="konsol-kepala">
            <h2 class="text-[13px] font-semibold text-ink">
              Keluhan per bagian tubuh
            </h2>
            <span class="konsol-label">
              {{ JUMLAH_SEGMEN }} item CMDQ · n =
              {{ statistik.progres.cmdqSelesai }}
            </span>
          </div>
          <div class="h-[430px] p-3">
            <GrafikBatang
              arah="y"
              satuan="responden"
              :label="grafikSegmen.label"
              :nilai="grafikSegmen.nilai"
              :catatan="grafikSegmen.catatan"
            />
          </div>
        </section>

        <section class="konsol-kartu">
          <div class="konsol-kepala">
            <h2 class="text-[13px] font-semibold text-ink">
              Total skor per regio
            </h2>
            <span class="konsol-label"
              >{{ Object.values(LABEL_REGIO).length }} regio</span
            >
          </div>
          <div class="h-[430px] p-3">
            <GrafikBatang
              arah="y"
              satuan="poin"
              :label="grafikRegio.label"
              :nilai="grafikRegio.nilai"
            />
          </div>
        </section>
      </div>
    </template>

    <div v-else-if="statistik" class="konsol-kartu p-10 text-center">
      <p class="text-sm font-semibold text-ink-700">
        Tidak ada responden yang cocok dengan filter saat ini.
      </p>
      <button
        v-if="adaFilter"
        type="button"
        class="konsol-tombol mt-3"
        @click="aturUlang"
      >
        Atur ulang filter
      </button>
    </div>

    <!-- ── Tabel rekapitulasi ─────────────────────────────────────────── -->
    <section class="konsol-kartu">
      <div class="konsol-kepala">
        <h2 class="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          <UiIkon nama="tabel" :ukuran="15" /> Rekapitulasi Responden
        </h2>
        <span class="konsol-label">
          {{ rekap?.total ?? 0 }} baris · {{ JUMLAH_SEGMEN }} item CMDQ +
          {{ JUMLAH_AREA_TANGAN }} area CHDQ + 10 item SUS
        </span>
      </div>

      <p v-if="memuatRekap" class="py-10 text-center text-sm text-ink-500">
        Memuat…
      </p>

      <template v-else-if="rekap && rekap.total > 0">
        <!-- Tinggi dibatasi + kepala lengket: pada 25 baris, nama kolom keluar
             layar tepat saat mata sampai ke kolom skor. -->
        <div class="max-h-[640px] overflow-auto">
          <table class="konsol-tabel min-w-[1080px]">
            <thead>
              <tr>
                <th scope="col">Kode</th>
                <th scope="col">Demografi</th>
                <th scope="col">Divisi / Jabatan</th>
                <th scope="col" class="text-right">CMDQ</th>
                <th scope="col" class="text-right">CHDQ</th>
                <th scope="col" class="text-right">SUS</th>
                <th scope="col">Kemajuan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in rekap.baris" :key="b.id">
                <td>
                  <span class="konsol-angka font-semibold text-ink">
                    {{ b.kodeResponden }}
                  </span>
                  <span class="block text-[12px] text-ink-500">{{ b.nama }}</span>
                </td>

                <td>
                  <template v-if="b.statusProfil === 'SELESAI'">
                    <span class="text-ink-700">
                      {{ b.jenisKelamin === 'LAKI_LAKI' ? 'L' : 'P' }} ·
                      {{ b.usia ?? '—' }}
                    </span>
                    <span class="block text-[12px] text-ink-500">
                      IMT <span class="konsol-angka">{{ b.imt }}</span> ·
                      {{ b.labelKategoriImt }}
                    </span>
                  </template>
                  <span v-else class="konsol-lencana bg-panel text-ink-500">
                    profil belum diisi
                  </span>
                </td>

                <td>
                  <span class="text-ink-700">{{ b.divisi ?? '—' }}</span>
                  <span class="block text-[12px] text-ink-500">
                    {{ b.jabatan ?? '—' }}
                    <template v-if="b.unitKerja"> · {{ b.unitKerja }}</template>
                  </span>
                </td>

                <td class="angka">
                  <template v-if="b.cmdq">
                    <span class="font-semibold text-ink">{{ b.cmdq.skorTotal }}</span>
                    <span
                      class="konsol-lencana mt-0.5 block"
                      :class="gayaRisiko[b.cmdq.kategoriRisiko]"
                    >
                      {{ b.cmdq.labelKategoriRisiko.replace('Risiko ', '') }}
                    </span>
                  </template>
                  <span v-else class="konsol-lencana" :class="gayaStatus[b.statusCmdq]">
                    belum
                  </span>
                </td>

                <td class="angka">
                  <template v-if="b.chdq">
                    <span class="font-semibold text-ink">{{ b.chdq.skorTotal }}</span>
                    <span class="block text-[12px] text-ink-500">
                      Ka {{ b.chdq.skorTanganKanan }} · Ki
                      {{ b.chdq.skorTanganKiri }}
                    </span>
                  </template>
                  <span v-else class="konsol-lencana" :class="gayaStatus[b.statusChdq]">
                    belum
                  </span>
                </td>

                <td class="angka">
                  <template v-if="b.sus">
                    <span class="font-semibold text-ink">{{ b.sus.skorTotal }}</span>
                    <span class="block text-[12px] text-ink-500">
                      grade {{ b.sus.gradeHuruf }}
                    </span>
                  </template>
                  <span v-else class="konsol-lencana" :class="gayaStatus[b.statusSus]">
                    belum
                  </span>
                </td>

                <td>
                  <div class="flex items-center gap-2">
                    <div
                      class="h-1.5 w-20 overflow-hidden rounded-full bg-garis"
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
                    <span class="konsol-angka text-[12px] text-ink-500">
                      {{ progresPersen(b) }}%
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Penomoran halaman -->
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-t border-kertas-garis px-3 py-2.5"
        >
          <span class="text-[12px] text-ink-500">
            Halaman <span class="konsol-angka">{{ rekap.halaman }}</span> dari
            <span class="konsol-angka">{{ rekap.totalHalaman }}</span> ·
            <span class="konsol-angka">{{ rekap.total }}</span> responden
          </span>
          <div v-if="rekap.totalHalaman > 1" class="flex gap-2">
            <button
              type="button"
              class="konsol-tombol disabled:opacity-40"
              :disabled="rekap.halaman <= 1"
              @click="halaman--"
            >
              ← Sebelumnya
            </button>
            <button
              type="button"
              class="konsol-tombol disabled:opacity-40"
              :disabled="rekap.halaman >= rekap.totalHalaman"
              @click="halaman++"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      </template>

      <p v-else class="py-10 text-center text-sm text-ink-500">
        Belum ada responden yang cocok dengan filter.
      </p>
    </section>
  </div>
</template>
