<script setup lang="ts">
import { LABEL_KATEGORI_RISIKO } from '~~/lib/cmdq/skala'

/**
 * Pengaturan penelitian — dua hal yang dulu tertanam sebagai konstanta di
 * dalam kode dan menuntut penerapan ulang aplikasi untuk mengubahnya:
 *
 *   1. Daftar divisi & jabatan (CMS master sosiodemografi)
 *   2. Ambang kategori risiko RENDAH/SEDANG/TINGGI (tersil empiris)
 *
 * Keduanya dikumpulkan di satu halaman karena sama-sama merupakan keputusan
 * peneliti yang harus diambil SEBELUM pengumpulan data dimulai, bukan
 * pengaturan sehari-hari.
 */
definePageMeta({ middleware: 'admin', layout: 'admin' })
useHead({ title: 'Pengaturan Penelitian — ErgoSelf' })

type JenisMaster = 'divisi' | 'jabatan'

interface EntriMaster {
  id: number
  nama: string
  urutan: number
  aktif: boolean
  jumlahResponden: number
}

const { data: divisi, refresh: muatDivisi } = await useFetch(
  '/api/admin/master/divisi',
)
const { data: jabatan, refresh: muatJabatan } = await useFetch(
  '/api/admin/master/jabatan',
)
const { data: ambang, refresh: muatAmbang } = await useFetch('/api/admin/ambang')

const daftar = computed<Record<JenisMaster, EntriMaster[]>>(() => ({
  divisi: (divisi.value?.daftar ?? []) as EntriMaster[],
  jabatan: (jabatan.value?.daftar ?? []) as EntriMaster[],
}))

const namaBaru = reactive<Record<JenisMaster, string>>({
  divisi: '',
  jabatan: '',
})
const sedangUbah = ref<{ jenis: JenisMaster; id: number } | null>(null)
const teksUbah = ref('')
const sibuk = ref(false)

/** Pesan hasil aksi terakhir — sukses maupun galat, termasuk peringatan. */
const kabar = ref<{ nada: 'baik' | 'buruk'; teks: string } | null>(null)

const LABEL: Record<JenisMaster, string> = {
  divisi: 'Divisi',
  jabatan: 'Jabatan',
}

async function muatUlang(jenis: JenisMaster) {
  await (jenis === 'divisi' ? muatDivisi() : muatJabatan())
}

function pesanGalat(error: any, bawaan: string) {
  return (error?.data?.statusMessage ?? error?.statusMessage ?? bawaan) as string
}

async function tambah(jenis: JenisMaster) {
  const nama = namaBaru[jenis].trim()
  if (!nama) return
  sibuk.value = true
  kabar.value = null
  try {
    await $fetch(`/api/admin/master/${jenis}`, {
      method: 'POST',
      body: { nama },
    })
    namaBaru[jenis] = ''
    await muatUlang(jenis)
    kabar.value = { nada: 'baik', teks: `${LABEL[jenis]} "${nama}" ditambahkan.` }
  } catch (error) {
    kabar.value = {
      nada: 'buruk',
      teks: pesanGalat(error, `Gagal menambah ${LABEL[jenis].toLowerCase()}.`),
    }
  } finally {
    sibuk.value = false
  }
}

function mulaiUbah(jenis: JenisMaster, entri: EntriMaster) {
  sedangUbah.value = { jenis, id: entri.id }
  teksUbah.value = entri.nama
}

async function simpanUbah() {
  const target = sedangUbah.value
  if (!target) return
  const nama = teksUbah.value.trim()
  if (!nama) return

  sibuk.value = true
  kabar.value = null
  try {
    const hasil = await $fetch<{ peringatan: string[] }>(
      `/api/admin/master/${target.jenis}/${target.id}`,
      { method: 'PUT', body: { nama } },
    )
    sedangUbah.value = null
    await muatUlang(target.jenis)
    kabar.value = {
      // Peringatan bukan galat — perubahannya berhasil. Tetapi ia harus
      // terbaca, karena menyangkut bagaimana data lama akan terbaca nanti.
      nada: hasil.peringatan.length > 0 ? 'buruk' : 'baik',
      teks:
        hasil.peringatan.length > 0
          ? hasil.peringatan.join(' ')
          : 'Nama diperbarui.',
    }
  } catch (error) {
    kabar.value = { nada: 'buruk', teks: pesanGalat(error, 'Gagal menyimpan.') }
  } finally {
    sibuk.value = false
  }
}

