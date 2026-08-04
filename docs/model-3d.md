# Rancangan Model Tubuh 3D untuk Peta Tubuh CMDQ

Dokumen desain aset 3D — **bukan** dokumentasi kode aplikasi. Sasarannya: satu
berkas `.glb` yang begitu dimuat `GLTFLoader` langsung siap dipakai raycaster
tanpa tabel pemetaan tambahan di sisi JavaScript.

Status: rancangan (belum diproduksi).

---

## 0. Temuan yang mendasari rancangan ini

Sebelum menentukan apa pun, tiga fakta dari kode yang sudah ada menentukan
bentuk model:

1. **Aplikasi memakai 28 segmen Nordic Body Map, bukan 20 segmen CMDQ baku.**
   Sumber kebenarannya `lib/cmdq/segmen.ts`. Daftar nama mesh generik di brief
   (`upper_back`, `lower_back`, `pelvis`, `left_hip`) tidak punya padanan di
   sana, sedangkan `BOKONG`, `PANTAT`, `SIKU_*`, `TANGAN_*` justru wajib ada.
   Model harus mengikuti `segmen.ts`, bukan sebaliknya.

2. **Empat segmen hanya hidup di sisi punggung.** `lib/cmdq/bodymap.ts`
   memisahkan tampak DEPAN (leher, bahu, lengan, tangan, tungkai) dan tampak
   BELAKANG (`PUNGGUNG`, `PINGGANG`, `BOKONG`, `PANTAT`). Artinya torso tidak
   boleh jadi selongsong utuh yang bisa diklik dari depan — bagian dada/perut
   secara sengaja **tidak punya segmen**, dan menjadikannya klikable akan
   memasukkan jawaban ke segmen yang salah.

3. **Palet aplikasi hijau sage/forest, bukan putih–biru muda.** Token di
   `assets/css/main.css`: primer `#1c4c3b`, sage `#9dc0ac`, aksen `#f4623a`,
   sorot `#cdf05a`. Brief meminta putih/abu/biru muda; itu akan bentrok dengan
   halaman di sekitarnya. Rekomendasi di §6 memakai palet aplikasi. Kalau tetap
   ingin biru muda, cukup ganti konstanta warna — geometri tidak terpengaruh.

> **Catatan konsekuensi UX (§10).** Peta SVG sekarang menampilkan dua figur
> berdampingan sehingga 28 segmen terlihat sekaligus. Model 3D tunggal hanya
> memperlihatkan separuh. Ini risiko nyata, bukan detail kosmetik — solusinya
> ada di §10, dan harus ikut dirancang bersama modelnya.

---

## 1. Struktur terbaik model 3D

### 1.1 Prinsip

| Prinsip | Alasan |
|---|---|
| **Satu segmen = satu mesh = satu node glTF** | Raycaster mengembalikan `intersect.object`; kalau namanya sudah kode segmen, tidak perlu tabel lookup sama sekali. |
| **Nama mesh = `kode` segmen persis** | `SEGMEN_TUBUH[].kode` jadi kontrak antara Blender ↔ database ↔ raycaster. Satu sumber kebenaran, bukan tiga. |
| **Mesh non-segmen diberi awalan `x_`** | Filter raycast jadi satu baris: apa pun yang diawali `x_` diabaikan. |
| **Torso dibelah depan/belakang, bukan cincin utuh** | Menjaga semantik NBM: dada/perut memang bukan segmen. |
| **Dimodelkan utuh dulu, baru dipisah** | Menjamin batas antar-segmen berbagi tepi yang sama → siluet mulus, tanpa celah tak sengaja. |
| **Tanpa armature, tanpa animasi, tanpa skinning** | Pose statis. Skinning menambah atribut `JOINTS`/`WEIGHTS` (~30% ukuran berkas) tanpa manfaat. |

### 1.2 Hierarki node

Hierarki sengaja **rata (flat)**. Tidak ada parent-child anatomis, karena tidak
ada animasi yang perlu mewarisi transformasi, dan hierarki datar membuat
`scene.getObjectByName()` serta traversal raycast lebih murah dan tidak
ambigu.

```
Scene
└── TubuhCMDQ                (Empty — satu-satunya pegangan untuk rotasi turntable)
    ├── LEHER_ATAS           ┐
    ├── LEHER_BAWAH          │
    ├── BAHU_KIRI            │  28 mesh terpilih
    ├── ...                  │  (nama = kode segmen, HURUF BESAR)
    └── KAKI_KANAN           ┘
    ├── x_kepala             ┐
    ├── x_torso_depan        │  3 mesh dekoratif (tidak terpilih)
    └── x_panggul_depan      ┘
```

Rotasi "lihat punggung" cukup menganimasikan `TubuhCMDQ.rotation.y`. Tanpa
Empty ini, aplikasi harus memutar kamera mengelilingi model — lebih rumit dan
merusak posisi pencahayaan relatif.

### 1.3 Pembagian torso

Ini bagian yang paling mudah salah, jadi eksplisit:

