# Dokumen Keputusan Arsitektur — ErgoSelf

Hasil review sembilan peran (Software Architect, Database Architect, Backend
Engineer, Frontend Engineer, UI/UX Designer, 3D Engineer, Security Engineer,
QA Engineer, Research Methodology Reviewer) atas basis kode yang **sudah
berjalan**, bukan proyek baru.

Tanggal review: 2026-08-05 · Basis kode: ~8.800 baris, 16 endpoint, 13 halaman,
84 unit test (semua lulus).

---

## 0. Ringkasan eksekutif

Rekayasa perangkat lunaknya sehat. Yang tidak sehat adalah **metodologinya**,
dan satu konsekuensi keselamatan yang mengalir darinya.

Tiga hal harus diselesaikan sebelum pengambilan data dimulai:

1. **Jalur rujukan K3 adalah kode mati.** Tidak ada responden yang akan pernah
   disarankan mencari pertolongan, termasuk yang melaporkan nyeri berat harian
   di sepuluh bagian tubuh. Mereka justru dibacakan *"masih tergolong ringan."*
2. **Variabel kategori risiko akan konstan.** Ambang 252/504 secara aritmetika
   tak terjangkau; seluruh sampel akan RENDAH, dan setiap uji inferensial di
   atasnya kosong.
3. **Instrumen yang diklaim bukan instrumen yang diimplementasikan.** Judul,
   `nuxt.config.ts:26`, dan premis produk menyebut CMDQ; kodenya adalah hibrida
   NBM×CMDQ yang belum tervalidasi.

Yang **sudah benar dan bisa dipertahankan dengan percaya diri**: skoring SUS
(Brooke 1996, terjemahan tervalidasi Sharfina & Santoso 2016), klasifikasi IMT
(Depkes 2003, batas inklusif cocok persis), struktur perkalian tiga dimensi
CMDQ, atomisitas transaksi, dan tidak adanya IDOR di seluruh API.

---

## 1. Temuan yang dikonfirmasi lebih dari satu agent

Konvergensi independen dari sudut pandang berbeda adalah bukti terkuat yang
dihasilkan review ini. Temuan berikut ditemukan lebih dari sekali, tanpa agent
yang satu mengetahui hasil yang lain.

| Temuan | Ditemukan oleh | Kelas |
|---|---|---|
| PII (`Nama`, `Email`) di ekspor riset | Backend, Security, QA, Methodology | Etik |
| Ambang risiko tak terjangkau | Methodology (aritmetika), DB (silang) | Validitas |
| `SegmenTubuh.aktif` mem-brick submit CMDQ | DB, Backend, Methodology | Bug laten |
| Label SUS sudah divergen antara UI dan ekspor | Architect, DB, Backend | Data riset |
| Kamus Data hardcode 252/504/756/68 | DB, Backend, QA | Reproducibility |
| Kolom reproducibility tidak diekspor | DB, QA | Reproducibility |
| Tidak ada persistensi jawaban CMDQ | Frontend, UX | Kehilangan data |
| Target sentuh peta tubuh 15–19 px | Frontend, UX, 3D | Kualitas data |
| Denominator progres tidak konsisten (5 vs 4) | Frontend, UX | Penyelesaian |
| Tidak ada jalur penghapusan data / penarikan diri | Security, Methodology | UU PDP + etik |

---

## 2. Keputusan arsitektur

### ADR-001 — Ambang risiko: tinggalkan proporsi maksimum teoretis

**Status:** diputuskan · **Kelas:** membatalkan hasil analisis

**Konteks.** `lib/cmdq/skala.ts:82-88` menetapkan ambang pada 1/3 dan 2/3 dari
skor maksimum teoretis 756. Aritmetikanya:

```
SEDANG butuh > 252  →  ⌈253/27⌉ = 10 bagian tubuh di maksimum mutlak
TINGGI butuh > 504  →  ⌈505/27⌉ = 19 bagian tubuh di maksimum mutlak
```

Responden dengan nyeri maksimum di delapan bagian tubuh memperoleh 216 → RENDAH.
Pekerja kantor tipikal (6 keluhan sedang) memperoleh 48 dari 756 = 6,3%.

**Keputusan.** Hentikan penggunaan `kategoriRisiko` sebagai variabel hasil
utama. Ganti dengan:

1. `skorTotal` kontinu, dan
2. `jumlahSegmenBermasalah` (0–28, benar-benar bervariasi, langsung
   diinterpretasi), dan
3. **prevalensi per regio** — yang memang dilakukan literatur CMDQ.

Bila pembimbing tetap menghendaki variabel kategorik, pakai **tertil empiris
(P33/P67) dari sampel terkumpul**, dan nyatakan sebagai spesifik-sampel serta
tidak dapat digeneralisasi.

**Alternatif yang ditolak.**
- *Mempertahankan ambang saat ini* — menghasilkan variabel konstan; setiap uji
  khi-kuadrat, korelasi, atau regresi logistik di atasnya tidak terhitung atau
  tanpa makna.
- *Menurunkan proporsi ke 1/6 dan 2/6* — tetap arbitrer, hanya menggeser
  masalah tanpa dasar literatur.
- *Skema kategori aksi Nordic/Tarwaka* — punya cut-off terpublikasi, tetapi
  menuntut item keparahan 4 poin NBM per segmen yang tidak ada di instrumen ini.
  Layak sebagai variabel **sekunder**, bukan pengganti.

**Konsekuensi.**
- Bab IV harus ditulis ulang di bagian analisis risiko.
- `CmdqHasil.ambangSedang/ambangTinggi` sudah tersimpan per baris
  (`schema.prisma:244-245`), sehingga perhitungan ulang seluruh dataset dengan
  ambang terkoreksi bersifat trivial. Ini keputusan desain lama yang kini
  terbayar.
- Namun **tidak ada kode yang menghitung ulang kategori tersimpan** setelah
  konstanta berubah. Perlu skrip sekali-jalan.
- Ambang per segmen (9 dan 18 dari 27) **tidak** bermasalah sama parah —
  distribusinya 74% / 22% / 3,7% dari 27 kombinasi terjangkau — tetapi
  kombinasi (1, 3, 3) = 9 menghasilkan RENDAH untuk keluhan yang *sangat tidak
  nyaman* dan *sangat mengganggu pekerjaan*. Turunkan batas RENDAH/SEDANG ke 6.

---

### ADR-002 — Jalur rujukan keselamatan dilepas dari kategori risiko

**Status:** diputuskan · **Kelas:** keselamatan · **Prioritas tertinggi**

**Konteks.** Karena `TINGGI` tak terjangkau (ADR-001), `lib/rekomendasi.ts:131-138`
tidak pernah dieksekusi dan `lib/cmdq/skala.ts:103-104` membacakan *"Keluhan
yang Anda rasakan masih tergolong ringan"* kepada setiap responden tanpa
kecuali.

**Keputusan.** Picu rujukan dari kondisi independen yang terjangkau, misalnya:

- ada ≥1 segmen dengan skor ≥18 (yaitu kombinasi 2×3×3 atau 3×3×3), **atau**
- ada ≥3 segmen dengan ketidaknyamanan = 3 dan gangguan ≥2.

