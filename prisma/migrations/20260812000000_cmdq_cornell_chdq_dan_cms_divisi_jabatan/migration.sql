-- ═══════════════════════════════════════════════════════════════════════════
--  REVISI INSTRUMEN & CMS SOSIODEMOGRAFI
--
--  1. CMDQ diselaraskan dengan form asli Cornell (18 item, skala 5 opsi,
--     bobot 0/1,5/3,5/5/10)
--  2. CHDQ ditambahkan sebagai instrumen terpisah (6 area × 2 tangan)
--  3. Ambang kategori risiko berpindah dari konstanta kode ke tabel
--  4. Divisi & jabatan berpindah dari konstanta kode ke tabel yang dikelola
--     lewat panel admin
--
--  ⚠  MIGRASI INI MENGHAPUS SELURUH JAWABAN CMDQ YANG SUDAH TERKUMPUL.
--
--  Bukan pilihan, melainkan konsekuensi: instrumennya berganti. Daftar item
--  berubah dari 28 segmen Nordic Body Map menjadi 18 item CMDQ, dan skala
--  frekuensinya dari 4 opsi (kode 0–3) menjadi 5 opsi (kode 0–4). Tidak ada
--  pemetaan yang sah di antara keduanya:
--
--    - Kode frekuensi 3 dahulu berarti "Setiap hari" — kini ia berarti
--      "Sekali setiap hari", sementara "Beberapa kali setiap hari" (kode 4,
--      bobot 10) tidak pernah ditawarkan kepada responden lama. Membiarkan
--      barisnya berarti memberi bobot 5 kepada orang yang mungkin seharusnya
--      mendapat 10, tanpa jejak apa pun bahwa nilai itu hasil terkaan.
--    - Segmen seperti SIKU_KIRI atau KAKI_KANAN tidak punya padanan di CMDQ.
--    - Segmen gabungan (BOKONG + PANTAT → PINGGUL_BOKONG) tidak bisa
--      dijumlahkan begitu saja: keduanya adalah dua pengukuran atas satu
--      keluhan, bukan dua keluhan.
--
--  Responden yang terdampak dikembalikan ke status BELUM sehingga aplikasi
--  memintanya mengisi ulang dengan instrumen yang benar. Bila data lama masih
--  ingin disimpan sebagai arsip, cadangkan tabelnya SEBELUM menjalankan
--  migrasi ini:
--
--    mysqldump -u root ergoself cmdq_jawaban cmdq_hasil segmen_tubuh \
--      > arsip-cmdq-nbm.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Kosongkan data instrumen lama ──────────────────────────────────────
-- Urutan penting: `cmdq_hasil` merujuk `segmen_tubuh` lewat segmenTertinggiId.

DELETE FROM `cmdq_hasil`;
DELETE FROM `cmdq_jawaban`;
DELETE FROM `segmen_tubuh`;

UPDATE `responden` SET `statusCmdq` = 'BELUM';

-- ── 1. Kolom baru pada rekap hasil CMDQ ───────────────────────────────────
-- Aman tanpa DEFAULT karena tabelnya baru saja dikosongkan.

-- AlterTable
ALTER TABLE `cmdq_hasil` ADD COLUMN `jumlahFrekuensiBerbobot` DECIMAL(6, 2) NOT NULL,
    ADD COLUMN `jumlahRating` SMALLINT NOT NULL,
    ADD COLUMN `jumlahSegmenNilaiHilang` SMALLINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `responden` ADD COLUMN `divisiId` INTEGER NULL,
    ADD COLUMN `jabatanId` INTEGER NULL,
    ADD COLUMN `statusChdq` ENUM('BELUM', 'BERLANGSUNG', 'SELESAI') NOT NULL DEFAULT 'BELUM';

-- ── 2. Master divisi & jabatan ────────────────────────────────────────────