```
        TAMPAK DEPAN                    TAMPAK BELAKANG
    ┌───────────────────┐          ┌───────────────────┐
    │    x_kepala       │          │    x_kepala       │
    │   LEHER_ATAS      │          │   LEHER_ATAS      │   ← cincin penuh,
    │   LEHER_BAWAH     │          │   LEHER_BAWAH     │     terlihat 2 sisi
    ├───────────────────┤          ├───────────────────┤
    │                   │          │     PUNGGUNG      │
    │   x_torso_depan   │          ├───────────────────┤
    │   (tidak diklik)  │          │     PINGGANG      │
    ├───────────────────┤          ├───────────────────┤
    │ x_panggul_depan   │          │      BOKONG       │
    │  (tidak diklik)   │          ├───────────────────┤
    │                   │          │      PANTAT       │
    └───────────────────┘          └───────────────────┘
```

- Bidang pisah = bidang koronal (bidang X–Z pada Blender, kira-kira di tengah
  ketebalan badan), mengikuti garis siluet dari ketiak ke sisi pinggul.
- `BAHU_KIRI/KANAN` **tetap cincin penuh** (tutup deltoid) — di NBM bahu memang
  satu segmen, terlihat dan wajar diklik dari depan maupun belakang.
- `LEHER_ATAS` / `LEHER_BAWAH` juga cincin penuh, dua silinder bertumpuk.
- Semua segmen anggota gerak (lengan, tungkai, tangan, kaki) adalah selongsong
  penuh — tidak dibelah.

---

## 2. Jumlah mesh ideal

**31 mesh.** Itu angka minimum yang benar, dan menaikkannya tidak memberi
manfaat.

| Kelompok | Jumlah |
|---|---|
| Segmen terpilih (= `JUMLAH_SEGMEN`) | 28 |
| Dekoratif non-terpilih | 3 |
| **Total** | **31** |

Kenapa tidak lebih:

- 31 mesh = 31 draw call. Pada model tanpa tekstur dan tanpa bayangan, ini
  tidak terasa bahkan di HP kelas bawah. Tapi menambah mesh dekoratif (rambut,
  jari, kelopak mata) menaikkan draw call tanpa menambah informasi.
- **Jumlah triangle bukan batas nyata di sini — jumlah draw call dan jumlah
  material yang menentukan.** Karena itu §6 memakai material *bersama* (shared),
  bukan satu material per mesh.

Kenapa tidak kurang: menggabungkan mis. `SIKU_KIRI` ke `LENGAN_ATAS_KIRI`
memaksa pemisahan ulang di runtime (sub-mesh + `groups`), yang justru lebih
mahal dan rapuh daripada memisahkannya sejak di Blender.

---

## 3. Daftar nama mesh

`urutan` dan `kode` disalin persis dari `lib/cmdq/segmen.ts`. Kolom "Tampak"
menandai dari arah mana mesh terlihat dan bisa diklik.

### 3.1 Mesh terpilih (28)

| # | Nama mesh (= `kode`) | Nama Indonesia | Bentuk dasar | Tampak | ~Tris |
|---|---|---|---|---|---|
| 0 | `LEHER_ATAS` | Leher bagian atas | silinder pendek, cincin penuh | Depan + Belakang | 220 |
| 1 | `LEHER_BAWAH` | Leher bagian bawah | silinder melebar ke trapezius | Depan + Belakang | 260 |
| 2 | `BAHU_KIRI` | Bahu kiri | tutup deltoid (kubah) | Depan + Belakang | 320 |
| 3 | `BAHU_KANAN` | Bahu kanan | tutup deltoid (kubah) | Depan + Belakang | 320 |
| 4 | `LENGAN_ATAS_KIRI` | Lengan atas kiri | silinder mengerucut | Depan + Belakang | 240 |
| 5 | `PUNGGUNG` | Punggung | cangkang belakang, bahu→pinggang | **Belakang** | 480 |
| 6 | `LENGAN_ATAS_KANAN` | Lengan atas kanan | silinder mengerucut | Depan + Belakang | 240 |
| 7 | `PINGGANG` | Pinggang | pita cangkang belakang | **Belakang** | 300 |
| 8 | `BOKONG` | Bokong | pita cangkang, atas gluteus | **Belakang** | 320 |
| 9 | `PANTAT` | Pantat | pita cangkang, bawah gluteus | **Belakang** | 300 |
| 10 | `SIKU_KIRI` | Siku kiri | cincin sendi | Depan + Belakang | 200 |
| 11 | `SIKU_KANAN` | Siku kanan | cincin sendi | Depan + Belakang | 200 |
| 12 | `LENGAN_BAWAH_KIRI` | Lengan bawah kiri | silinder mengerucut | Depan + Belakang | 240 |
| 13 | `LENGAN_BAWAH_KANAN` | Lengan bawah kanan | silinder mengerucut | Depan + Belakang | 240 |
| 14 | `PERGELANGAN_TANGAN_KIRI` | Pergelangan tangan kiri | cincin pendek | Depan + Belakang | 160 |
| 15 | `PERGELANGAN_TANGAN_KANAN` | Pergelangan tangan kanan | cincin pendek | Depan + Belakang | 160 |
| 16 | `TANGAN_KIRI` | Tangan kiri | bentuk sarung tinju (tanpa jari) | Depan + Belakang | 380 |
| 17 | `TANGAN_KANAN` | Tangan kanan | bentuk sarung tinju (tanpa jari) | Depan + Belakang | 380 |
| 18 | `PAHA_KIRI` | Paha kiri | silinder mengerucut | Depan + Belakang | 320 |
| 19 | `PAHA_KANAN` | Paha kanan | silinder mengerucut | Depan + Belakang | 320 |
| 20 | `LUTUT_KIRI` | Lutut kiri | cincin sendi | Depan + Belakang | 240 |
| 21 | `LUTUT_KANAN` | Lutut kanan | cincin sendi | Depan + Belakang | 240 |
| 22 | `BETIS_KIRI` | Betis kiri | silinder mengerucut | Depan + Belakang | 300 |
| 23 | `BETIS_KANAN` | Betis kanan | silinder mengerucut | Depan + Belakang | 300 |
| 24 | `PERGELANGAN_KAKI_KIRI` | Pergelangan kaki kiri | cincin pendek | Depan + Belakang | 160 |
| 25 | `PERGELANGAN_KAKI_KANAN` | Pergelangan kaki kanan | cincin pendek | Depan + Belakang | 160 |
| 26 | `KAKI_KIRI` | Kaki kiri | telapak sederhana (tanpa jari) | Depan + Belakang | 400 |
| 27 | `KAKI_KANAN` | Kaki kanan | telapak sederhana (tanpa jari) | Depan + Belakang | 400 |