**Prinsip yang ditegakkan:** jalur keselamatan tidak boleh digantungkan pada
kategori turunan mana pun. Ini berlaku permanen, terlepas dari bagaimana
ADR-001 diselesaikan.

**Konsekuensi.** Perbaikan ini **tidak boleh menunggu** keputusan ambang atau
keputusan instrumen. Ia berdiri sendiri dan harus mendahului baris kode lain
mana pun.

---

### ADR-003 — Identitas instrumen: keputusan pembimbing, bukan keputusan teknis

**Status:** ⚠️ **menunggu keputusan pembimbing** · **Kelas:** validitas konstruk

**Konteks.** Perbandingan terhadap Cornell CMDQ (Hedge et al.):

| Dimensi | CMDQ baku | Kode ini | Setia? |
|---|---|---|---|
| Regio tubuh | 20 | 28 segmen NBM | **Tidak** |
| Opsi frekuensi | 5 | 4 | **Tidak** |
| Bobot frekuensi | 0 / 1,5 / 3,5 / 5 / 10 | 0 / 1 / 2 / 3 | **Tidak** |
| Skala ketidaknyamanan | 1–3 | 1–3 | Ya |
| Skala gangguan | 1–3 | 1–3 | Ya |
| Rumus | freq × discomfort × interference | sama | Ya |
| Maks per regio | 90 | 27 | **Tidak** |

Bobot CMDQ sengaja **non-linier** — lompatan 5→10 untuk "beberapa kali setiap
hari" adalah tempat instrumen memperoleh daya diskriminasinya bagi pengguna
komputer, yang justru menumpuk di ujung frekuensi tinggi. Mengganti dengan 0–3
sekaligus **meleburkan dua kategori frekuensi paling berat** dan **memampatkan
rentang yang paling menentukan**.

**Tiga opsi, dengan rekomendasi.**

| | Opsi | Konsekuensi |
|---|---|---|
| **A** ← *direkomendasikan reviewer* | Implementasikan CMDQ sebenarnya (20 regio, bobot 0/1,5/3,5/5/10) | Judul tesis selamat. Skor sebanding dengan literatur. Perlu: ganti `SEGMEN_TUBUH`, tambah opsi ke-5, gambar ulang body map SVG, seed ulang, sesuaikan tes. **Tanpa migrasi database** — `frekuensiBobot` sudah `Decimal(4,1)`. |
| **B** | Pertahankan 28 segmen, ganti nama instrumen dengan jujur | Menamainya "NBM" adalah misidentifikasi **kedua** — skoring NBM sendiri adalah skala keparahan 4 poin per segmen, bukan freq×discomfort×interference. Tesis berakhir tanpa instrumen tervalidasi dan berutang studi validitas–reliabilitas sendiri. |
| **C** | Pertahankan hibrida, justifikasi dengan preseden | Butuh preseden bernama untuk hibrida persis ini. "Orang lain juga begitu" bukan argumen validitas konstruk pada tingkat sidang magister. |

**Kenapa ini bukan keputusan saya.** Opsi A mengubah instrumen penelitian
setelah proposal kemungkinan besar disetujui. Itu wewenang pembimbing dan
mungkin komisi etik — bukan wewenang tim teknis. Yang bisa saya nyatakan
dengan pasti adalah **biaya teknis A jauh lebih rendah dari kelihatannya**, dan
bahwa mempertahankan status quo tanpa perubahan judul tidak dapat dipertahankan.

**Konsekuensi lintas-berkas bila A dipilih.** `lib/cmdq/segmen.ts`,
`lib/cmdq/skala.ts`, `lib/cmdq/bodymap.ts` (geometri 28→20 area),
`prisma/seed.ts`, `tests/bodymap.test.ts`, `tests/skoring-cmdq.test.ts`,
`docs/model-3d.md`. Skema database tidak berubah.

**Catatan.** ADR-001 berlaku **terlepas dari opsi mana pun**. Di bawah CMDQ
sebenarnya, totalnya menjadi 0–1800 dan masalah sepertiga–duapertiga identik.

---

### ADR-004 — Data demo dikecualikan secara bawaan

**Status:** diputuskan · **Kelas:** integritas penelitian

**Konteks.** `prisma/contoh.ts:21,150` membuat 12 responden `DEMO-*` berstatus
`SELESAI` dengan 28 jawaban CMDQ dan 10 item SUS lengkap.
`server/utils/filter.ts:73-94` tidak mengecualikannya, dan ketiga endpoint admin
memakai `where` itu apa adanya. Terhadap n=50–100, itu kontaminasi 11–19%
dataset tesis dengan data karangan.

**Keputusan.** `bacaFilter` mengecualikan `kodeResponden` berawalan `DEMO-`
secara bawaan, dengan opt-in eksplisit `?sertakanContoh=1` untuk menguji
dasbor.

**Alternatif yang ditolak.** *Mengandalkan `npm run db:bersihkan`* — komentar di
`contoh.ts:6-11` mengklaim pemisahan "tidak akan pernah tercampur", tetapi
jaminan itu hanya berlaku untuk penghapusan, bukan pembacaan. Prosedur manual
yang bergantung pada ingatan bukan kontrol.

---

### ADR-005 — Jawaban kuesioner dipertahankan lokal; navigasi dijaga

**Status:** diputuskan · **Kelas:** kehilangan data penelitian

**Konteks.** Tiga cacat yang saling memperkuat:

1. `pages/kuesioner.vue:23` — jawaban hanya hidup di `ref` komponen. Tidak ada
   Pinia, `useState`, localStorage, maupun autosave di seluruh repo.
2. `layouts/default.vue:81-104` — nav lima-tab lengket terlihat **selama
   pengisian**, tepat di bawah ibu jari. Setiap tab adalah `NuxtLink` yang
   melepas komponen tanpa konfirmasi.
3. `pages/kuesioner.vue:29-53` — `useFetch(..., { server: false })` non-blocking,
   lalu `watch(..., { immediate: true })` melakukan `jawaban.value = hasil`,
   yaitu **replace tanpa syarat**. Responden yang menandai segmen sebelum
   promise selesai kehilangan jawabannya, ditimpa state server yang mungkin
   kosong. Pola identik di `pages/sus/index.vue:20-29`.

**Keputusan.** Ketiganya diperbaiki bersama:

- `watch(jawaban, …, { deep: true })` menulis ke `localStorage` berkunci
  `ergoself:cmdq:<kodeResponden>`, dipulihkan saat mount **sebelum** watch
  server berjalan, dihapus setelah POST berhasil.
- `onBeforeRouteLeave` mengonfirmasi bila ada jawaban belum terkirim.
- Payload server hanya diterapkan bila objek lokal masih kosong (merge dengan
  lokal menang).

**Alternatif yang ditolak.** *Endpoint `PUT /api/cmdq/draf`* — lebih tangguh,
tetapi ~40 baris backend baru plus penanganan galat jaringan, sementara
localStorage menutup 95% risiko dalam ~25 baris tanpa menyentuh server.
Simpan untuk produktisasi.

---

### ADR-006 — Geometri area segmen diperbaiki; jalur masuk alternatif ditambahkan

**Status:** diputuskan · **Kelas:** kualitas data

