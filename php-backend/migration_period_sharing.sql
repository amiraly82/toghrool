-- Migration: Add trackerOwnerUid and period_sharing table (Idempotent)

-- 1. Add trackerOwnerUid to couple_period_settings
SET @dbname = DATABASE();
SET @tablename = "couple_period_settings";
SET @columnname = "trackerOwnerUid";

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE couple_period_settings ADD COLUMN trackerOwnerUid VARCHAR(64) DEFAULT NULL"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Add sharePregnancyTestWithPartner to couple_period_logs
SET @tablename = "couple_period_logs";
SET @columnname = "sharePregnancyTestWithPartner";

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE couple_period_logs ADD COLUMN sharePregnancyTestWithPartner TINYINT(1) NOT NULL DEFAULT 0"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Create period_sharing table
CREATE TABLE IF NOT EXISTS `period_sharing` (
  `coupleId` varchar(128) NOT NULL,
  `ownerUid` varchar(64) NOT NULL,
  `sharePhase` tinyint(1) NOT NULL DEFAULT 1,
  `shareNextPeriod` tinyint(1) NOT NULL DEFAULT 1,
  `shareFertileWindow` tinyint(1) NOT NULL DEFAULT 0,
  `shareFlow` tinyint(1) NOT NULL DEFAULT 0,
  `shareMood` tinyint(1) NOT NULL DEFAULT 0,
  `shareSymptoms` tinyint(1) NOT NULL DEFAULT 0,
  `shareSex` tinyint(1) NOT NULL DEFAULT 0,
  `shareTests` tinyint(1) NOT NULL DEFAULT 0,
  `shareNotes` tinyint(1) NOT NULL DEFAULT 0,
  `allowPartnerLogging` tinyint(1) NOT NULL DEFAULT 0,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`coupleId`),
  KEY `idx_owner` (`ownerUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