### 3.2 Mesh dekoratif (3)

| Nama mesh | Peran | ~Tris |
|---|---|---|
| `x_kepala` | Kepala tanpa wajah, gaya manekin penjahit. Memberi skala & orientasi. **Tidak diklik** — NBM tidak punya segmen kepala. | 900 |
| `x_torso_depan` | Cangkang dada + perut. Menutup rongga agar badan terlihat padat. **Tidak diklik.** | 850 |
| `x_panggul_depan` | Cangkang panggul depan + selangkangan. **Tidak diklik.** | 420 |

**Total ≈ 9.970 triangle.**

Ini di **bawah** target 15.000–30.000 di brief, dan itu disengaja. Untuk
manekin tanpa wajah, tanpa jari, dan tanpa tekstur, 30k triangle hanya
membuang bandwidth dan waktu parsing — tidak ada detail yang menyerapnya.
Anggarkan 15k sebagai *plafon*; kalau angka akhir menyentuh 20k, kemungkinan
besar ada loop cut yang tidak dipakai.

**Kenapa kepala dan torso depan tetap dimodelkan meski tidak bisa diklik:**
tanpa keduanya, model tampak seperti tubuh terpotong — persis "menyeramkan"
yang brief minta dihindari. Keduanya juga jadi pemandu orientasi saat model
diputar.

### 3.3 Kenapa `HURUF_BESAR` dan bukan `snake_case` Inggris

Brief meminta `left_shoulder`. Rekomendasi saya `BAHU_KIRI`, karena:

```
// dengan kode segmen sebagai nama mesh — nol tabel pemetaan
const kode = hit.object.name
if (adalahKodeSegmenValid(kode)) pilihSegmen(kode)   // fungsi ini sudah ada

// dengan snake_case Inggris — butuh tabel 28 baris yang harus dijaga sinkron
const kode = PETA_MESH_KE_KODE[hit.object.name]      // sumber bug baru
```

`adalahKodeSegmenValid()` dan `cariSegmen()` di `lib/cmdq/segmen.ts` langsung
bisa dipakai. Tabel pemetaan terpisah akan jadi tempat bug ketiga saat daftar
segmen berubah (dan komentar di `segmen.ts` sudah mengantisipasi perubahan ke
20 segmen CMDQ baku). Keputusan akhir tetap di Anda — kalau memilih
`snake_case`, letakkan tabel pemetaannya di `lib/cmdq/` dan uji
kelengkapannya dengan Vitest.

### 3.4 Properti kustom (`extras` → `userData`)

Blender mengekspor Custom Properties objek ke `node.extras` glTF, dan
`GLTFLoader` menaruhnya di `object3d.userData`. Manfaatkan ini agar aplikasi
tidak perlu impor apa pun untuk tahu sifat sebuah mesh:

| Kunci | Tipe | Nilai | Dipasang di |
|---|---|---|---|
| `kode` | string | `BAHU_KIRI` | 28 mesh segmen |
| `terpilih` | bool | `true` / `false` | semua 31 mesh |
| `tampak` | string | `DEPAN` \| `BELAKANG` \| `KEDUA` | 28 mesh segmen |
| `regio` | string | `BAHU`, `LEHER`, … | 28 mesh segmen |

`tampak` khususnya berguna untuk §10: aplikasi bisa memutar model otomatis ke
sisi yang benar saat pengguna memilih segmen dari daftar teks.

---

## 4. Struktur folder aset

```
ErgoSelf/
├── public/
│   └── model/
│       ├── tubuh-cmdq.glb            ← produksi; dimuat via /model/tubuh-cmdq.glb
│       ├── tubuh-cmdq.gltf           ← cadangan, tanpa kompresi (bisa dibaca teks)
│       └── tubuh-cmdq.bin            ← pasangan .gltf
│
├── assets/
│   └── blender/                      ← sumber; TIDAK ikut ke bundel produksi
│       ├── tubuh-cmdq.blend
│       ├── tubuh-cmdq.raw.glb        ← hasil ekspor mentah, sebelum optimasi
│       └── referensi/
│           ├── proporsi-8-kepala.png
│           └── acuan-segmen-nbm.png
│
├── scripts/
│   └── optimasi-model.mjs            ← pipeline glTF-Transform (§7)
│
├── tests/
│   └── model-3d.test.ts              ← uji integritas aset (§9.3)
│
└── docs/
    └── model-3d.md                   ← dokumen ini
```

Catatan:

- **`public/model/` bukan `assets/`** untuk berkas produksi. Aset di `assets/`
  masuk pipeline Vite dan namanya di-hash; `.glb` yang dimuat runtime lebih
  baik disajikan statis dengan URL stabil dan `Cache-Control` panjang.
- **`.blend` sebaiknya jangan masuk Git biasa.** Berkas biner puluhan MB akan
  menggemukkan riwayat repo permanen. Pakai Git LFS, atau simpan di drive
  bersama dan taruh tautannya di `docs/model-3d.md`.
- **Cache-busting:** kalau model direvisi setelah rilis, ganti nama berkas
  (`tubuh-cmdq-v2.glb`), jangan andalkan header cache.

---

## 5. Alur pembuatan di Blender

Blender 4.2 LTS atau lebih baru (eksportir glTF-nya paling stabil).

### Langkah 1 — Siapkan scene

- Satuan: Metric, Unit Scale `1.0`, Length `Meters`.
- Tinggi target **1,70 m**. Telapak kaki menyentuh `Z = 0`.
- Model **menghadap −Y** (tampak depan = Numpad 1).
- Bidang tengah tubuh di `X = 0`; **sisi KIRI anatomis responden ada di +X.**

> Kenapa +X: setelah konversi Z-up→Y-up saat ekspor, Blender `(0,−1,0)` menjadi
> glTF `(0,0,+1)`. Kamera di `+Z` melihat wajah model, dan `+X` muncul di
> **kanan layar** — persis seperti melihat orang berhadapan. `BAHU_KIRI` di
> `+X` otomatis benar. Salah tanda di sini berarti seluruh 12 pasang segmen
> kiri–kanan tertukar, dan datanya baru ketahuan salah setelah analisis.

### Langkah 2 — Basis proporsi

Dua jalur; pilih satu.

| Jalur | Cara | Cocok bila |
|---|---|---|
| **A — Basis manusia (disarankan)** | MakeHuman (keluaran CC0) atau add-on Human Generator → ekspor mesh netral, androgin, tanpa pakaian. Jadikan **acuan saja**, bukan mesh akhir. | Proporsi harus meyakinkan bagi orang awam. Menghemat berkali-kali lipat waktu. |
| **B — Dari primitif** | Bangun dari silinder/kubus di atas gambar acuan proporsi 8-kepala. | Anda nyaman memahat dan ingin kontrol topologi penuh sejak awal. |

Pada jalur A, **jangan pakai mesh MakeHuman langsung** — kepadatannya puluhan
ribu vertex dengan topologi wajah/jari yang tidak diperlukan. Buat selongsong
low-poly baru di atasnya dengan modifier **Shrinkwrap** (mode `Nearest Surface
Point`), lalu Apply. Hasilnya proporsi akurat dengan topologi Anda sendiri.

### Langkah 3 — Pose A-Pose

- Lengan **abduksi ±40°** dari tubuh. Bukan T-Pose.
  - T-Pose membuat bounding box sangat lebar; di HP potret, model harus
    diperkecil sampai kaki jadi sasaran sentuh yang terlalu kecil.
  - 40° sudah cukup memisahkan lengan dari torso sehingga sinar raycast tidak
    menembus lengan lalu mengenai `PUNGGUNG` di belakangnya.
- Telapak tangan menghadap paha, ibu jari ke depan.
- Kaki dibuka ±15°, telapak rata di lantai.
- Kepala tegak, pandangan lurus.

Pose dibuat **sebelum** pemisahan mesh, saat masih satu objek utuh.

### Langkah 4 — Sederhanakan bentuk

- **Tanpa jari tangan.** Bentuk sarung tinju bulat. `TANGAN_KIRI` adalah satu
  segmen; jari hanya menambah triangle dan memberi kesan "karakter game".
- **Tanpa jari kaki.** Telapak membulat.
- **Tanpa wajah.** Kepala telur halus, sedikit rata di belakang. Tanpa mata,
  hidung, mulut, telinga, rambut. Ini yang membuat model terbaca sebagai
  *manekin medis*, bukan manusia — dan mencegah kesan menyeramkan (uncanny
  valley berasal dari wajah yang *hampir* benar, bukan dari ketiadaan wajah).
- Otot didefinisikan sebagai perubahan siluet halus, bukan tonjolan.

### Langkah 5 — Bersihkan topologi (saat masih satu objek)

Urutan ini penting; setelah dipisah jauh lebih repot.

```
Edit Mode → A (pilih semua)
  M → Merge by Distance (jarak 0.0001)   ← buang vertex ganda
  Mesh → Normals → Recalculate Outside   (Shift+N)
  Select → All by Trait → Loose Geometry → X → Vertices   ← buang vertex yatim
Object Mode
  Object → Apply → All Transforms        (Ctrl+A) ← skala jadi 1, rotasi jadi 0
```

Pastikan **tidak ada skala negatif** di mana pun. Kalau sisi kiri dibuat dengan
Mirror modifier, Apply modifier itu lalu hitung ulang normal. Skala negatif
membalik urutan winding di glTF dan membuat wajah tampak berlubang di Three.js.

Target kepadatan: 12–16 segmen radial untuk anggota gerak, 20–24 untuk torso.

### Langkah 6 — Tanam sekat batas segmen

Sebelum memisah, buat **loop cut** tepat di setiap garis batas antar-segmen
(Ctrl+R). Loop inilah yang jadi tepi potong. Pastikan setiap loop:

- melingkar penuh dan tertutup,
- tegak lurus sumbu anggota gerak,
- berada di lokasi anatomis yang benar (mis. batas `SIKU` ↔ `LENGAN_BAWAH` di
  bawah epikondilus, bukan di tengah lengan bawah).

Untuk torso, loop koronal (depan/belakang) mengikuti garis siluet dari ketiak
turun ke sisi pinggul.

### Langkah 7 — Pilih gaya sambungan

Dua pilihan; ini keputusan desain, bukan sekadar teknis.

| Gaya | Cara | Konsekuensi |
|---|---|---|
| **Celah rambut (disarankan)** | Setelah dipisah, `Alt+S` (Shrink/Fatten) tiap mesh sebesar **−1,5 mm**, menghasilkan celah ±3 mm antar-segmen. | Batas segmen terlihat jelas → pengguna langsung paham apa yang bisa diklik. Masalah bayangan di jahitan hilang sepenuhnya. Terbaca sebagai desain manekin yang disengaja. |
| **Mulus** | Biarkan menyambung, lalu Data Transfer modifier (`Custom Normals`) dari salinan mesh utuh ke tiap potongan. | Terlihat seperti satu tubuh utuh, tapi butuh normal kustom (menambah data vertex) dan sangat mudah rusak saat direvisi. |

Saya sarankan **celah rambut**. Ia mengubah kendala teknis jadi kejelasan
antarmuka: pengguna melihat 28 kepingan berbeda dan tidak perlu menebak
di mana batasnya.

### Langkah 8 — Pisahkan menjadi 31 objek

Per segmen, di Edit Mode: pilih pulau muka segmen tersebut → `P` → **Separate
by Selection**. Ulangi 30 kali; sisa terakhir jadi objek ke-31.

Lalu untuk **setiap** objek:

```
Object → Set Origin → Origin to Center of Mass (Volume)
```

Ini menaruh pivot di pusat volume segmen. Wajib, karena:
- efek hover `mesh.scale.setScalar(1.03)` membesar dari pusat segmen, bukan
  dari kaki model;
- `object.position` langsung berguna sebagai jangkar label/tooltip 3D;
- rotasi turntable per segmen (kalau nanti dipakai) berperilaku wajar.

### Langkah 9 — Beri nama & properti kustom

- Ganti nama tiap **objek** persis sesuai §3. Objek, bukan data mesh — eksportir
  glTF memakai nama objek untuk nama node.
- **Buang semua sufiks `.001`, `.002`.** Ini penyebab kegagalan paling umum:
  `BAHU_KIRI.001` tidak akan pernah cocok dengan kode segmen mana pun, dan
  gagalnya senyap.
- Object Properties → Custom Properties → tambahkan `kode`, `terpilih`,
  `tampak`, `regio` sesuai §3.4.

Untuk 31 objek, lakukan lewat Scripting tab agar tidak ada salah ketik:

```python
# Blender Scripting — beri properti kustom dari nama objek
import bpy
BELAKANG = {"PUNGGUNG", "PINGGANG", "BOKONG", "PANTAT"}
REGIO = {  # ringkas; salin lengkap dari lib/cmdq/segmen.ts
    "LEHER_ATAS": "LEHER", "LEHER_BAWAH": "LEHER",
    "BAHU_KIRI": "BAHU", "BAHU_KANAN": "BAHU",
    # ...
}
for o in bpy.data.objects:
    if o.type != "MESH":
        continue
    if o.name.startswith("x_"):
        o["terpilih"] = False
        continue
    o["terpilih"] = True
    o["kode"] = o.name
    o["tampak"] = "BELAKANG" if o.name in BELAKANG else "KEDUA"
    o["regio"] = REGIO.get(o.name, "")
```

### Langkah 10 — Parent ke Empty

Buat Empty (Plain Axes) di `(0, 0, 0)`, beri nama `TubuhCMDQ`. Pilih semua 31
mesh, lalu Empty terakhir, `Ctrl+P` → **Object (Keep Transform)**.

### Langkah 11 — Material

Satu material bernama `mat_tubuh` untuk **semua** 31 objek (§6). Principled
BSDF, Base Color abu-hijau muda, Roughness `0.55`, Metallic `0.0`.

### Langkah 12 — UV

Unwrap sederhana (Smart UV Project, angle limit 66°, island margin 0.02).
Simpan di `.blend`. Untuk v1 UV **tidak diekspor** — tanpa tekstur, UV hanya
menambah ~25% data vertex tanpa guna. Layout-nya dipertahankan supaya baking
AO di kemudian hari tidak perlu unwrap ulang.

---

## 6. Material & warna

### 6.1 Strategi: material bersama, bukan per-mesh

Ini keputusan performa terpenting setelah jumlah mesh.

- **Di dalam `.glb`: tepat satu material** (`mat_tubuh`). Menjaga berkas kecil
  dan waktu parsing rendah.
- **Di runtime: 10 instance material bersama**, dipakai ulang lewat referensi:

  ```
  5 status × 2 varian (normal, hover) = 10 material
  ```

  Bukan 31 material hasil `material.clone()` per mesh. Mengganti warna berarti
  menukar *referensi* (`mesh.material = MAT[status][hover]`) — nyaris gratis,
  dan tidak memicu kompilasi ulang shader karena kesepuluhnya sudah ada sejak
  awal.

Lima status mengikuti `GAYA` di `components/PetaTubuh.vue`: `BELUM`,
`TIDAK_ADA`, `RENDAH`, `SEDANG`, `TINGGI`.

