-- CreateTable
CREATE TABLE `admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(120) NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `responden` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kodeResponden` VARCHAR(32) NOT NULL,
    `nama` VARCHAR(120) NOT NULL,
    `email` VARCHAR(160) NULL,
    `unitKerja` VARCHAR(120) NULL,
    `usia` INTEGER NOT NULL,
    `jenisKelamin` ENUM('LAKI_LAKI', 'PEREMPUAN') NOT NULL,
    `masaKerjaTahun` DECIMAL(4, 1) NOT NULL,
    `durasiKomputerJamPerHari` DECIMAL(4, 1) NOT NULL,
    `tinggiBadanCm` DECIMAL(5, 1) NOT NULL,
    `beratBadanKg` DECIMAL(5, 1) NOT NULL,
    `imt` DECIMAL(5, 2) NOT NULL,
    `kategoriImt` ENUM('KURUS_BERAT', 'KURUS_RINGAN', 'NORMAL', 'GEMUK_RINGAN', 'OBESITAS') NOT NULL,
    `olahraga` BOOLEAN NOT NULL,
    `frekuensiOlahragaPerMinggu` SMALLINT NULL,
    `merokok` BOOLEAN NOT NULL,
    `riwayatMsds` BOOLEAN NOT NULL,
    `keteranganRiwayatMsds` TEXT NULL,
    `statusCmdq` ENUM('BELUM', 'BERLANGSUNG', 'SELESAI') NOT NULL DEFAULT 'BELUM',
    `statusSus` ENUM('BELUM', 'BERLANGSUNG', 'SELESAI') NOT NULL DEFAULT 'BELUM',
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `responden_kodeResponden_key`(`kodeResponden`),
    INDEX `responden_jenisKelamin_idx`(`jenisKelamin`),
    INDEX `responden_kategoriImt_idx`(`kategoriImt`),
    INDEX `responden_usia_idx`(`usia`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `segmen_tubuh` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(48) NOT NULL,
    `nama` VARCHAR(80) NOT NULL,
    `namaEn` VARCHAR(80) NOT NULL,
    `sisi` ENUM('TENGAH', 'KIRI', 'KANAN') NOT NULL DEFAULT 'TENGAH',
    `regio` ENUM('LEHER', 'BAHU', 'PUNGGUNG_PINGGANG', 'EKSTREMITAS_ATAS', 'EKSTREMITAS_BAWAH') NOT NULL,
    `urutan` INTEGER NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `segmen_tubuh_kode_key`(`kode`),
    UNIQUE INDEX `segmen_tubuh_urutan_key`(`urutan`),
    INDEX `segmen_tubuh_regio_idx`(`regio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cmdq_jawaban` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `respondenId` INTEGER NOT NULL,
    `segmenId` INTEGER NOT NULL,
    `frekuensiKode` SMALLINT NOT NULL,
    `frekuensiBobot` DECIMAL(4, 1) NOT NULL,
    `ketidaknyamananSkor` SMALLINT NULL,
    `gangguanSkor` SMALLINT NULL,
    `skor` DECIMAL(5, 2) NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `cmdq_jawaban_segmenId_idx`(`segmenId`),
    UNIQUE INDEX `cmdq_jawaban_respondenId_segmenId_key`(`respondenId`, `segmenId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cmdq_hasil` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `respondenId` INTEGER NOT NULL,
    `skorTotal` DECIMAL(7, 2) NOT NULL,
    `skorRataRata` DECIMAL(5, 2) NOT NULL,
    `jumlahSegmenBermasalah` SMALLINT NOT NULL,
    `kategoriRisiko` ENUM('RENDAH', 'SEDANG', 'TINGGI') NOT NULL,
    `segmenTertinggiId` INTEGER NULL,
    `jumlahSegmenDinilai` SMALLINT NOT NULL,
    `ambangSedang` DECIMAL(7, 2) NOT NULL,
    `ambangTinggi` DECIMAL(7, 2) NOT NULL,
    `selesaiPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cmdq_hasil_respondenId_key`(`respondenId`),
    INDEX `cmdq_hasil_kategoriRisiko_idx`(`kategoriRisiko`),
    INDEX `cmdq_hasil_segmenTertinggiId_idx`(`segmenTertinggiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sus_jawaban` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `respondenId` INTEGER NOT NULL,
    `itemNomor` SMALLINT NOT NULL,
    `skorJawaban` SMALLINT NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sus_jawaban_respondenId_itemNomor_key`(`respondenId`, `itemNomor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sus_hasil` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `respondenId` INTEGER NOT NULL,
    `skorTotal` DECIMAL(5, 2) NOT NULL,
    `interpretasi` ENUM('NOT_ACCEPTABLE', 'MARGINAL', 'ACCEPTABLE') NOT NULL,
    `gradeHuruf` VARCHAR(2) NOT NULL,
    `adjektif` VARCHAR(40) NOT NULL,
    `memenuhiTarget` BOOLEAN NOT NULL,
    `selesaiPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sus_hasil_respondenId_key`(`respondenId`),
    INDEX `sus_hasil_interpretasi_idx`(`interpretasi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cmdq_jawaban` ADD CONSTRAINT `cmdq_jawaban_respondenId_fkey` FOREIGN KEY (`respondenId`) REFERENCES `responden`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cmdq_jawaban` ADD CONSTRAINT `cmdq_jawaban_segmenId_fkey` FOREIGN KEY (`segmenId`) REFERENCES `segmen_tubuh`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cmdq_hasil` ADD CONSTRAINT `cmdq_hasil_respondenId_fkey` FOREIGN KEY (`respondenId`) REFERENCES `responden`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cmdq_hasil` ADD CONSTRAINT `cmdq_hasil_segmenTertinggiId_fkey` FOREIGN KEY (`segmenTertinggiId`) REFERENCES `segmen_tubuh`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sus_jawaban` ADD CONSTRAINT `sus_jawaban_respondenId_fkey` FOREIGN KEY (`respondenId`) REFERENCES `responden`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sus_hasil` ADD CONSTRAINT `sus_hasil_respondenId_fkey` FOREIGN KEY (`respondenId`) REFERENCES `responden`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