**Konteks — bug tumpang tindih.** Dari `lib/cmdq/bodymap.ts:219-222` dengan pad
±5 di `PetaTubuh.vue:330-336`:

```
PINGGANG  y 120–144  →  pad 115–149
BOKONG    y 146–166  →  pad 141–171
PANTAT    y 168–184  →  pad 163–189
```

`PetaTubuh.vue:141-144` merender berurutan sehingga elemen belakangan menang,
dan rect ber-`fill="transparent"` **tetap** menangkap pointer event. Ketukan di
y163–166 — yang secara visual jelas BOKONG — tercatat sebagai **PANTAT**.

Ini salah-penetapan **sistematis searah** pada empat segmen dengan prevalensi
tertinggi pada kerja duduk, yaitu temuan utama tesis. Bukan derau acak yang
saling meniadakan.

**Konteks — ukuran target.** Pada viewport 360px, rantai `px-3` → `.layar px-4`
→ `p-3.5` menyisakan ~276px untuk viewBox 400 unit = 0,69 px/unit.
`PERGELANGAN_KAKI_*` menjadi 16,6 × 15,2 px. Ambang WCAG 2.5.8 adalah 24×24, dan
`assets/css/main.css:83-85` sudah punya utilitas `touch-target` 44px yang tidak
dipakai di sini.

**Keputusan.**
1. Pad dihitung per area sebagai `min(5, setengah jarak ke tetangga)`, sehingga
   tidak pernah tumpang tindih. **Uji Vitest** yang menegaskan tidak ada dua
   area berpad yang berpotongan.
2. Beri celah visual 3–4 unit antar segmen bersebelahan — ide "celah rambut"
   dari `docs/model-3d.md` diterapkan di SVG, di mana ia jauh lebih murah dan
   sekaligus membuat batas segmen terbaca.
3. Tambah daftar teks 28 segmen yang dapat dilipat di bawah peta, memakai ulang
   markup tombol di `pages/kuesioner.vue:187-208`, sehingga presisi jari tidak
   pernah menjadi syarat untuk melaporkan keluhan.

**Konflik yang diselesaikan.** UI/UX Designer menolak penghitung "sisa segmen"
dengan alasan kuat: tidak-ditandai memang berarti tidak ada keluhan, sehingga
kuota penyelesaian akan mendorong responden membuka 28 panel yang tidak perlu —
66 ketukan sia-sia yang menghasilkan data identik, sekaligus mengundang bias
akuiesensi. Frontend Engineer dan 3D Engineer meminta daftar teks. **Keduanya
benar dan tidak bertentangan:** daftar itu adalah *jalur masuk alternatif*,
bukan *penghitung penyelesaian*. Daftar ditambahkan; penghitung tidak.

---

### ADR-007 — Legenda peta diselaraskan dengan aturan pengiriman

**Status:** diputuskan · **Kelas:** kualitas data

**Konteks.** `PetaTubuh.vue:381` melabeli setiap segmen tak tersentuh **"Belum
dijawab"**, sementara `kuesioner.vue:119-130` mengirimkan segmen yang sama
sebagai `frekuensiKode: 0` = "tidak pernah". Aplikasi memberi tahu responden ada
22 hal belum terjawab lalu menerima pengirimannya. Selain itu swatch
`TIDAK_ADA` tidak pernah terjangkau: `kuesioner.vue:100-103` menghapus entri
saat `frekuensiKode === 0`.

**Keputusan.** Label `BELUM` → "Tidak ditandai (= tidak ada keluhan)"; hapus
swatch `TIDAK_ADA`; tambah satu kalimat di atas peta yang menyatakan aturannya
secara eksplisit.

**Konsekuensi.** Menghapus jalur 66-ketukan yang menghasilkan data identik, dan
menghapus alasan utama responden ragu untuk mengirim.

---

### ADR-008 — `petunjuk` bokong/pantat dimunculkan sebelum ketukan

**Status:** diputuskan · **Kelas:** kualitas data · **Biaya: satu baris**

**Konteks.** `lib/cmdq/segmen.ts:55-56` mendefinisikan pembeda bokong vs pantat.
Teks itu **memang** dirender — tetapi di `PanelJawabanSegmen.vue:147-149`, yaitu
di dalam panel yang terbuka **setelah** ketukan. Responden yang tidak bisa
membedakan keduanya harus menebak dulu untuk membaca penjelasan yang seharusnya
mencegah tebakan itu. Dan tebakannya bias ke PANTAT karena ADR-006.

**Keputusan.** Sambungkan `cariSegmen(kode)?.petunjuk` ke `keterangan()` di
`PetaTubuh.vue:113-119`, sehingga hover, fokus, `aria-label`, dan `<title>`
langsung memuatnya.

---

### ADR-009 — Satu konstanta tahap untuk seluruh perjalanan

**Status:** diputuskan · **Kelas:** penyelesaian kuesioner

**Konteks.** Denominator progres saling bertentangan: `daftar.vue:77` "1 dari 5",
`profil.vue:146` "2 dari 5", `kuesioner.vue:147` mengirim `:tahap="2"` tanpa
`total-tahap` sehingga `UiProgres.vue:9` memakai bawaan 4 → "2 dari **4**",
`hasil.vue:79-83` mencetak "3 dari 4" **dua kali**, `sus/index.vue:81` "4 dari 4"
dengan bilah buatan tangan, `sus/hasil.vue:66` memakai kata **"Langkah"**.

Dari `/profil` ke `/kuesioner` penyebut turun 5→4 dan bilah terisi **menyusut**.
Lalu "Tahap 4 dari 4" di halaman SUS adalah garis finis palsu — responden
menyimpulkan sudah selesai dan **tidak pernah membuka `/ringkasan`**, tempat
deliverable penelitian kepada partisipan berada.

**Keputusan.** Satu konstanta `TOTAL_TAHAP` diekspor; `UiProgres` dipakai di
setiap layar; satu kata benda. Hapus bilah buatan tangan dan teks ganda.