### 6.2 Palet

Diselaraskan dengan `assets/css/main.css` supaya kanvas 3D menyatu dengan
halaman. Warna keluhan sengaja dibiarkan sama persis dengan peta SVG agar
legenda yang sudah ada tetap sahih.

| Status | Base color | Emissive (hover) | Token CSS asal |
|---|---|---|---|
| `BELUM` | `#c2dccd` | `#63a183` | `--color-brand-200` |
| `TIDAK_ADA` | `#e2e9e3` | `#9dc0ac` | `--color-garis` |
| `RENDAH` | `#cdf05a` | `#cdf05a` | `--color-sorot` |
| `SEDANG` | `#fbbf24` | `#fcd34d` | selaras `GAYA.SEDANG` |
| `TINGGI` | `#f4623a` | `#ff9270` | `--color-aksen` |
| dekoratif (`x_*`) | `#eef3ef` | — | `--color-panel-2` |

Parameter `MeshStandardMaterial` seragam: `roughness 0.55`, `metalness 0.0`,
`flatShading false`, `emissiveIntensity 0` normal / `0.35` saat hover.

Brief meminta putih–abu–biru muda. Palet di atas memakai hijau sage aplikasi.
Kalau tetap ingin biru muda, ganti dua baris pertama menjadi `#dbeafe` /
`#eff6ff` — geometri, UV, dan struktur berkas tidak terpengaruh sama sekali.

### 6.3 Tekstur

**Tidak ada tekstur di v1.** Alasannya: bentuk sudah dibaca dari siluet dan
pencahayaan, sementara satu tekstur 1024² PNG saja bisa lebih besar dari
seluruh geometri.

Opsional untuk v2: satu peta **AO 1024² dipanggang** ke atlas UV bersama,
disimpan sebagai WebP (~40 KB), disambungkan ke `aoMap`. Ini menambah kedalaman
di lipatan tanpa menyentuh warna sama sekali — jadi tetap kompatibel dengan
penukaran material di §6.1.

### 6.4 Pencahayaan (spesifikasi untuk sisi aplikasi)

Model dirancang untuk terbaca di bawah setup ini; ikuti agar kontras antar
status tetap sesuai palet:

- 1× `HemisphereLight` (langit `#ffffff`, tanah `#c2dccd`, intensitas `0.9`)
- 1× `DirectionalLight` dari depan-atas-kiri, intensitas `1.1`, **tanpa bayangan**
- Tanpa environment map, tanpa tone mapping agresif (`NoToneMapping` atau
  `ACESFilmic` dengan `exposure 1.0`)

Bayangan dimatikan bukan untuk berhemat semata — bayangan pada model bercelah
(§7 Langkah 7) menghasilkan garis gelap di setiap celah dan mengaburkan warna
status.

---

## 7. Ekspor ke GLB & optimasi

### 7.1 Pengaturan eksportir Blender

`File → Export → glTF 2.0 (.glb/.gltf)`

| Bagian | Opsi | Nilai |
|---|---|---|
| Format | | **glTF Binary (.glb)** |
| Include | Limit to → Visible Objects | ✔ |
| Include | **Custom Properties** | ✔ **(wajib — ini `userData`)** |
| Include | Cameras, Punctual Lights | ✘ |
| Transform | **+Y Up** | ✔ |
| Data → Mesh | Apply Modifiers | ✔ |
| Data → Mesh | UVs | ✘ (v1) |
| Data → Mesh | Normals | ✔ |
| Data → Mesh | Tangents | ✘ |
| Data → Mesh | Vertex Colors | ✘ |
| Data → Mesh | Loose Edges / Loose Points | ✘ |
| Data → Material | Materials | **Export** |
| Data → Material | Images | None |
| Data → Shape Keys | | ✘ |
| Data → Armature / Skinning | | ✘ |
| Animation | **seluruh bagian** | ✘ |
| Compression (Draco) | | ✘ **(lihat §7.3)** |

Simpan sebagai `assets/blender/tubuh-cmdq.raw.glb`.

### 7.2 Pipeline optimasi

```bash
npm i -D @gltf-transform/cli
```

`scripts/optimasi-model.mjs` menjalankan rantai berikut. **Setiap langkah
dipanggil eksplisit** — jangan pakai perintah `optimize` bawaan (lihat §7.4).

| Langkah | Perintah | Efek |
|---|---|---|
| 1 | `dedup` | Buang material/accessor kembar. |
| 2 | `prune` | Buang node, material, dan atribut yatim. |
| 3 | `weld` | Gabung vertex identik per primitive (tidak lintas mesh). |
| 4 | `quantize --quantize-position 14 --quantize-normal 10` | Posisi float32→int16, normal→int8. Hemat ~55% data vertex. |
| 5 | `meshopt --level medium` | Optimasi urutan cache + kompresi `EXT_meshopt_compression`. |

```bash
npx gltf-transform dedup    assets/blender/tubuh-cmdq.raw.glb /tmp/1.glb
npx gltf-transform prune    /tmp/1.glb /tmp/2.glb
npx gltf-transform weld     /tmp/2.glb /tmp/3.glb
npx gltf-transform quantize /tmp/3.glb /tmp/4.glb \
      --quantize-position 14 --quantize-normal 10
npx gltf-transform meshopt  /tmp/4.glb public/model/tubuh-cmdq.glb --level medium
npx gltf-transform inspect  public/model/tubuh-cmdq.glb
```

