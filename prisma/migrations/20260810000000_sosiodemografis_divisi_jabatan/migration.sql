-- ═══════════════════════════════════════════════════════════════════════════
--  Data sosiodemografis: tambah `divisi` & `jabatan`, dan susulkan perubahan
--  variabel kategorik yang belum pernah punya berkas migrasi.
--
--  DUA COMMIT SEBELUMNYA MENGUBAH SKEMA TANPA MIGRASI:
--    - 75620c4 mengubah `usia` (INTEGER), `masaKerjaTahun` dan
--      `durasiKomputerJamPerHari` (DECIMAL) menjadi kategori teks;
--    - 1b8c03d membuat `passwordHash` opsional untuk pengguna login Google.
--  Keduanya ikut dikejar di sini supaya riwayat migrasi kembali sejalan
--  dengan `schema.prisma`.
--
--  IDEMPOTEN TERHADAP `db push`: bila basis data sudah terlanjur berbentuk
--  VARCHAR, blok MODIFY tidak mengubah apa pun dan blok UPDATE tidak menemukan
--  baris berformat angka untuk dikonversi.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Kolom baru ──────────────────────────────────────────────────────────
-- NULL, bukan NOT NULL: responden yang mendaftar sebelum rilis ini sudah punya
-- baris tanpa kedua nilai ini. Kewajiban mengisinya ditegakkan di
-- `lib/validasi/responden.ts`, bukan oleh basis data.
ALTER TABLE `responden`
    ADD COLUMN `divisi` VARCHAR(120) NULL,
    ADD COLUMN `jabatan` VARCHAR(120) NULL;

-- ── 2. Variabel kategorik: angka → teks ────────────────────────────────────
ALTER TABLE `responden`
    MODIFY `usia` VARCHAR(20) NULL,
    MODIFY `masaKerjaTahun` VARCHAR(20) NULL,
    MODIFY `durasiKomputerJamPerHari` VARCHAR(20) NULL,
    MODIFY `passwordHash` VARCHAR(255) NULL;

-- ── 3. Konversi data lama ke label kategori ────────────────────────────────
-- Tanpa langkah ini, responden lama menyimpan "27" — nilai yang tidak ada di
-- daftar `lib/sosiodemografi.ts`, sehingga tidak akan pernah cocok dengan
-- filter dasbor mana pun dan muncul sebagai kategori sendiri di hasil ekspor.
-- Syarat REGEXP membatasi UPDATE hanya pada baris yang masih berformat angka.

UPDATE `responden` SET `usia` = CASE
    WHEN CAST(`usia` AS DECIMAL(5,1)) <= 22 THEN '17-22 Thn'
    WHEN CAST(`usia` AS DECIMAL(5,1)) <= 28 THEN '23-28 Thn'
    WHEN CAST(`usia` AS DECIMAL(5,1)) <= 34 THEN '29-34 Thn'
    WHEN CAST(`usia` AS DECIMAL(5,1)) <= 40 THEN '35-40 Thn'
    WHEN CAST(`usia` AS DECIMAL(5,1)) <= 46 THEN '41-46 Thn'
    WHEN CAST(`usia` AS DECIMAL(5,1)) <= 52 THEN '47-52 Thn'
    ELSE '> 52 Thn'
END
WHERE `usia` REGEXP '^[0-9]+(\\.[0-9]+)?$';

UPDATE `responden` SET `masaKerjaTahun` = CASE
    WHEN CAST(`masaKerjaTahun` AS DECIMAL(5,1)) < 5 THEN '< 5 Thn'
    WHEN CAST(`masaKerjaTahun` AS DECIMAL(5,1)) <= 10 THEN '> 5 Thn'
    ELSE '> 10 Thn'
END
WHERE `masaKerjaTahun` REGEXP '^[0-9]+(\\.[0-9]+)?$';

UPDATE `responden` SET `durasiKomputerJamPerHari` = CASE
    WHEN CAST(`durasiKomputerJamPerHari` AS DECIMAL(5,1)) < 6 THEN '< 6 Jam'
    ELSE '> 6 Jam'
END
WHERE `durasiKomputerJamPerHari` REGEXP '^[0-9]+(\\.[0-9]+)?$';

-- ── 4. Indeks untuk filter dasbor ──────────────────────────────────────────
CREATE INDEX `responden_divisi_idx` ON `responden`(`divisi`);
CREATE INDEX `responden_jabatan_idx` ON `responden`(`jabatan`);