**Konsekuensi.** Ini juga jawaban langsung terhadap item SUS nomor 6 ("saya
menemukan banyak hal yang tidak konsisten") — aplikasi saat ini gagal pada item
itu di bilah progresnya sendiri.

---

### ADR-010 — Ekspor dipisahkan dari identitas

**Status:** diputuskan · **Kelas:** etik + UU PDP 27/2022

**Konteks.** `server/api/admin/ekspor.get.ts:76-78` menulis `Nama` dan `Email`
sebagai tiga kolom pertama, bersebelahan dengan `Setuju_Etik` dan
`Tanggal_Persetujuan`. `PersetujuanEtik.vue:33` menjanjikan identitas diganti
kode anonim. Berkas hasil kemudian hidup tanpa enkripsi di laptop peneliti, di
lampiran surel, dan di sinkronisasi awan — di luar setiap kendali aplikasi ini.

**Keputusan.** `Nama` dan `Email` dihapus dari ekspor analisis secara bawaan.
Bila diperlukan, sediakan lembar "Kunci Identitas" terpisah di balik parameter
eksplisit yang tercatat. Lembar analisis (CMDQ Skor, CMDQ Rinci, SUS) sudah
berkunci `Kode` saja dan tidak perlu berubah.

---

### ADR-011 — Ekspor memuat provenans ambang

**Status:** diputuskan · **Kelas:** reproducibility

**Konteks.** `CmdqHasil.ambangSedang`, `ambangTinggi`, `jumlahSegmenDinilai`
(`schema.prisma:243-245`) dan `CmdqJawaban.frekuensiBobot` (`:203`) ada persis
supaya hasil bertahan terhadap perubahan konstanta. Tidak satu pun muncul di
`ekspor.get.ts`. Dan `:245-250` menulis "1 = Rendah (≤252)" sebagai literal,
bukan membaca nilai tersimpan.

Desain reproducibility-nya benar **di database** dan hilang **di deliverable**.
Begitu ADR-001 atau ADR-003 dijalankan, kolom terekspor tidak lagi mereproduksi
`Skor` terekspor.

**Keputusan.** Tambahkan `Bobot_Frekuensi` ke lembar CMDQ Rinci, serta
`CMDQ_Ambang_Sedang`, `CMDQ_Ambang_Tinggi`, `CMDQ_Segmen_Dinilai` ke lembar
Responden. Kamus Data memakai template literal dari konstanta
(`SKOR_TOTAL_MAKS`, `AMBANG_TOTAL_SEDANG`, `TARGET_SUS`), bukan angka tertulis.

**Konsekuensi.** Datanya sudah ada di hasil query — ini murni kode pemetaan.

**Terkait.** Ekspor CSV (`ekspor.get.ts:123-144`) hanya memancarkan lembar
Responden. Siapa pun yang mengekspor CSV **tidak** memperoleh 28 skor per
segmen. Endpoint tidak memperingatkan. Perlu peringatan atau penonaktifan.

---

### ADR-012 — Perbaikan keamanan sebelum penyebaran publik

**Status:** diputuskan · **Kelas:** keamanan + kepatuhan

Peringkat risiko untuk penyebaran publik yang mengumpulkan data kesehatan nyata:
**MEDIUM-HIGH** — bukan karena ada bug logika aplikasi (praktis tidak ada),
melainkan karena satu prompt kata sandi tanpa pembatasan berdiri di antara
internet dan ekspor penuh rekam kesehatan bernama.

| # | Temuan | Bukti | Keputusan |
|---|---|---|---|
| 1 | Hash pembanding bcrypt **tidak valid** (51 karakter, seharusnya 60) sehingga kembali dalam 0 ms vs 58 ms → oracle enumerasi partisipan | `auth/responden.post.ts:38-41`, `auth/admin.post.ts:30-32` | Ganti dengan hash bcrypt nyata dari string acak, dibuat sekali saat boot |
| 2 | **CSV formula injection** — `escape()` hanya menangani `[",\n;]`, tidak `= + - @` | `ekspor.get.ts:125-128` | Awali nilai berkarakter pertama `=+-@\t\r` dengan kutip tunggal. Jalur XLSX aman (terverifikasi: ExcelJS memberi tipe `String`, bukan `Formula`) |
| 3 | Tidak ada rate limiting di seluruh `/api/auth/*` | tidak ada `server/middleware/` | Throttle per-IP + per-akun; naikkan cost bcrypt ke 12 |
| 4 | Sesi **tidak pernah kedaluwarsa** — `nuxt.config.ts` tidak mendeklarasikan blok `session`, sehingga `maxAge` kosong dan token tersegel disegel dengan `ttl: 0` | `nuxt.config.ts` | `session: { maxAge: 60 * 60 * 8 }` |
| 5 | Registrasi mengembalikan 409 untuk surel terdaftar → oracle enumerasi kedua | `auth/daftar.post.ts:33-43, 86-92` | Registrasi berbasis undangan, atau balasan seragam |
| 6 | **Tidak ada satu pun handler `DELETE`** di seluruh API | seluruh `server/api/` | Lihat ADR-013 |

**Dikonfirmasi aman — nyatakan ini di bab keamanan tesis.** Ketiga endpoint
admin memanggil `wajibAdmin(event)` sebagai statement pertama sebelum query apa
pun (`ekspor.get.ts:40`, `rekap.get.ts:12`, `statistik.get.ts:18`); permintaan
tanpa autentikasi mengembalikan 401 tanpa membocorkan apa pun. Tidak ada IDOR —
tidak ada satu pun route param di API, semua query berpangkal pada `sesi.id`
dari cookie tersegel. Tidak ada SQL mentah. Tidak ada `v-html`. CSRF tertutup
oleh `sameSite=lax` plus mutasi hanya lewat POST/PUT. Skor tidak pernah diterima
dari klien. `.env` tidak pernah masuk riwayat Git.

---

### ADR-013 — Penarikan diri dan penghapusan data diimplementasikan

**Status:** diputuskan · **Kelas:** etik + hukum

**Konteks.** `PersetujuanEtik.vue:36-38` menjanjikan *"Anda boleh berhenti kapan
saja"*. Tidak ada endpoint penghapusan untuk responden maupun admin. Komentar
di `responden/saya.get.ts:42` menyiratkan penghapusan dilakukan manual lewat
Prisma Studio. Dokumen persetujuan membuat komitmen yang tidak bisa dipenuhi
perangkat lunaknya. UU PDP 27/2022 memberi subjek data hak penghapusan dan hak
menarik persetujuan.

**Keputusan.** `DELETE /api/responden/saya` — kaskade sudah terkonfigurasi benar
di keempat relasi. Tambahkan `dicabutPada`, jalur purge sisi admin, dan periode
retensi terdokumentasi di lampiran etik.

---

### ADR-014 — Kelengkapan profil ditegakkan di server

**Status:** diputuskan · **Kelas:** kualitas data

**Konteks.** `middleware/responden.ts:23` hanya berjalan di klien. Responden
yang POST langsung ke `/api/cmdq` menghasilkan record dengan `usia`,
`jenisKelamin`, `imt`, `durasiKomputerJamPerHari` NULL tetapi
`statusCmdq = 'SELESAI'`. `susunRekomendasi` kemudian diam-diam kehilangan dua
dari enam aturannya, dan lembar ekspor mendapat baris berskor CMDQ dengan
demografi kosong — kasus yang sebagian tidak terpakai namun tetap dihitung ke n.

**Keputusan.** Guard `statusProfil === 'SELESAI'` di kedua POST kuesioner,
mengembalikan 409 dengan pesan yang dapat ditindaklanjuti.

**Terkait.** `/api/sus` juga tidak punya guard urutan — responden bisa menilai
usabilitas aplikasi yang belum digunakan, mencemari variabel terikat tesis di
sumbernya. Tambahkan guard `statusCmdq === 'SELESAI'`, dan nonaktifkan tab nav
sampai syarat terpenuhi.

---

### ADR-015 — Aksesibilitas yang sudah ada dipertahankan dan dilengkapi

**Status:** diputuskan · **Kelas:** aksesibilitas

**Konteks.** `PetaTubuh.vue:313-352` adalah bagian terbaik basis kode ini —
`role="button"`, `tabindex="0"`, `aria-label` berisi nama + status + skor,
`<title>`, dan `aria-live`. Responden tunanetra dapat **mengaudit sendiri** ke-28
jawabannya. Tiga celah merusaknya:

1. `UiPilihan.vue:54` menaruh radio asli di `sr-only` dan label bergayanya tidak
   punya aturan `focus-within` → **fokus papan tik tidak terlihat pada setiap
   pertanyaan CMDQ dan seluruh 10 item SUS**, ±40 kontrol. WCAG 2.4.7.
2. `UiKolom.vue:14` merender `<label :for="untuk">` sementara setiap pemakaian
   `UiPilihan` mengosongkan `untuk` → label yatim → empat grup radio **wajib**
   di `profil.vue:197, 337, 375, 396` tanpa nama aksesibel.
3. `PanelJawabanSegmen.vue:128-133` punya `role="dialog" aria-modal="true"` tanpa
   fokus awal, tanpa perangkap fokus, tanpa pemulihan fokus. Pengguna TalkBack
   harus menelusuri ulang ~28 perhentian setiap kali menutup panel.

**Keputusan.** Ketiganya diperbaiki. Nomor 1 adalah satu baris kelas Tailwind
yang memperbaiki ~40 kontrol.

**Terkait.** `ringkasan.vue:108-111` menyematkan `PetaTubuh` tanpa `@pilih`,
sehingga 28 tombol mati tetap dapat difokus. Tambah prop `interaktif` (bawaan
`true`) — sekaligus prasyarat ADR-016.

---

### ADR-016 — Body map 3D: ditunda; kontrak antarmuka dipasang sekarang

**Status:** diputuskan · **Kelas:** lingkup

**Keputusan: BANGUN SETELAH SIDANG.** Bulat dari UI/UX Designer dan 3D Engineer,
dari dua sudut berbeda.

**Alasan, berurut menurut bobot.**

1. **Ia membahayakan variabel yang diukur.** SVG menampilkan 28 segmen serentak
   tanpa interaksi apa pun. Model 3D tunggal menyembunyikan empat segmen
   berprevalensi tertinggi di balik gestur rotasi. Pelaporan-kurang di sana
   tidak dapat dibedakan dari temuan nyata, tidak dapat dikoreksi setelahnya,
   dan tidak dapat dideteksi di data.
2. **Ia membahayakan skor SUS, yang juga hasil penelitian.** Target sentuh ~15px
   (dan `Raycaster` **tidak punya `threshold` untuk mesh** — padding gaya SVG
   mustahil), kanvas yang memerangkap gulir karena OrbitControls menetapkan
   `touch-action: none`, muat 2–4 detik, dan jeda kompilasi shader pada ketukan
   pertama.
3. **SVG tidak bisa dipensiunkan.** `ringkasan.vue` mencetak ke PDF
   (`window.print()` baris 18); kanvas WebGL tidak andal di jalur cetak seluler.
   Ditambah fallback WebGL dan daftar kontrol aksesibel yang setara-SVG — ini
   bukan proyek penggantian, melainkan implementasi **kedua** dengan pemeliharaan
   ganda permanen.
4. **Upaya nyatanya 13–15 hari kerja (≈3 minggu kalender)**, bukan hanya
   pemodelan. Dan payload runtime three.js + TresJS + meshopt + model ≈ **320–360
   KB gzip**, bukan 130 KB yang saya tulis di `docs/model-3d.md`.

**Yang dikerjakan sekarang sebagai gantinya (~1 hari, tanpa 3D):** ADR-006 dan
ADR-008 menangkap sebagian besar keuntungan presisi dan keterpahaman yang
seharusnya diberikan 3D, dengan nol byte tambahan.

**Yang dipasang hari ini (~2 jam):** kontrak komponen agar halaman berhenti
mengimpor `PetaTubuh` langsung, sehingga versi 3D kelak menjadi pertukaran satu
baris, bukan risiko tesis:

```ts
// lib/cmdq/peta-tubuh.ts
export interface PropsPetaTubuh {
  skor: Record<string, number>
  aktif?: string | null
  bacaSaja?: boolean
  tampak?: 'DEPAN' | 'BELAKANG' | 'KEDUA'
}
export interface EmitsPetaTubuh {
  pilih: [kode: string]
  sorot: [kode: string | null]
  siap: [{ mesin: '2D' | '3D'; galat?: string }]
}
```

Aturan yang ditegakkan wadah: `kode` adalah satu-satunya mata uang dan wajib
lolos `adalahKodeSegmenValid()`; kedua implementasi murni presentasi; **daftar
kontrol aksesibel tinggal di wadah, bukan di renderer** — inilah yang membuat
pertukaran tidak menurunkan aksesibilitas, dan layak dibangun meski 3D tidak
pernah jadi.

---

### ADR-017 — `SegmenTubuh.aktif` dinetralkan

**Status:** diputuskan · **Kelas:** bug laten

**Konteks.** Dihormati hanya di `server/api/segmen.get.ts:18`, sementara
otoritas skoring adalah konstanta `SEGMEN_TUBUH` yang mewajibkan 28 segmen
(`skoring.ts:213-220`). Set `aktif = false` pada satu baris → form menampilkan
27 → **setiap** submit CMDQ mengembalikan 422 permanen untuk semua responden,
dan `SKOR_TOTAL_MAKS = 756` diam-diam tidak sahih. Yang mencegah ini saat ini
hanyalah `seed.ts:26` yang memaksa `aktif: true` di setiap reseed.

**Keputusan.** Hapus `where: { aktif: true }` dari `segmen.get.ts:18`, dan
koreksi komentar `schema.prisma:163-166` yang keliru mengklaim jumlah segmen
dapat diubah lewat seed.

**Alternatif yang ditolak.** *Membuat `aktif` benar-benar berfungsi* —
instrumen harus 28 segmen tetap; NBM yang sebagian aktif akan membatalkan
plafon skor dan setiap perbandingan regional.

---

### ADR-018 — Arsitektur tidak direstrukturisasi

**Status:** diputuskan · **Kelas:** menahan diri

Software Architect dan Backend Engineer sepakat, independen: **jangan ubah
struktur.** Keputusan arsitektural terpenting di basis kode ini —
logika domain murni bebas framework di `lib/`, diuji unit, dan **dijalankan
ulang di server sehingga skor klien tidak pernah dipercaya** — sudah benar dan
persis yang dibutuhkan penguji untuk memverifikasi instrumen.

**Ditolak secara eksplisit:**

| Usulan | Alasan penolakan |
|---|---|
| Pindahkan `lib/` ke `shared/` | Auto-import hanya berlaku untuk `shared/utils` dan `shared/types` tingkat atas; `lib/cmdq/` bersarang tetap butuh impor eksplisit. Merusak 5 berkas tes yang mengimpor relatif. Murni churn. |
| `app/utils/` | Regresi — hanya klien; route server tidak bisa mengimpor fungsi skoring. |
| `future.compatibilityVersion: 4` | Mengubah semantik dedupe `useFetch` — persis permukaan yang dipakai 6 call site. Risiko sepenuhnya di sisi bawah untuk aplikasi yang harus bertahan melewati sidang. |
| Lapisan service/repository | 16 endpoint, ~1.100 baris, dua jalur tulis. `RespondenRepository` yang membungkus `prisma.responden.findUnique` mencegah nol bug. Seam yang penting **sudah ada** dan di tempat yang benar: `lib/` (murni) vs `server/api/` (I/O), dan `server/utils/filter.ts` untuk definisi kohort bersama. |
| Deduplikasi 6 salinan ekstraksi pesan galat | 3–9 baris trivial per salinan; merefaktor 6 halaman yang berfungsi menjelang sidang membeli keanggunan dengan harga risiko regresi. |

**Satu pengecualian yang diterima:** label SUS di `ekspor.get.ts:33-37` **sudah
divergen** dari `lib/sus/skoring.ts:32-36` (`'Marginal'` vs `'Marginal (Batas
Dapat Diterima)'`), dan divergensi itu sudah mencapai data riset terekspor.
Hapus deklarasi lokal, impor dari `lib/`. Empat baris, nol risiko perilaku.

**Yang secara eksplisit dipertahankan** dan harus dibela dari refaktor:

- Kemurnian `lib/cmdq/skoring.ts`, `lib/sus/skoring.ts`, `lib/imt.ts` — nol
  dependensi I/O, komentar kepala terkait literatur.
- Perhitungan ulang seluruh skor di sisi server, mengabaikan nilai kiriman klien.
- `server/utils/filter.ts` sebagai definisi kohort tunggal — menjamin tabel,
  grafik, dan berkas Excel menggambarkan responden yang sama. Properti validitas
  riset, bukan sekadar DRY.
- Divergensi warna sengaja di `lib/viz.ts:6-18` (`SEDANG: '#ca8a04'`) — keputusan
  aksesibilitas terukur (ΔE 3,7 pada deuteranopia). Tampak seperti inkonsistensi
  dan bukan. **Jangan "disatukan"** saat mendeduplikasi warna risiko.
- Radio Ya/Tidak eksplisit alih-alih toggle di `profil.vue:16-21` — alasannya
  (toggle default-mati merekam pertanyaan tak terjawab sebagai "tidak") adalah
  argumen bias pengukuran yang benar. Layak satu kalimat di tesis.
- `Responden` tetap satu tabel. Pemecahan benar secara tekstual dan salah secara
  praktis pada skala ini.
- Semua kolom `Decimal` tetap `Decimal` — benar untuk antropometri, dan
  kompatibel-maju untuk bobot CMDQ 1,5 / 3,5 bila ADR-003 opsi A dipilih.
- Penamaan Indonesia menyeluruh.

---

### ADR-019 — Strategi pengujian: unit diperdalam, Playwright ditolak

**Status:** diputuskan

**Kondisi saat ini.** 84 tes lulus dalam 788 ms. QA Engineer memverifikasi dan
**membantah** tiga dugaan awal: reverse-scoring SUS benar dan dibuktikan lewat
dua jalur independen (bukan tautologi); batas IMT cocok persis dengan Depkes
2003; ambang tidak punya galat float (`27×(1/3)===9`, `756×(1/3)===252` eksak).

**Ditambahkan (≈60 baris, tanpa dependensi baru):**

1. Tiga kasus pembulatan-lalu-klasifikasi IMT yang belum dipatok:
   `evaluasiImt(43.52, 160)` → IMT sejati 16,99999 (KURUS_BERAT) tersimpan
   KURUS_RINGAN; `(47.35, 160)` di batas 18,5; `(69.13, 160)` di batas 27,0.
2. Kasus seri `segmenTertinggi` — `skoring.ts:270-273` memakai `>` sehingga
   maksimum **pertama** dalam urutan NBM menang, tetapi ini tak
   terdokumentasi dan tak teruji; mengubahnya ke `>=` dalam refaktor akan
   membalik setiap seri tanpa satu tes pun gagal. Seri kiri/kanan adalah kasus
   **lazim** di data ergonomi kantor.
3. Jendela SUS 67,5 / 70 / 72,5 yang menegaskan `interpretasi`, `gradeHuruf`,
   dan `memenuhiTarget` bersamaan — skor 70,0 menghasilkan MARGINAL + grade C +
   `memenuhiTarget = true` di layar yang sama.
4. Blok "integritas instrumen" yang memaku angka Bab III sebagai literal:
   `AMBANG_SEGMEN_SEDANG === 9`, `BOBOT_FREKUENSI` deep-equal `[0,1,2,3]`,
   `JUMLAH_SEGMEN === 28`. Asuransi murah agar tidak ada yang mengubah konstanta
   terpublikasi setelah pengambilan data.
5. Invarian geometri ADR-006: tidak ada dua area berpad yang berpotongan.

**Playwright ditolak.** Pengambilan data sekali dari ~50 responden, satu alur
form linier, satu pengembang, tanpa CI. Yang ditangkap Playwright (tombol mati,
rute rusak) bersifat nyaring dan tertangkap di uji coba. Yang benar-benar
mengancam tesis — angka yang masuk akal tetapi salah — ditangkap unit test.

**Sebagai gantinya:** uji coba manual terskrip, 3 responden melalui alur penuh,
dengan **skor CMDQ dan SUS dihitung tangan lebih dahulu** lalu dicocokkan ke
layar dan ke berkas ekspor. Ini sekaligus menjadi lampiran "uji coba instrumen"
yang dapat disitasi — sesuatu yang Playwright tidak berikan.

**Integrasi (2 saja, sebelum sidang, bila basis data sudah dapat di-seed):**
`GET /api/admin/ekspor` (ia **adalah** dataset tesis) dan `POST /api/cmdq`
(kirim ulang → 28 baris, bukan 56). **Jangan** mem-mock Prisma — tes integrasi
ber-mock untuk basis kode ini tidak menguji apa pun.

---

## 3. Koreksi terhadap `docs/model-3d.md`

3D Engineer mengoreksi dokumen yang saya tulis sebelumnya. Berikut yang salah,
dinyatakan apa adanya:

| Klaim saya | Koreksi |
|---|---|
| "meshopt ~5 KB JS; Draco ~200 KB" | meshopt ~25 KB mentah (~12–15 KB di kabel); Draco ~320 KB WASM + ~70 KB JS. Kesimpulan tetap benar, angkanya salah. **Dan opsi terbaik tidak saya pertimbangkan:** `quantize` + Brotli tanpa ekstensi kompresi sama sekali mendarat di pita 130–160 KB yang sama, dengan **nol** dekoder. |
| "Langkah 7: `Alt+S` menghasilkan celah 3 mm" | Salah. Shrink/Fatten menggerakkan verteks sepanjang normal; pada tabung terbuka, normal cincin batas mengarah **radial**, sehingga segmen menjadi tabung lebih tipis dengan panjang sama. Yang dihasilkan adalah undakan diameter, bukan celah aksial. Perlu penskalaan sepanjang sumbu lokal terhadap origin, atau inset ring sebelum pemisahan. |
| "10 material bersama mencegah kompilasi ulang shader" | Alasan saya keliru. three.js meng-cache program berdasarkan define/fitur, bukan nilai uniform — 31 klon yang hanya berbeda `color` berbagi satu program. Kompilasi terjadi saat **render pertama**, bukan saat konstruksi. Konsekuensi yang saya lewatkan: ketukan pertama yang mengubah segmen jadi TINGGI mengompilasi program saat itu juga → beku 50–300 ms tepat di momen interaksi pertama. Perlu `renderer.compile()` pasca-muat. Dan 5 dari 10 material adalah varian hover — beban mati di layar sentuh. |
| Pemisahan koronal | Saya tidak menyebutkan bahwa ia menghasilkan **cangkang terbuka tanpa tutup**. Dengan `side: FrontSide`, celah 3 mm sepanjang kedua sisi badan tembus pandang ke dalam kekosongan — dan §10.2 saya justru menyarankan kamera 3/4 yang mengarah tepat ke celah itu. Perlu Solidify atau cincin penutup. Tidak ada di alur kerja 12 langkah maupun daftar periksa saya. |
| Peringatan `optimize` dan `join` | Benar, tapi kurang. Saya melewatkan `flatten` (menghancurkan Empty `TubuhCMDQ` — seluruh mekanisme turntable saya) dan bahwa `--compress draco` adalah **bawaan** `optimize`, diam-diam memasukkan kembali dekoder yang saya habiskan satu subbab untuk menolaknya. |
| "`quantize` aman" | **Bahaya nyata.** `quantize` menulis skala dan translasi ke node untuk mengompensasi posisi integer. Setelah langkah itu, tidak ada mesh yang ber-`scale = (1,1,1)`. Maka efek hover `scale.setScalar(1.03)` akan **menimpa skala dekuantisasi** dan membuat segmen meledak/kolaps, dan janji saya bahwa `object.position` langsung berguna sebagai jangkar label menjadi salah. |
| Filter raycast `userData.terpilih === false` | Dua cacat. (a) Bila artinya *mengeluarkan* mesh dekoratif dari array kandidat, ketukan di dada menembus `x_torso_depan` dan mendarat di `PUNGGUNG` — kelas korupsi data yang sama dengan tertukarnya kiri/kanan. Aturan benar: raycast ke **semua** mesh, ambil `intersects[0]`, dan bila tidak terpilih, jangan pilih apa pun. (b) Boolean Blender di `extras` lazim terserialisasi sebagai `0`, bukan `false`, sehingga `=== false` bernilai salah untuk ke-31 mesh. |
| "A-pose 40° mencegah oklusi raycast" | Sebagian terbalik — abduksi **lebih besar** berarti tumpang tindih lengan/torso **lebih sedikit**. 40° dipilih *meskipun* oklusi, bukan karenanya. Kesimpulan tetap (bounding box potret yang menentukan), justifikasinya salah. |

**Yang dikonfirmasi benar:** rantai koordinat Blender→glTF diverifikasi ujung ke
ujung, termasuk konsistensinya dengan `bodymap.ts:186` di mana `BAHU_KIRI`
memang di kanan pusat. Nama mesh sebagai kontrak dinilai "ide terbaik dokumen
ini". Pembelahan torso benar menurut semantik NBM. Anggaran 10k triangle dan 31
draw call memang tidak relevan sebagai kendala.

`docs/model-3d.md` akan direvisi sebelum model dibangun, bukan sekarang —
ADR-016 menundanya.

---

## 4. Konflik antar-agent dan penyelesaiannya

| Konflik | Posisi | Penyelesaian |
|---|---|---|
| Penghitung "sisa segmen" | UX: **jangan** — tak-ditandai berarti tak ada keluhan; kuota mendorong 66 ketukan sia-sia dan bias akuiesensi. Frontend + 3D: **tambahkan** daftar/penghitung. | UX menang soal **penghitung**; Frontend menang soal **daftar**. Keduanya kompatibel: daftar adalah jalur masuk alternatif, bukan kuota penyelesaian. → ADR-006. |
| Deduplikasi kode | Architect: (b) jangan sebelum sidang. DB/Backend/Frontend: beberapa duplikasi nyata. | Hanya perbaiki yang **sudah divergen** atau menyentuh keluaran riset. Label SUS diperbaiki; enam salinan ekstraksi pesan galat tidak. → ADR-018. |
| Nilai model 3D | UX: regresi, jangan bangun. 3D: bangun setelah sidang. | Konvergen ke penundaan; 3D memberi estimasi upaya (13–15 hari) dan kontrak antarmuka yang membuat penundaan tidak berbiaya. → ADR-016. |
| Identitas instrumen | Methodology: opsi A. Semua agent lain: di luar kewenangan. | Diangkat ke pembimbing. Bukan keputusan tim teknis. → ADR-003. |

---

## 5. Urutan implementasi

Brief meminta urutan **struktur → database → backend → frontend → 3D → CMDQ →
SUS → dasbor → pengujian → refaktor**. Urutan itu menggambarkan proyek dari nol.
Aplikasi ini sudah berjalan dan diuji, sehingga membongkar fondasi lebih dulu
berarti merusak yang berfungsi demi mencapai yang rusak.

**Urutan diganti berdasarkan risiko.** Setiap tahap berdiri sendiri dan dapat
dihentikan tanpa meninggalkan sistem separuh jalan.

### P0 — Memblokir pengambilan data

| # | Aksi | ADR |
|---|---|---|
| 1 | Lepaskan pemicu rujukan K3 dari kategori risiko | ADR-002 |
| 2 | Kecualikan responden `DEMO-` dari filter, statistik, ekspor | ADR-004 |
| 3 | Perbaiki tumpang tindih hit box empat segmen punggung + uji invarian | ADR-006 |
| 4 | Persistensi localStorage + guard navigasi + perbaiki race hidrasi | ADR-005 |
| 5 | Netralkan `SegmenTubuh.aktif` | ADR-017 |

### P1 — Sebelum penyebaran publik

| # | Aksi | ADR |
|---|---|---|
| 6 | Hapus `Nama`/`Email` dari ekspor analisis | ADR-010 |
| 7 | Perbaiki CSV formula injection | ADR-012 |
| 8 | Perbaiki hash pembanding bcrypt (oracle timing) | ADR-012 |
| 9 | Rate limiting `/api/auth/*` + `session.maxAge` | ADR-012 |
| 10 | `DELETE /api/responden/saya` + `dicabutPada` | ADR-013 |

### P2 — Kualitas data & penyelesaian

| # | Aksi | ADR |
|---|---|---|
| 11 | Guard `statusProfil` dan `statusCmdq` di server | ADR-014 |
| 12 | Daftar teks 28 segmen + perbesar target sentuh | ADR-006 |
| 13 | Munculkan `petunjuk` di label peta | ADR-008 |
| 14 | Perbaiki legenda peta | ADR-007 |
| 15 | Satukan `TOTAL_TAHAP` | ADR-009 |
| 16 | Indikator fokus `UiPilihan` + nama aksesibel `UiKolom` + fokus modal | ADR-015 |

### P3 — Reproducibility & instrumen

| # | Aksi | ADR |
|---|---|---|
| 17 | Kolom provenans ambang di ekspor + Kamus Data ber-template | ADR-011 |
| 18 | Satukan label SUS | ADR-018 |
| 19 | Tes IMT, seri `segmenTertinggi`, jendela SUS, integritas instrumen | ADR-019 |
| 20 | Kontrak `PetaTubuhWadah` | ADR-016 |
| 21 | **Ambang risiko** — setelah keputusan pembimbing | ADR-001 |
| 22 | **Identitas instrumen** — setelah keputusan pembimbing | ADR-003 |

### Ditunda

Model 3D (ADR-016). Refaktor arsitektural (ADR-018). Endpoint draf server.
Streaming ekspor. Playwright.

---

## 5a. Status implementasi (2026-08-05)

Build lulus, 103 unit test lulus (sebelumnya 84).

### Sudah dikerjakan

| ADR | Berkas utama |
|---|---|
| 002 rujukan K3 dilepas dari kategori risiko | `lib/rekomendasi.ts` (`perluRujukan()`), `lib/cmdq/skala.ts`, `server/api/ringkasan.get.ts` |
| 004 data `DEMO-` dikecualikan | `server/utils/filter.ts` |
| 005 persistensi + guard navigasi + race hidrasi | `composables/useDrafJawaban.ts`, `pages/kuesioner.vue`, `pages/sus/index.vue` |
| 006 hit box + daftar segmen | `lib/cmdq/bodymap.ts` (`AREA_SENTUH`), `components/PetaTubuh.vue`, `pages/kuesioner.vue` |
| 007 legenda | `components/PetaTubuh.vue` |
| 008 petunjuk bokong/pantat di label peta | `components/PetaTubuh.vue` |
| 009 satu konstanta tahap | `lib/alur.ts` + 7 halaman |
| 010 identitas keluar dari ekspor bawaan | `server/api/admin/ekspor.get.ts`, `pages/admin/index.vue` |
| 011 provenans ambang + Kamus Data ber-template | `server/api/admin/ekspor.get.ts` |
| 012 hash pembanding, rate limit, sesi 8 jam, CSV injection | `server/utils/sandi.ts`, `server/utils/pembatas.ts`, `nuxt.config.ts`, `server/api/auth/*` |
| 013 penghapusan data | `server/api/responden/saya.delete.ts`, `pages/beranda.vue` |
| 014 guard urutan server-side | `server/utils/sesi.ts` (`wajibTahapSelesai`), kedua POST kuesioner |
| 015 fokus `UiPilihan`, nama grup radio, fokus modal | `components/UiPilihan.vue`, `UiKolom.vue`, `PanelJawabanSegmen.vue`, `types/ui.ts` |
| 017 `SegmenTubuh.aktif` dinetralkan | `server/api/segmen.get.ts`, `prisma/schema.prisma` |
| 018 label SUS disatukan | `server/api/admin/ekspor.get.ts` |
| 019 uji korektnes | `tests/bodymap.test.ts`, `imt.test.ts`, `skoring-cmdq.test.ts`, `skoring-sus.test.ts` |

Ikut diperbaiki di luar daftar ADR: galat-vs-kosong di tiga halaman hasil
(`lib/galat.ts`), urutan kedua `areaPrioritas` agar reproducible, batas waktu
transaksi Prisma untuk TiDB, `Math.trunc` pada paginasi dasbor, penanda item
SUS bernada negatif, panjang minimum `ADMIN_PASSWORD`, dan pemindahan tombol
hapus jawaban menjauh dari tombol simpan.

### Belum dikerjakan, dan alasannya

| Butir | Alasan |
|---|---|
| **ADR-001 ambang risiko** | Menunggu keputusan pembimbing. Perbaikan keselamatannya (ADR-002) sudah berdiri sendiri. |
| **ADR-003 identitas instrumen** | Menunggu keputusan pembimbing. |
| **ADR-016 wadah `PetaTubuhWadah`** | Baru sebagian: prop `interaktif` sudah ada dan daftar 28 segmen sudah tersedia di halaman kuesioner, tetapi belum diangkat menjadi wadah bersama dengan daftar `sr-only`. Diselesaikan bersama pekerjaan 3D. |
| Kolom `dicabutPada` | Sengaja dilewati: butuh migrasi yang tidak dapat diverifikasi tanpa akses basis data langsung, dan menyimpan catatan tentang orang yang datanya baru dihapus justru bertentangan dengan penghapusan itu. |
| Uji integrasi endpoint | Butuh basis data khusus uji. Sebagai gantinya lakukan uji coba manual terskrip (ADR-019). |
| Header keamanan respons (CSP dsb.) | Prioritas rendah; tidak ada `v-html` maupun sink XSS di aplikasi. |
| Deduplikasi warna risiko & pesan galat | Ditolak sengaja — ADR-018. |

---

## 6. Yang harus dinyatakan Bab III / Bab IV

1. Identitas instrumen sebenarnya, dan — bila ADR-003 opsi A tidak diambil —
   **perubahan judul**, karena "Menggunakan CMDQ" tidak dapat berdiri di atas
   instrumen 28 regio dengan 4 opsi frekuensi.
2. Bahwa skor **tidak sebanding** dengan studi CMDQ terpublikasi (0–27/regio di
   sini vs 0–90), dan validitas konstruk tidak diwarisi dari Hedge.
3. Versi CMDQ yang dirujuk (duduk vs berdiri; formulir pria/wanita) dan periode
   ingatan — catat bahwa CMDQ menyebut *minggu kerja* terakhir, sedangkan
   `PanelJawabanSegmen.vue:168` menulis "7 hari terakhir".
4. Provenans setiap cut-off sebagai konstruksi peneliti sendiri, termasuk
   **ketidakterjangkauan SEDANG dan TINGGI yang telah didemonstrasikan**, dan
   skema pengganti yang benar-benar dipakai di Bab IV.
5. Variabel hasil utama yang dipilih, dan justifikasi meninggalkan kategori tiga
   tingkat.
6. Konsekuensi statistik komposit ordinal perkalian → komitmen pada uji
   non-parametrik (Mann-Whitney, Spearman, Kruskal-Wallis).
7. Sitasi terjemahan SUS: **Sharfina & Santoso (2016), ICACSIS** — terjemahan
   tervalidasi, dan penggantian kata "sistem" menjadi "aplikasi".
8. Kerangka interpretasi SUS: Bangor dkk. (2009) dengan konvensi `>70` pada
   tepat 70,0; kurva grade A–F yang sebenarnya **Sauro (2011)**, bukan Sauro &
   Lewis (2016) sebagaimana tertulis di `schema.prisma:291`; target ≥68; dan
   catatan bahwa akseptabilitas dan adjective rating berbeda secara konstruksi.
9. Tabel rujukan IMT Depkes 2003, batas inklusif di 25,0 dan 27,0, justifikasi
   memilihnya alih-alih cut-off WHO Asia-Pasifik, dan aturan klasifikasi atas
   nilai yang **sudah dibulatkan**.
10. Etik: mekanisme penarikan diri **sebagaimana benar-benar diimplementasikan**,
    penanganan `Nama`/`Email` dan pemisahannya dari dataset analisis, serta
    pernyataan eksplisit bahwa aplikasi **memberikan saran ergonomi
    terindividualisasi** — siapa yang menelaah isinya, dan disclaimer yang
    ditampilkan kepada responden.
11. Bahwa `middleware/` sisi klien **bukan** kontrol keamanan; penegakan ada di
    `wajibAdmin`/`wajibResponden` sisi server.