Cadangan tak terkompresi (untuk debug & arsip tesis):

```bash
npx gltf-transform copy assets/blender/tubuh-cmdq.raw.glb public/model/tubuh-cmdq.gltf
```

### 7.3 Kenapa meshopt, bukan Draco

Ini bukan preferensi — untuk model sekecil ini, Draco merugikan:

| | Draco | meshopt |
|---|---|---|
| Ukuran dekoder yang harus diunduh klien | ~200 KB WASM | **~5 KB JS** |
| Waktu dekode 10k tris | ~15–30 ms | **~2 ms** |
| Rasio kompresi geometri | sedikit lebih baik | sedikit lebih buruk |

Dekoder Draco saja **lebih besar dari model utuhnya**. Total byte yang
sampai ke HP pengguna justru naik. meshopt menang telak di kelas ukuran ini.
Konsekuensinya di sisi aplikasi: `GLTFLoader` perlu
`.setMeshoptDecoder(MeshoptDecoder)` — satu baris.

### 7.4 Perintah yang HARUS DIHINDARI

| Jangan | Akibat |
|---|---|
| `gltf-transform join` / `--join` | **Menggabungkan 31 mesh jadi 1.** Seluruh rancangan ini hancur, raycaster hanya mengembalikan satu objek. |
| `gltf-transform optimize` (tanpa flag) | Menjalankan `join` **dan** `simplify` secara bawaan. Sama fatalnya. |
| `simplify` | Merusak tepi batas antar-segmen → celah menganga di sambungan. |
| Blender `Ctrl+J` (Join) | Sama dengan `join` di atas, di hulu. |
| `Object → Set Origin → Origin to 3D Cursor` massal | Semua pivot menumpuk di satu titik; efek hover jadi kacau. |

### 7.5 Target ukuran berkas

| Tahap | Perkiraan |
|---|---|
| `.raw.glb` dari Blender | ~420 KB |
| Setelah quantize | ~190 KB |
| **Setelah meshopt (produksi)** | **~110–150 KB** |
| + dekoder meshopt | +5 KB |
| **Total di kabel (dengan gzip/brotli)** | **≈ 120–160 KB** |

Sebagai pembanding: satu foto JPEG biasa di halaman lain kemungkinan lebih
besar dari seluruh model ini.

---

## 8. Kesiapan pakai di Three.js / TresJS

Daftar ini adalah alasan mengapa nyaris tidak ada penyesuaian yang perlu
dilakukan di sisi kode.

| Kebutuhan aplikasi | Sudah beres di model karena |
|---|---|
| Sumbu benar | Diekspor **+Y Up**; tanpa `rotation.x = -Math.PI/2` di kode. |
| Skala benar | 1 unit = 1 meter, tinggi 1,70. Tanpa `scale.setScalar()` ajaib. |
| Posisi benar | Kaki di `y = 0`, tubuh terpusat di `x = z = 0`. Target OrbitControls cukup `(0, 0.9, 0)`. |
| Identifikasi segmen | `object.name` **sudah** kode segmen; `adalahKodeSegmenValid()` yang ada langsung jalan. |
| Filter raycast | `object.userData.terpilih === false` untuk 3 mesh dekoratif. |
| Rotasi depan↔belakang | Satu Empty `TubuhCMDQ`; animasikan `rotation.y` saja. |
| Pivot hover | Origin tiap mesh di pusat volumenya. |
| Ganti warna | Satu material di berkas; 10 material bersama dibuat di runtime. |
| Metadata sisi/regio | `userData.tampak`, `userData.regio` sudah tertanam. |
| Waktu muat | ~130 KB + dekoder 5 KB. |

Yang **tetap** perlu ditulis di sisi aplikasi (di luar cakupan dokumen ini):

1. `GLTFLoader` + `MeshoptDecoder`.
2. Pembuatan 10 material bersama dari palet §6.2.
3. Handler raycast (throttle `pointermove` ~60 ms; jangan raycast tiap frame).
4. Kamera: `fov 35`, posisi `(0, 0.95, 3.2)` desktop / `(0, 0.95, 3.8)` potret;
   `OrbitControls` dengan `enablePan = false`, `minDistance 2.2`,
   `maxDistance 4.5`, `minPolarAngle 1.0`, `maxPolarAngle 2.0`.
