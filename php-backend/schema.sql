-- SQL Schema for Couples Shared Wishlist App
-- Canonical Schema Definition

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Table: users
CREATE TABLE IF NOT EXISTS `users` (
  `uid` varchar(64) NOT NULL,
  `email` varchar(255) NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `coupleCode` varchar(32) NOT NULL,
  `gender` varchar(16) DEFAULT NULL,
  `partnerEmail` varchar(255) DEFAULT NULL,
  `partnerUid` varchar(64) DEFAULT NULL,
  `coupleId` varchar(128) DEFAULT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `photoURL` longtext DEFAULT NULL,
  `isOnline` tinyint(1) DEFAULT 0,
  `lastActiveAt` bigint(20) DEFAULT NULL,
  `batteryLevel` int(11) DEFAULT 80,
  `needStatus` varchar(128) DEFAULT 'calm',
  `needUpdatedAt` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `coupleCode` (`coupleCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: auth_tokens
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

-- Table: rate_limits
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

-- Table: user_uploads
CREATE TABLE IF NOT EXISTS `user_uploads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uid` VARCHAR(64) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `file_size` INT NOT NULL,
  `uploadedAt` DATETIME NOT NULL,
  KEY `idx_uid_time` (`uid`, `uploadedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: couples
CREATE TABLE IF NOT EXISTS `couples` (
  `id` varchar(128) NOT NULL,
  `partner1Uid` varchar(64) NOT NULL,
  `partner1Email` varchar(255) NOT NULL,
  `partner1Name` varchar(255) NOT NULL,
  `partner2Uid` varchar(64) DEFAULT NULL,
  `partner2Email` varchar(255) DEFAULT NULL,
  `partner2Name` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: wishlist
CREATE TABLE IF NOT EXISTS `wishlist` (
  `id` varchar(64) NOT NULL,
  `coupleId` varchar(128) NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(64) NOT NULL DEFAULT 'place',
  `budget` varchar(32) DEFAULT 'medium',
  `description` text DEFAULT NULL,
  `link` text DEFAULT NULL,
  `linkPreview` json DEFAULT NULL,
  `date` varchar(32) DEFAULT NULL,
  `progress` int(11) DEFAULT 0,
  `isCompleted` tinyint(1) DEFAULT 0,
  `completedAt` varchar(64) DEFAULT NULL,
  `createdBy` varchar(64) NOT NULL,
  `createdByName` varchar(255) NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `coupleId` (`coupleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: pokes
CREATE TABLE IF NOT EXISTS `pokes` (
  `id` varchar(64) NOT NULL,
  `coupleId` varchar(128) NOT NULL,
  `senderUid` varchar(64) NOT NULL,
  `senderName` varchar(255) NOT NULL,
  `recipientUid` varchar(64) NOT NULL,
  `message` text DEFAULT NULL,
  `itemId` varchar(64) NOT NULL,
  `itemTitle` varchar(255) NOT NULL,
  `isRead` tinyint(1) DEFAULT 0,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `coupleId` (`coupleId`),
  KEY `recipientUid` (`recipientUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: memories
CREATE TABLE IF NOT EXISTS `memories` (
  `id` varchar(64) NOT NULL,
  `coupleId` varchar(128) NOT NULL,
  `title` varchar(255) NOT NULL,
  `date` varchar(64) NOT NULL,
  `imageUrl` longtext DEFAULT NULL,
  `rawImageUrl` longtext DEFAULT NULL,
  `content` text NOT NULL,
  `isTimeCapsule` tinyint(1) DEFAULT 0,
  `unlockDate` varchar(32) DEFAULT NULL,
  `reactions` longtext DEFAULT NULL,
  `createdBy` varchar(64) NOT NULL,
  `createdByName` varchar(255) NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `coupleId` (`coupleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: memory_comments
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

-- Table: daily_answers (Phase 2 Blind Reveal)
CREATE TABLE IF NOT EXISTS `daily_answers` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `coupleId` varchar(128) NOT NULL,
  `questionId` int(11) NOT NULL,
  `questionDate` varchar(32) NOT NULL,
  `user1Uid` varchar(64) NOT NULL,
  `user1Answer` text DEFAULT NULL,
  `user1AnsweredAt` bigint(20) DEFAULT NULL,
  `user2Uid` varchar(64) DEFAULT NULL,
  `user2Answer` text DEFAULT NULL,
  `user2AnsweredAt` bigint(20) DEFAULT NULL,
  `isRevealed` tinyint(1) DEFAULT 0,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_couple_qdate` (`coupleId`, `questionDate`),
  KEY `idx_couple` (`coupleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: love_vouchers (Phase 2 Coupon Book)
CREATE TABLE IF NOT EXISTS `love_vouchers` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `coupleId` varchar(128) NOT NULL,
  `giverUid` varchar(64) NOT NULL,
  `giverName` varchar(255) NOT NULL,
  `receiverUid` varchar(64) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(64) DEFAULT 'Heart',
  `status` varchar(32) DEFAULT 'available',
  `redeemedAt` bigint(20) DEFAULT NULL,
  `completedAt` bigint(20) DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_couple` (`coupleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: couple_period_settings
CREATE TABLE IF NOT EXISTS `couple_period_settings` (
  `coupleId` varchar(128) NOT NULL,
  `trackerOwnerUid` varchar(64) DEFAULT NULL,
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

-- Table: couple_period_logs
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
  `sharePregnancyTestWithPartner` tinyint(1) DEFAULT 0,
  `waterGlasses` int(11) DEFAULT 4,
  `notes` text DEFAULT NULL,
  `loggedByUid` varchar(64) DEFAULT NULL,
  `loggedByName` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_couple_date` (`coupleId`, `date`),
  KEY `idx_couple` (`coupleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: period_sharing
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

-- Table: user_period_settings
CREATE TABLE IF NOT EXISTS `user_period_settings` (
  `uid` varchar(64) NOT NULL,
  `cycleLengthMin` int(11) DEFAULT 21,
  `cycleLengthMax` int(11) DEFAULT 35,
  `cycleLengthTypical` int(11) DEFAULT 28,
  `periodLength` int(11) DEFAULT 5,
  `lastPeriodStartDate` varchar(32) DEFAULT NULL,
  `pmsNotificationEnabled` tinyint(1) DEFAULT 1,
  `pmsNotificationDaysBefore` int(11) DEFAULT 3,
  `showPmsPredictions` tinyint(1) DEFAULT 1,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: private_expenses
CREATE TABLE IF NOT EXISTS `private_expenses` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `userId` varchar(64) NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `category` varchar(64) NOT NULL,
  `description` text DEFAULT NULL,
  `date` varchar(32) NOT NULL,
  `type` varchar(16) NOT NULL DEFAULT 'expense',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_user_date` (`userId`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: private_budgets
CREATE TABLE IF NOT EXISTS `private_budgets` (
  `userId` varchar(64) NOT NULL PRIMARY KEY,
  `budgets` json DEFAULT NULL,
  `monthlyIncomeGoal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
