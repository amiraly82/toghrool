-- Security Migration for Toghrool Couple App
-- Idempotent schema updates for authentication, rate limiting, and health logs

-- 1. Table: auth_tokens
CREATE TABLE IF NOT EXISTS `auth_tokens` (
  `token_hash` CHAR(64) NOT NULL,
  `uid` VARCHAR(64) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `lastUsedAt` DATETIME NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `idx_uid` (`uid`),
  KEY `idx_expires` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: rate_limits
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rate_key` VARCHAR(128) NOT NULL,
  `action` VARCHAR(32) NOT NULL,
  `attempts` INT NOT NULL DEFAULT 1,
  `first_attempt` DATETIME NOT NULL,
  `last_attempt` DATETIME NOT NULL,
  `blocked_until` DATETIME DEFAULT NULL,
  UNIQUE KEY `uniq_key_action` (`rate_key`, `action`),
  KEY `idx_blocked` (`blocked_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: user_uploads (Quota tracking)
CREATE TABLE IF NOT EXISTS `user_uploads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uid` VARCHAR(64) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `file_size` INT NOT NULL,
  `uploadedAt` DATETIME NOT NULL,
  KEY `idx_uid_time` (`uid`, `uploadedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: couple_period_settings
CREATE TABLE IF NOT EXISTS `couple_period_settings` (
  `coupleId` varchar(128) NOT NULL,
  `cycleLength` int(11) DEFAULT 28,
  `periodLength` int(11) DEFAULT 5,
  `lastPeriodStartDate` varchar(32) DEFAULT NULL,
  `goalMode` varchar(32) DEFAULT 'track',
  `birthDate` varchar(32) DEFAULT '2000-01-01',
  `viewMode` varchar(32) DEFAULT 'circular',
  `updatedBy` varchar(64) DEFAULT NULL,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`coupleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: couple_period_logs
CREATE TABLE IF NOT EXISTS `couple_period_logs` (
  `id` varchar(64) NOT NULL,
  `coupleId` varchar(128) NOT NULL,
  `date` varchar(32) NOT NULL,
  `isPeriodDay` tinyint(1) DEFAULT 0,
  `isPeriodStart` tinyint(1) DEFAULT 0,
  `flow` varchar(32) DEFAULT 'none',
  `moods` json DEFAULT NULL,
  `symptoms` json DEFAULT NULL,
  `discharge` varchar(32) DEFAULT 'none',
  `sex` varchar(32) DEFAULT 'none',
  `ovulationTestResult` varchar(32) DEFAULT 'none',
  `pregnancyTestResult` varchar(32) DEFAULT 'none',
  `waterGlasses` int(11) DEFAULT 4,
  `notes` text DEFAULT NULL,
  `loggedByUid` varchar(64) DEFAULT NULL,
  `loggedByName` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_couple_date` (`coupleId`, `date`),
  KEY `idx_couple` (`coupleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table: memory_comments
CREATE TABLE IF NOT EXISTS `memory_comments` (
  `id` varchar(64) NOT NULL,
  `memoryId` varchar(64) NOT NULL,
  `coupleId` varchar(128) NOT NULL,
  `uid` varchar(64) NOT NULL,
  `userName` varchar(255) NOT NULL,
  `userPhoto` varchar(255) DEFAULT NULL,
  `text` text NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_memory` (`memoryId`),
  KEY `idx_couple` (`coupleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