5. `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, `shadowMap` mati.
6. Render **on-demand** (hanya saat ada interaksi), bukan `requestAnimationFrame`
   terus-menerus — ini penghemat baterai terbesar di HP, jauh melebihi apa pun
   yang bisa dilakukan pada geometri.

---

## 9. Kendali mutu

### 9.1 Checklist sebelum ekspor (Blender)

- [ ] 31 objek mesh, tidak lebih tidak kurang
- [ ] Tidak ada nama bersufiks `.001`
- [ ] 28 nama cocok **persis** dengan `SEGMEN_TUBUH[].kode`
- [ ] 3 nama diawali `x_`
- [ ] Semua transform di-apply (skala `1,1,1`, rotasi `0,0,0`)
- [ ] Tidak ada skala negatif
- [ ] Normal mengarah keluar semua (overlay Face Orientation: biru semua)
- [ ] Tidak ada loose vertex/edge (Select All by Trait → Loose Geometry = kosong)
- [ ] Merge by Distance sudah dijalankan
- [ ] Origin tiap objek di pusat volumenya
- [ ] Semua di-parent ke Empty `TubuhCMDQ`
- [ ] Satu material `mat_tubuh` di seluruh objek
- [ ] Custom properties terpasang lengkap
- [ ] Tinggi total 1,70 m; `min Z = 0`
- [ ] `BAHU_KIRI` berada di **+X**
- [ ] Total triangle < 15.000

### 9.2 Checklist setelah ekspor

- [ ] `gltf-transform inspect` melaporkan **31 mesh**
- [ ] Ukuran `.glb` < 200 KB
- [ ] Tidak ada animasi, skin, atau tekstur
- [ ] Dibuka di https://gltf-viewer.donmccurdy.com — tidak ada muka bolong
- [ ] Klik tiap segmen di viewer → nama node muncul sesuai

### 9.3 Uji otomatis

Proyek sudah memakai Vitest (`tests/`). Satu uji integritas aset mencegah
kelas bug yang paling mahal — model yang salah nama, yang baru ketahuan setelah
responden mengisi kuesioner.

`tests/model-3d.test.ts` sebaiknya menegaskan:

1. `public/model/tubuh-cmdq.glb` ada dan < 200 KB.
2. Membaca chunk JSON glTF, lalu memastikan **setiap** `kode` di `SEGMEN_TUBUH`
   punya node bernama sama — dan sebaliknya, tidak ada node non-`x_` yang bukan
   kode sah.
3. Jumlah mesh tepat 31.
4. `extras.terpilih` ada di setiap node mesh.

Poin 2 adalah intinya: ia mengunci kontrak antara `segmen.ts` dan berkas 3D,
jadi kalau daftar segmen berubah (komentar di `segmen.ts` sudah menyebut
kemungkinan pindah ke 20 segmen CMDQ baku), uji gagal seketika alih-alih
menghasilkan data diam-diam rusak.

---

## 10. Risiko UX yang harus diputuskan bersama modelnya

Ini bukan catatan tambahan — ini konsekuensi langsung dari mengganti dua figur
SVG dengan satu model 3D, dan sebaiknya diselesaikan di tahap rancangan.

**Masalah:** peta SVG sekarang menampilkan tampak depan *dan* belakang
berdampingan, sehingga 28 segmen terlihat sekaligus. Model 3D tunggal hanya
memperlihatkan separuh. `PUNGGUNG`, `PINGGANG`, `BOKONG`, dan `PANTAT` —
justru segmen dengan prevalensi keluhan tertinggi pada pekerjaan duduk —
menjadi tidak terlihat sampai pengguna tahu bahwa model bisa diputar. Sebagian
responden tidak akan tahu, dan keempat segmen itu akan terisi rendah secara
sistematis.

**Mitigasi yang saya sarankan, berurutan menurut dampak:**

1. **Tombol Depan / Belakang eksplisit**, bukan hanya drag. Mempertahankan
   model mental dua-tampak yang sudah dipakai kuesioner. Drag tetap ada sebagai
   pelengkap, bukan satu-satunya jalan.
2. **Kamera awal 3/4 (yaw ~25°)**, bukan tepat dari depan — langsung
   memberi sinyal bahwa objeknya tiga dimensi dan bisa diputar.
3. **Putar otomatis** ke sisi yang benar saat pengguna memilih segmen dari
   daftar teks — inilah gunanya `userData.tampak`.
4. **Indikator kelengkapan** yang menghitung 28 segmen, dengan denyut halus
   pada segmen yang belum dijawab (mekanisme `BELUM` sudah ada di `PetaTubuh`).
5. **Pertahankan peta SVG sebagai fallback**, dipakai otomatis bila WebGL tidak
   tersedia. `PetaTubuh.vue` sudah teruji dan aksesibel via papan tik.

**Aksesibilitas — perlu dicatat sebagai kemunduran.** `PetaTubuh.vue` saat ini
memberi `role="button"`, `tabindex="0"`, dan `aria-label` per segmen. Kanvas
WebGL adalah satu elemen buram bagi pembaca layar. Daftar tombol paralel yang
tersembunyi secara visual (`sr-only`) perlu ikut dirancang, kalau tidak
aksesibilitas yang sudah dimiliki akan hilang saat pindah ke 3D.

---

## 11. Ringkasan keputusan

| Aspek | Keputusan |
|---|---|
| Jumlah mesh | 31 (28 terpilih + 3 dekoratif) |
| Penamaan | Nama mesh = `kode` segmen `HURUF_BESAR`; dekoratif diawali `x_` |
| Triangle | ~10.000 (plafon 15.000) |
| Pose | A-Pose, abduksi lengan 40° |
| Torso | Dibelah koronal; punggung 4 pita, depan tidak bisa diklik |
| Tangan/kaki | Tanpa jari |
| Kepala | Tanpa wajah, tidak bisa diklik |
| Sambungan | Celah rambut ±3 mm (disengaja, sekaligus penanda batas) |
| Material | 1 di berkas, 10 bersama di runtime (5 status × 2 varian) |
| Tekstur | Tidak ada (v1); AO 1024² opsional di v2 |
| Kompresi | meshopt (bukan Draco) + quantize |
| Ukuran akhir | ~130 KB |
| Sumbu/skala | +Y Up, 1 unit = 1 m, tinggi 1,70 m, kaki di y = 0 |
| Format | `.glb` produksi, `.gltf` + `.bin` cadangan |
| Animasi | Tidak ada; hanya `rotation.y` pada Empty induk |
