-- AlterTable
ALTER TABLE `responden` ADD COLUMN `passwordHash` VARCHAR(255) NOT NULL,
    ADD COLUMN `setujuEtik` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `statusProfil` ENUM('BELUM', 'BERLANGSUNG', 'SELESAI') NOT NULL DEFAULT 'BELUM',
    ADD COLUMN `tanggalPersetujuan` DATETIME(3) NULL,
    MODIFY `email` VARCHAR(160) NOT NULL,
    MODIFY `usia` INTEGER NULL,
    MODIFY `jenisKelamin` ENUM('LAKI_LAKI', 'PEREMPUAN') NULL,
    MODIFY `masaKerjaTahun` DECIMAL(4, 1) NULL,
    MODIFY `durasiKomputerJamPerHari` DECIMAL(4, 1) NULL,
    MODIFY `tinggiBadanCm` DECIMAL(5, 1) NULL,
    MODIFY `beratBadanKg` DECIMAL(5, 1) NULL,
    MODIFY `imt` DECIMAL(5, 2) NULL,
    MODIFY `kategoriImt` ENUM('KURUS_BERAT', 'KURUS_RINGAN', 'NORMAL', 'GEMUK_RINGAN', 'OBESITAS') NULL,
    MODIFY `olahraga` BOOLEAN NULL,
    MODIFY `merokok` BOOLEAN NULL,
    MODIFY `riwayatMsds` BOOLEAN NULL;

-- CreateIndex
CREATE UNIQUE INDEX `responden_email_key` ON `responden`(`email`);
