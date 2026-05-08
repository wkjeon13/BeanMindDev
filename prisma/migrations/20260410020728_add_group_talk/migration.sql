-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `nickname` VARCHAR(191) NOT NULL,
    `phone` TEXT NULL,
    `role` ENUM('USER', 'OWNER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isEmailVerified` BOOLEAN NOT NULL DEFAULT false,
    `verificationCode` VARCHAR(191) NULL,
    `verificationExpires` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `loginType` VARCHAR(191) NOT NULL DEFAULT 'EMAIL',
    `socialId` VARCHAR(191) NULL,
    `profileImageUrl` LONGTEXT NULL,
    `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `aiPrescriptionLimit` INTEGER NOT NULL DEFAULT 3,
    `aiUsageCount` INTEGER NOT NULL DEFAULT 0,
    `ageGroup` VARCHAR(191) NULL,
    `favoriteCafe` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `pointBalance` INTEGER NOT NULL DEFAULT 0,
    `bio` TEXT NULL,
    `isPublicProfile` BOOLEAN NOT NULL DEFAULT true,
    `prefAcidity` DOUBLE NULL,
    `prefBitterness` DOUBLE NULL,
    `prefBody` DOUBLE NULL,
    `prefSweetness` DOUBLE NULL,
    `fcmToken` TEXT NULL,
    `equippedBadge` VARCHAR(191) NULL,
    `earnedBadges` TEXT NULL,
    `rewardTier1Name` VARCHAR(191) NOT NULL DEFAULT '참여',
    `rewardTier1Amount` INTEGER NOT NULL DEFAULT 10,
    `rewardTier2Name` VARCHAR(191) NOT NULL DEFAULT '감사',
    `rewardTier2Amount` INTEGER NOT NULL DEFAULT 50,
    `rewardTier3Name` VARCHAR(191) NOT NULL DEFAULT '최고',
    `rewardTier3Amount` INTEGER NOT NULL DEFAULT 100,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_socialId_key`(`socialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Prescription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `beanName` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(191) NOT NULL,
    `aiComment` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `title` VARCHAR(191) NULL,
    `rating` INTEGER NULL,

    INDEX `Prescription_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bookmark` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Bookmark_storeId_fkey`(`storeId`),
    UNIQUE INDEX `Bookmark_userId_storeId_key`(`userId`, `storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Store` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `phone` TEXT NULL,
    `hours` VARCHAR(191) NOT NULL,
    `shortDesc` VARCHAR(191) NOT NULL,
    `longDesc` TEXT NOT NULL,
    `signatureBean` VARCHAR(191) NOT NULL,
    `acidity` INTEGER NOT NULL,
    `sweetness` INTEGER NOT NULL,
    `bitterness` INTEGER NOT NULL,
    `body` INTEGER NOT NULL,
    `equipment` VARCHAR(191) NOT NULL,
    `signatureMenu` VARCHAR(191) NOT NULL,
    `dessertPairing` VARCHAR(191) NOT NULL,
    `hasDecaf` BOOLEAN NOT NULL DEFAULT false,
    `hasOatMilk` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `websiteUrl` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `approvalRequestsCount` INTEGER NOT NULL DEFAULT 1,
    `rejectionReason` TEXT NULL,
    `mainImageUrl` LONGTEXT NULL,
    `markerImageUrl` LONGTEXT NULL,
    `primaryCoffeeType` ENUM('SINGLE_ORIGIN', 'BLENDED', 'SPECIALTY_ROASTERY', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
    `beanNotes` VARCHAR(191) NULL,
    `beanOrigin` VARCHAR(191) NULL,
    `beanRoastLevel` VARCHAR(191) NULL,
    `coffeeMenuImageUrl` LONGTEXT NULL,
    `popularMenuImageUrl` LONGTEXT NULL,
    `isPremiumTop` BOOLEAN NOT NULL DEFAULT false,
    `aiReviewSummary` LONGTEXT NULL,
    `businessNumber` VARCHAR(191) NULL,
    `ownerName` VARCHAR(191) NULL,
    `settlementAccount` VARCHAR(191) NULL,
    `planExpiresAt` DATETIME(3) NULL,
    `storePlan` ENUM('BASIC', 'PREMIUM') NOT NULL DEFAULT 'BASIC',
    `hasParking` BOOLEAN NOT NULL DEFAULT false,
    `hasPetFriendly` BOOLEAN NOT NULL DEFAULT false,
    `hasPowerOutlets` BOOLEAN NOT NULL DEFAULT false,
    `hasWifi` BOOLEAN NOT NULL DEFAULT false,
    `aiRecommendCount` INTEGER NOT NULL DEFAULT 0,
    `recentVisitorCount` INTEGER NOT NULL DEFAULT 0,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `lastWeeklyViewReset` DATETIME(3) NULL,

    INDEX `Store_ownerId_fkey`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Media` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Media_storeId_fkey`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `languageCode` VARCHAR(191) NOT NULL,
    `shortDesc` VARCHAR(191) NULL,
    `longDesc` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StoreTranslation_storeId_idx`(`storeId`),
    UNIQUE INDEX `StoreTranslation_storeId_languageCode_key`(`storeId`, `languageCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `variables` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmailTemplate_type_key`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreReview` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `taste` DOUBLE NOT NULL,
    `atmosphere` DOUBLE NOT NULL,
    `interior` DOUBLE NOT NULL,
    `service` DOUBLE NOT NULL,
    `price` DOUBLE NOT NULL,
    `cleanliness` DOUBLE NOT NULL,
    `overall` DOUBLE NOT NULL,
    `content` TEXT NOT NULL,
    `imageUrls` LONGTEXT NULL,
    `earnedBeans` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StoreReview_storeId_fkey`(`storeId`),
    INDEX `StoreReview_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreFollow` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StoreFollow_storeId_fkey`(`storeId`),
    UNIQUE INDEX `StoreFollow_userId_storeId_key`(`userId`, `storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserFollow` (
    `id` VARCHAR(191) NOT NULL,
    `followerId` VARCHAR(191) NOT NULL,
    `followingId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserFollow_followerId_idx`(`followerId`),
    INDEX `UserFollow_followingId_idx`(`followingId`),
    UNIQUE INDEX `UserFollow_followerId_followingId_key`(`followerId`, `followingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnonymousVisitor` (
    `id` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NOT NULL,
    `visitCount` INTEGER NOT NULL DEFAULT 1,
    `lastVisit` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `aiUsageCount` INTEGER NOT NULL DEFAULT 0,
    `hasUsedAi` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `AnonymousVisitor_visitorId_key`(`visitorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(191) NOT NULL,
    `reporterId` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Block` (
    `id` VARCHAR(191) NOT NULL,
    `blockerId` VARCHAR(191) NOT NULL,
    `blockedId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Block_blockerId_blockedId_key`(`blockerId`, `blockedId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PointTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PointTransaction_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `id` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `postType` ENUM('NORMAL', 'ANNOUNCEMENT', 'EVENT') NOT NULL DEFAULT 'NORMAL',
    `content` TEXT NOT NULL,
    `image` LONGTEXT NULL,
    `cafeName` VARCHAR(191) NULL,
    `cafeLocation` VARCHAR(191) NULL,
    `cafeLat` DOUBLE NULL,
    `cafeLng` DOUBLE NULL,
    `acidity` INTEGER NULL,
    `sweetness` INTEGER NULL,
    `body` INTEGER NULL,
    `bitterness` INTEGER NULL,
    `aroma` INTEGER NULL,
    `taggedBean` VARCHAR(191) NULL,
    `recipeData` LONGTEXT NULL,
    `shareCount` INTEGER NOT NULL DEFAULT 0,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `isSystemPopup` BOOLEAN NOT NULL DEFAULT false,
    `isPilgrimageLedger` BOOLEAN NOT NULL DEFAULT false,
    `pinnedStartDate` DATETIME(3) NULL,
    `pinnedEndDate` DATETIME(3) NULL,
    `earnedBeans` INTEGER NOT NULL DEFAULT 0,
    `storeId` VARCHAR(191) NULL,
    `attachedCourseId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `clubId` VARCHAR(191) NULL,

    INDEX `Post_authorId_idx`(`authorId`),
    INDEX `Post_storeId_idx`(`storeId`),
    INDEX `Post_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comment` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `imageUrl` LONGTEXT NULL,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `earnedBeans` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Comment_postId_idx`(`postId`),
    INDEX `Comment_authorId_idx`(`authorId`),
    INDEX `Comment_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommentReaction` (
    `id` VARCHAR(191) NOT NULL,
    `commentId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `emoji` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommentReaction_commentId_idx`(`commentId`),
    INDEX `CommentReaction_userId_idx`(`userId`),
    UNIQUE INDEX `CommentReaction_commentId_userId_emoji_key`(`commentId`, `userId`, `emoji`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Like` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Like_postId_idx`(`postId`),
    INDEX `Like_userId_idx`(`userId`),
    UNIQUE INDEX `Like_postId_userId_key`(`postId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostBookmark` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PostBookmark_postId_idx`(`postId`),
    INDEX `PostBookmark_userId_idx`(`userId`),
    UNIQUE INDEX `PostBookmark_postId_userId_key`(`postId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Club` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `coverImageUrl` LONGTEXT NULL,
    `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    `maxMembers` INTEGER NOT NULL DEFAULT 100,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Club_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClubMember` (
    `id` VARCHAR(191) NOT NULL,
    `clubId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MEMBER', 'PENDING') NOT NULL DEFAULT 'MEMBER',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ClubMember_clubId_idx`(`clubId`),
    INDEX `ClubMember_userId_idx`(`userId`),
    UNIQUE INDEX `ClubMember_clubId_userId_key`(`clubId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Advertiser` (
    `id` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `managerName` VARCHAR(191) NOT NULL,
    `managerEmail` VARCHAR(191) NOT NULL,
    `managerPhone` VARCHAR(191) NULL,
    `businessNumber` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `billingType` ENUM('PREPAID', 'POSTPAID') NOT NULL DEFAULT 'PREPAID',
    `taxInfo` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `grade` ENUM('VIP', 'STANDARD') NOT NULL DEFAULT 'STANDARD',
    `memo` TEXT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Advertiser_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contract` (
    `id` VARCHAR(191) NOT NULL,
    `advertiserId` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `totalBudget` DOUBLE NOT NULL DEFAULT 0,
    `spentBudget` DOUBLE NOT NULL DEFAULT 0,
    `pricingModel` ENUM('CPM', 'CPC', 'CPA', 'FIXED') NOT NULL DEFAULT 'CPM',
    `priceRate` DOUBLE NOT NULL DEFAULT 0,
    `maxImpressions` INTEGER NULL,
    `maxClicks` INTEGER NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` VARCHAR(191) NOT NULL,
    `advertiserId` VARCHAR(191) NOT NULL,
    `contractId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `objective` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `budget` DOUBLE NULL,
    `targetCountry` VARCHAR(191) NOT NULL DEFAULT 'GLOBAL',
    `targetLanguage` VARCHAR(191) NULL,
    `targetOS` VARCHAR(191) NULL,
    `targetAgeMin` INTEGER NULL,
    `targetAgeMax` INTEGER NULL,
    `targetGender` VARCHAR(191) NULL,
    `targetInterests` VARCHAR(191) NULL,
    `targetDays` VARCHAR(191) NULL,
    `targetHours` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdCreative` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('IMAGE', 'VIDEO', 'HTML', 'TEXT_LINK') NOT NULL,
    `size` ENUM('SMALL', 'MEDIUM', 'LARGE', 'FULL') NOT NULL,
    `content` TEXT NOT NULL,
    `linkUrl` VARCHAR(191) NULL,
    `flavorTags` VARCHAR(191) NULL,
    `originTags` VARCHAR(191) NULL,
    `cpcPrice` DOUBLE NULL,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `weight` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('PENDING', 'ACTIVE', 'PAUSED', 'REJECTED') NOT NULL DEFAULT 'ACTIVE',
    `overlayText` TEXT NULL,
    `overlayFontSize` INTEGER NULL,
    `overlayColor` VARCHAR(191) NULL,
    `overlayPosition` VARCHAR(191) NULL,
    `placementId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Placement` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `locationKey` VARCHAR(191) NOT NULL,
    `supportedSizes` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Placement_locationKey_key`(`locationKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdLog` (
    `id` VARCHAR(191) NOT NULL,
    `creativeId` VARCHAR(191) NOT NULL,
    `actionType` ENUM('IMPRESSION', 'CLICK', 'CONVERSION') NOT NULL,
    `userId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `deviceOS` VARCHAR(191) NULL,
    `locationCountry` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Billing` (
    `id` VARCHAR(191) NOT NULL,
    `contractId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `totalImpressions` INTEGER NOT NULL DEFAULT 0,
    `totalClicks` INTEGER NOT NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `tax` DOUBLE NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `taxIssued` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdInquiry` (
    `id` VARCHAR(191) NOT NULL,
    `advertiser` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `contactName` VARCHAR(191) NOT NULL,
    `contactPhone` VARCHAR(191) NOT NULL,
    `contactEmail` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'REVIEWING', 'MORE_INFO_NEEDED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `adminMemo` TEXT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Poll` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `question` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Poll_postId_key`(`postId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PollOption` (
    `id` VARCHAR(191) NOT NULL,
    `pollId` VARCHAR(191) NOT NULL,
    `text` VARCHAR(191) NOT NULL,

    INDEX `PollOption_pollId_idx`(`pollId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PollVote` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `optionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PollVote_optionId_idx`(`optionId`),
    INDEX `PollVote_userId_idx`(`userId`),
    UNIQUE INDEX `PollVote_userId_optionId_key`(`userId`, `optionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Collection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `isPilgrimageCourse` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Collection_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CollectionItem` (
    `id` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `storeId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CollectionItem_postId_idx`(`postId`),
    INDEX `CollectionItem_storeId_idx`(`storeId`),
    INDEX `CollectionItem_collectionId_idx`(`collectionId`),
    UNIQUE INDEX `CollectionItem_collectionId_postId_key`(`collectionId`, `postId`),
    UNIQUE INDEX `CollectionItem_collectionId_storeId_key`(`collectionId`, `storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreCheckIn` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,

    INDEX `StoreCheckIn_storeId_idx`(`storeId`),
    INDEX `StoreCheckIn_userId_idx`(`userId`),
    UNIQUE INDEX `StoreCheckIn_userId_storeId_key`(`userId`, `storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Prescription` ADD CONSTRAINT `Prescription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Store` ADD CONSTRAINT `Store_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreTranslation` ADD CONSTRAINT `StoreTranslation_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreReview` ADD CONSTRAINT `StoreReview_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreReview` ADD CONSTRAINT `StoreReview_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreFollow` ADD CONSTRAINT `StoreFollow_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreFollow` ADD CONSTRAINT `StoreFollow_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFollow` ADD CONSTRAINT `UserFollow_followerId_fkey` FOREIGN KEY (`followerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFollow` ADD CONSTRAINT `UserFollow_followingId_fkey` FOREIGN KEY (`followingId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PointTransaction` ADD CONSTRAINT `PointTransaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_attachedCourseId_fkey` FOREIGN KEY (`attachedCourseId`) REFERENCES `Collection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommentReaction` ADD CONSTRAINT `CommentReaction_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommentReaction` ADD CONSTRAINT `CommentReaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Like` ADD CONSTRAINT `Like_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Like` ADD CONSTRAINT `Like_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostBookmark` ADD CONSTRAINT `PostBookmark_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostBookmark` ADD CONSTRAINT `PostBookmark_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Club` ADD CONSTRAINT `Club_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClubMember` ADD CONSTRAINT `ClubMember_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClubMember` ADD CONSTRAINT `ClubMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Advertiser` ADD CONSTRAINT `Advertiser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_advertiserId_fkey` FOREIGN KEY (`advertiserId`) REFERENCES `Advertiser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_advertiserId_fkey` FOREIGN KEY (`advertiserId`) REFERENCES `Advertiser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdCreative` ADD CONSTRAINT `AdCreative_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdCreative` ADD CONSTRAINT `AdCreative_placementId_fkey` FOREIGN KEY (`placementId`) REFERENCES `Placement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdLog` ADD CONSTRAINT `AdLog_creativeId_fkey` FOREIGN KEY (`creativeId`) REFERENCES `AdCreative`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Billing` ADD CONSTRAINT `Billing_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdInquiry` ADD CONSTRAINT `AdInquiry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Poll` ADD CONSTRAINT `Poll_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PollOption` ADD CONSTRAINT `PollOption_pollId_fkey` FOREIGN KEY (`pollId`) REFERENCES `Poll`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PollVote` ADD CONSTRAINT `PollVote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PollVote` ADD CONSTRAINT `PollVote_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `PollOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Collection` ADD CONSTRAINT `Collection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CollectionItem` ADD CONSTRAINT `CollectionItem_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `Collection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CollectionItem` ADD CONSTRAINT `CollectionItem_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CollectionItem` ADD CONSTRAINT `CollectionItem_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreCheckIn` ADD CONSTRAINT `StoreCheckIn_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreCheckIn` ADD CONSTRAINT `StoreCheckIn_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
