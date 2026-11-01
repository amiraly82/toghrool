-- SQL Schema for Couples Shared Wishlist App
-- Import this file into phpMyAdmin on your cPanel host

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Table: users
CREATE TABLE IF NOT EXISTS `users` (
  `uid` varchar(64) NOT NULL,
  `email` varchar(255) NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `coupleCode` varchar(32) NOT NULL,
  `partnerEmail` varchar(255) DEFAULT NULL,
  `partnerUid` varchar(64) DEFAULT NULL,
  `coupleId` varchar(128) DEFAULT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `photoURL` text DEFAULT NULL,
  `isOnline` tinyint(1) DEFAULT 0,
  `lastActiveAt` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `coupleCode` (`coupleCode`)
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
  `content` text NOT NULL,
  `createdBy` varchar(64) NOT NULL,
  `createdByName` varchar(255) NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `coupleId` (`coupleId`)
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
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `category` varchar(64) NOT NULL,
  `description` text DEFAULT NULL,
  `date` varchar(32) NOT NULL,
  `type` varchar(16) NOT NULL DEFAULT 'expense',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: private_budgets
CREATE TABLE IF NOT EXISTS `private_budgets` (
  `userId` varchar(64) NOT NULL,
  `budgets` json NOT NULL,
  `monthlyIncomeGoal` decimal(15,2) DEFAULT 0.00,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