async function ubahAktif(jenis: JenisMaster, entri: EntriMaster) {
  sibuk.value = true
  kabar.value = null
  try {
    const hasil = await $fetch<{ peringatan: string[] }>(
      `/api/admin/master/${jenis}/${entri.id}`,
      { method: 'PUT', body: { aktif: !entri.aktif } },
    )
    await muatUlang(jenis)
    kabar.value = {
      nada: 'baik',
      teks:
        hasil.peringatan[0] ??
        `"${entri.nama}" ${entri.aktif ? 'dinonaktifkan' : 'diaktifkan kembali'}.`,
    }
  } catch (error) {
    kabar.value = { nada: 'buruk', teks: pesanGalat(error, 'Gagal mengubah.') }
  } finally {
    sibuk.value = false
  }
}

async function hapus(jenis: JenisMaster, entri: EntriMaster) {
  sibuk.value = true
  kabar.value = null
  try {
    await $fetch(`/api/admin/master/${jenis}/${entri.id}`, { method: 'DELETE' })
    await muatUlang(jenis)
    kabar.value = { nada: 'baik', teks: `"${entri.nama}" dihapus.` }
  } catch (error) {
    kabar.value = { nada: 'buruk', teks: pesanGalat(error, 'Gagal menghapus.') }
  } finally {
    sibuk.value = false
  }
}