-- CreateTable
CREATE TABLE `divisi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(120) NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `divisi_nama_key`(`nama`),
    INDEX `divisi_aktif_urutan_idx`(`aktif`, `urutan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jabatan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(120) NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `jabatan_nama_key`(`nama`),
    INDEX `jabatan_aktif_urutan_idx`(`aktif`, `urutan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── 3. Instrumen CHDQ ─────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE `area_tangan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `tangan` ENUM('KANAN', 'KIRI') NOT NULL,
    `huruf` VARCHAR(1) NOT NULL,
    `nama` VARCHAR(80) NOT NULL,
    `urutan` INTEGER NOT NULL,

    UNIQUE INDEX `area_tangan_kode_key`(`kode`),
    UNIQUE INDEX `area_tangan_urutan_key`(`urutan`),
    INDEX `area_tangan_tangan_idx`(`tangan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chdq_jawaban` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `respondenId` INTEGER NOT NULL,
    `areaId` INTEGER NOT NULL,
    `frekuensiKode` SMALLINT NOT NULL,
    `frekuensiBobot` DECIMAL(4, 1) NOT NULL,
    `ketidaknyamananSkor` SMALLINT NULL,
    `gangguanSkor` SMALLINT NULL,
    `skor` DECIMAL(5, 2) NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `chdq_jawaban_areaId_idx`(`areaId`),
    UNIQUE INDEX `chdq_jawaban_respondenId_areaId_key`(`respondenId`, `areaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chdq_hasil` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `respondenId` INTEGER NOT NULL,
    `skorTotal` DECIMAL(7, 2) NOT NULL,
    `skorTanganKanan` DECIMAL(6, 2) NOT NULL,
    `skorTanganKiri` DECIMAL(6, 2) NOT NULL,
    `tanganDominan` ENUM('KANAN', 'KIRI') NULL,
    `jumlahAreaBermasalah` SMALLINT NOT NULL,
    `kategoriRisiko` ENUM('RENDAH', 'SEDANG', 'TINGGI') NOT NULL,
    `areaTertinggiId` INTEGER NULL,
    `jumlahRating` SMALLINT NOT NULL,
    `jumlahFrekuensiBerbobot` DECIMAL(6, 2) NOT NULL,
    `jumlahAreaNilaiHilang` SMALLINT NOT NULL DEFAULT 0,
    `jumlahAreaDinilai` SMALLINT NOT NULL,
    `ambangSedang` DECIMAL(7, 2) NOT NULL,
    `ambangTinggi` DECIMAL(7, 2) NOT NULL,
    `selesaiPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `chdq_hasil_respondenId_key`(`respondenId`),
    INDEX `chdq_hasil_kategoriRisiko_idx`(`kategoriRisiko`),
    INDEX `chdq_hasil_areaTertinggiId_idx`(`areaTertinggiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── 4. Ambang kategori risiko ─────────────────────────────────────────────

-- CreateTable
CREATE TABLE `ambang_risiko` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `instrumen` ENUM('CMDQ', 'CHDQ') NOT NULL,
    `ambangSedang` DECIMAL(7, 2) NOT NULL,
    `ambangTinggi` DECIMAL(7, 2) NOT NULL,
    `persentilSedang` DECIMAL(4, 1) NOT NULL,
    `persentilTinggi` DECIMAL(4, 1) NOT NULL,
    `jumlahResponden` SMALLINT NOT NULL,
    `dariData` BOOLEAN NOT NULL DEFAULT false,
    `catatan` TEXT NULL,
    `dihitungPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ambang_risiko_instrumen_key`(`instrumen`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `responden_divisiId_idx` ON `responden`(`divisiId`);

-- CreateIndex
CREATE INDEX `responden_jabatanId_idx` ON `responden`(`jabatanId`);

-- AddForeignKey
ALTER TABLE `responden` ADD CONSTRAINT `responden_divisiId_fkey` FOREIGN KEY (`divisiId`) REFERENCES `divisi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `responden` ADD CONSTRAINT `responden_jabatanId_fkey` FOREIGN KEY (`jabatanId`) REFERENCES `jabatan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chdq_jawaban` ADD CONSTRAINT `chdq_jawaban_respondenId_fkey` FOREIGN KEY (`respondenId`) REFERENCES `responden`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chdq_jawaban` ADD CONSTRAINT `chdq_jawaban_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `area_tangan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chdq_hasil` ADD CONSTRAINT `chdq_hasil_respondenId_fkey` FOREIGN KEY (`respondenId`) REFERENCES `responden`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chdq_hasil` ADD CONSTRAINT `chdq_hasil_areaTertinggiId_fkey` FOREIGN KEY (`areaTertinggiId`) REFERENCES `area_tangan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 5. Isi awal CMS divisi & jabatan ──────────────────────────────────────
--
-- Daftar yang sebelumnya menjadi konstanta `OPSI_DIVISI` & `OPSI_JABATAN` di
-- `lib/sosiodemografi.ts` dipindahkan apa adanya, supaya panel admin tidak
-- dimulai dari kosong dan responden yang sudah mengisi tidak kehilangan
-- kategorinya. Peneliti tinggal menyesuaikannya dengan struktur organisasi
-- lokasi penelitian sebelum pengumpulan data dimulai.

INSERT INTO `divisi` (`nama`, `urutan`, `aktif`, `diubahPada`) VALUES
  ('Keuangan & Akuntansi',        1, true, CURRENT_TIMESTAMP(3)),
  ('Sumber Daya Manusia (SDM)',   2, true, CURRENT_TIMESTAMP(3)),
  ('Administrasi & Umum',         3, true, CURRENT_TIMESTAMP(3)),
  ('Teknologi Informasi',         4, true, CURRENT_TIMESTAMP(3)),
  ('Pemasaran & Penjualan',       5, true, CURRENT_TIMESTAMP(3)),
  ('Produksi / Operasional',      6, true, CURRENT_TIMESTAMP(3)),
  ('Logistik & Pengadaan',        7, true, CURRENT_TIMESTAMP(3)),
  ('Hukum & Kepatuhan',           8, true, CURRENT_TIMESTAMP(3)),
  ('Penelitian & Pengembangan',   9, true, CURRENT_TIMESTAMP(3)),
  ('Layanan Pelanggan',          10, true, CURRENT_TIMESTAMP(3));

INSERT INTO `jabatan` (`nama`, `urutan`, `aktif`, `diubahPada`) VALUES
  ('Staf / Pelaksana',          1, true, CURRENT_TIMESTAMP(3)),
  ('Supervisor / Koordinator',  2, true, CURRENT_TIMESTAMP(3)),
  ('Kepala Seksi / Manajer',    3, true, CURRENT_TIMESTAMP(3)),
  ('Kepala Bagian / Direksi',   4, true, CURRENT_TIMESTAMP(3));

-- Hubungkan responden lama ke master lewat kecocokan nama persis.
--
-- Yang TIDAK cocok sengaja dibiarkan ber-divisiId NULL, bukan dipaksa masuk ke
-- entri terdekat: baris seperti itu adalah jawaban "Lainnya" yang diketik
-- responden sendiri, dan NULL-lah yang membedakannya dari pilihan baku.

UPDATE `responden` r
  JOIN `divisi` d ON r.`divisi` = d.`nama`
  SET r.`divisiId` = d.`id`;

UPDATE `responden` r
  JOIN `jabatan` j ON r.`jabatan` = j.`nama`
  SET r.`jabatanId` = j.`id`;