async function hitungAmbang(instrumen: 'CMDQ' | 'CHDQ') {
  sibuk.value = true
  kabar.value = null
  try {
    const hasil = await $fetch<{
      ambangSedang: number
      ambangTinggi: number
      jumlahResponden: number
      peringatan: string[]
    }>('/api/admin/ambang', { method: 'POST', body: { instrumen } })
    await muatAmbang()
    kabar.value = {
      nada: hasil.peringatan.length > 0 ? 'buruk' : 'baik',
      teks: [
        `Ambang ${instrumen} dihitung ulang dari ${hasil.jumlahResponden} responden: RENDAH ≤ ${hasil.ambangSedang}, SEDANG ≤ ${hasil.ambangTinggi}, selebihnya TINGGI. Seluruh hasil yang sudah tersimpan ikut dikategorikan ulang.`,
        ...hasil.peringatan,
      ].join(' '),
    }
  } catch (error) {
    kabar.value = {
      nada: 'buruk',
      teks: pesanGalat(error, 'Gagal menghitung ambang.'),
    }
  } finally {
    sibuk.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <header>
      <p class="konsol-label">Konfigurasi penelitian</p>
      <h1 class="mt-0.5 text-xl font-bold text-ink">Pengaturan</h1>
      <p class="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-600">
        Sesuaikan sebelum pengumpulan data dimulai. Perubahan di halaman ini
        memengaruhi bagaimana data dikelompokkan pada analisis.
      </p>
    </header>

    <p
      v-if="kabar"
      class="rounded-konsol-kecil border px-3 py-2.5 text-[13px] leading-relaxed"
      :class="
        kabar.nada === 'baik'
          ? 'border-brand-300 bg-brand-150 text-brand-800'
          : 'border-risiko-tinggi/30 bg-risiko-tinggi-bg text-risiko-tinggi-teks'
      "
      role="status"
    >
      {{ kabar.teks }}
    </p>

    <div class="grid gap-4 xl:grid-cols-2">
      <!-- ── Master divisi & jabatan ─────────────────────────────────────── -->
      <section
        v-for="jenis in (['divisi', 'jabatan'] as JenisMaster[])"
        :key="jenis"
        class="konsol-kartu flex flex-col"
      >
        <div class="konsol-kepala">
          <h2 class="text-[13px] font-semibold text-ink">
            Daftar {{ LABEL[jenis] }}
          </h2>
          <span class="konsol-label">{{ daftar[jenis].length }} entri</span>
        </div>

        <p class="px-3.5 pt-3 text-[12px] leading-relaxed text-ink-500">
          Pilihan yang ditawarkan kepada responden pada form profil. Yang tidak
          menemukan pilihannya tetap bisa mengetik sendiri lewat "Lainnya".
        </p>

        <form class="flex gap-2 p-3.5" @submit.prevent="tambah(jenis)">
          <input
            v-model="namaBaru[jenis]"
            type="text"
            class="konsol-isian"
            :placeholder="`Tambah ${LABEL[jenis].toLowerCase()} baru…`"
            maxlength="120"
          />
          <button
            type="submit"
            class="konsol-tombol-utama"
            :disabled="sibuk || !namaBaru[jenis].trim()"
            :class="(sibuk || !namaBaru[jenis].trim()) && 'opacity-40'"
          >
            <UiIkon nama="tambah" :ukuran="15" /> Tambah
          </button>
        </form>

        <p
          v-if="daftar[jenis].length === 0"
          class="mx-3.5 mb-3.5 rounded-konsol-kecil border border-dashed border-garis-kuat px-4 py-6 text-center text-[13px] text-ink-500"
        >
          Belum ada {{ LABEL[jenis].toLowerCase() }}. Responden hanya akan
          melihat pilihan "Lainnya".
        </p>

        <div v-else class="flex-1 overflow-x-auto border-t border-kertas-garis">
          <table class="konsol-tabel">
            <thead>
              <tr>
                <th scope="col">Nama</th>
                <th scope="col" class="text-right">Dipakai</th>
                <th scope="col" class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entri in daftar[jenis]" :key="entri.id">
                <template
                  v-if="sedangUbah?.jenis === jenis && sedangUbah?.id === entri.id"
                >
                  <td colspan="3">
                    <div class="flex gap-2">
                      <input
                        v-model="teksUbah"
                        type="text"
                        class="konsol-isian"
                        maxlength="120"
                        @keyup.enter="simpanUbah"
                        @keyup.esc="sedangUbah = null"
                      />
                      <button
                        type="button"
                        class="konsol-tombol-utama"
                        :disabled="sibuk"
                        @click="simpanUbah"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        class="konsol-tombol"
                        @click="sedangUbah = null"
                      >
                        Batal
                      </button>
                    </div>
                  </td>
                </template>

                <template v-else>
                  <td>
                    <span
                      class="font-medium"
                      :class="entri.aktif ? 'text-ink' : 'text-ink-400 line-through'"
                    >
                      {{ entri.nama }}
                    </span>
                    <span
                      v-if="!entri.aktif"
                      class="konsol-lencana ml-1.5 bg-panel text-ink-500"
                    >
                      nonaktif
                    </span>
                  </td>

                  <td class="angka text-ink-600">{{ entri.jumlahResponden }}</td>

                  <td>
                    <div class="flex justify-end gap-1">
                      <button
                        type="button"
                        class="konsol-tombol h-7 px-2"
                        :disabled="sibuk"
                        @click="mulaiUbah(jenis, entri)"
                      >
                        <UiIkon nama="ubah" :ukuran="13" />
                        <span class="sr-only">Ubah nama {{ entri.nama }}</span>
                      </button>
                      <button
                        type="button"
                        class="konsol-tombol h-7 px-2 text-[12px]"
                        :disabled="sibuk"
                        @click="ubahAktif(jenis, entri)"
                      >
                        {{ entri.aktif ? 'Nonaktifkan' : 'Aktifkan' }}
                      </button>
                      <!--
                        Tombol hapus hanya muncul untuk entri yang belum dipakai
                        siapa pun. Untuk entri terpakai, satu-satunya jalan
                        adalah menonaktifkan — lihat alasannya di route DELETE.
                      -->
                      <button
                        v-if="entri.jumlahResponden === 0"
                        type="button"
                        class="konsol-tombol h-7 px-2 text-risiko-tinggi hover:border-risiko-tinggi hover:bg-risiko-tinggi-bg"
                        :disabled="sibuk"
                        @click="hapus(jenis, entri)"
                      >
                        <UiIkon nama="hapus" :ukuran="13" />
                        <span class="sr-only">Hapus {{ entri.nama }}</span>
                      </button>
                    </div>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- ── Ambang kategori risiko ─────────────────────────────────────────── -->
    <section class="konsol-kartu">
      <div class="konsol-kepala">
        <h2 class="text-[13px] font-semibold text-ink">Ambang Kategori Risiko</h2>
        <span class="konsol-label">
          tersil · persentil {{ ambang?.persentilSedang }} &
          {{ ambang?.persentilTinggi }}
        </span>
      </div>

      <p class="max-w-4xl px-3.5 pt-3 text-[12px] leading-relaxed text-ink-500">
        Cornell menyatakan kuesionernya untuk penapisan penelitian dan
        <em>bukan</em> untuk diagnosis, sehingga tidak menyediakan batas
        RENDAH/SEDANG/TINGGI. Batas di bawah dihitung dari data penelitian ini
        sendiri. Cantumkan nilainya di Bab III.
      </p>

      <div class="grid gap-4 p-3.5 lg:grid-cols-2">
        <article
          v-for="i in ambang?.instrumen ?? []"
          :key="i.kode"
          class="rounded-konsol-kecil border p-3.5"
          :class="
            i.dariData
              ? 'border-kertas-garis'
              : 'border-risiko-sedang/35 bg-risiko-sedang-bg/35'
          "
        >
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h3 class="text-[13px] font-semibold text-ink">{{ i.label }}</h3>
            <span
              class="konsol-lencana"
              :class="
                i.dariData
                  ? 'bg-brand-150 text-brand-800'
                  : 'bg-risiko-sedang-bg text-risiko-sedang'
              "
            >
              {{ i.dariData ? 'tersil empiris' : 'nilai sementara' }}
            </span>
          </div>

          <dl class="mt-3 grid grid-cols-3 overflow-hidden rounded-konsol-kecil border border-kertas-garis">
            <div class="border-r border-kertas-garis bg-panel-2 px-2 py-2 text-center">
              <dt class="konsol-label text-[10px]">
                {{ LABEL_KATEGORI_RISIKO.RENDAH.replace('Risiko ', '') }}
              </dt>
              <dd class="konsol-angka text-[15px] font-semibold text-ink">
                ≤ {{ i.ambangSedang }}
              </dd>
            </div>
            <div class="border-r border-kertas-garis bg-panel-2 px-2 py-2 text-center">
              <dt class="konsol-label text-[10px]">
                {{ LABEL_KATEGORI_RISIKO.SEDANG.replace('Risiko ', '') }}
              </dt>
              <dd class="konsol-angka text-[15px] font-semibold text-ink">
                ≤ {{ i.ambangTinggi }}
              </dd>
            </div>
            <div class="bg-panel-2 px-2 py-2 text-center">
              <dt class="konsol-label text-[10px]">
                {{ LABEL_KATEGORI_RISIKO.TINGGI.replace('Risiko ', '') }}
              </dt>
              <dd class="konsol-angka text-[15px] font-semibold text-ink">
                &gt; {{ i.ambangTinggi }}
              </dd>
            </div>
          </dl>

          <p class="mt-2.5 text-[12px] leading-relaxed text-ink-600">
            Skor maksimum <span class="konsol-angka">{{ i.skorMaks }}</span> ·
            data siap
            <span class="konsol-angka font-semibold">{{ i.jumlahRespondenSiap }}</span>
            responden
            <template v-if="!i.dapatDihitung">
              — minimal
              <span class="konsol-angka">{{ ambang?.minResponden }}</span> agar
              tersil stabil.
            </template>
            <template v-else-if="i.jumlahRespondenSiap !== i.jumlahResponden">
              — ambang saat ini dihitung dari
              <span class="konsol-angka">{{ i.jumlahResponden }}</span>
              responden, sudah tertinggal.
            </template>
          </p>

          <p v-if="i.catatan" class="mt-2 text-[12px] leading-relaxed text-risiko-sedang">
            {{ i.catatan }}
          </p>

          <button
            type="button"
            class="konsol-tombol mt-3"
            :disabled="sibuk || !i.dapatDihitung"
            :class="(sibuk || !i.dapatDihitung) && 'opacity-40'"
            @click="hitungAmbang(i.kode)"
          >
            Hitung ulang dari data
          </button>
        </article>
      </div>
    </section>
  </div>
</template>
