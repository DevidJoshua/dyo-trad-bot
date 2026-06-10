-- CreateTable
CREATE TABLE `trading_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `broker` VARCHAR(191) NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `server` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trading_accounts_account_number_key`(`account_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `strategies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `configuration` VARCHAR(191) NOT NULL DEFAULT '{}',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `strategies_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trade_signals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(191) NOT NULL,
    `signal` VARCHAR(191) NOT NULL,
    `confidence` INTEGER NULL,
    `strategy_id` INTEGER NOT NULL,
    `account_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trade_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticket` BIGINT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `lot` DOUBLE NOT NULL,
    `entry_price` DOUBLE NULL,
    `stop_loss` DOUBLE NULL,
    `take_profit` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `opened_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `profit` DOUBLE NULL,
    `signal_id` INTEGER NULL,
    `account_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trade_orders_ticket_key`(`ticket`),
    UNIQUE INDEX `trade_orders_signal_id_key`(`signal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `market_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(191) NOT NULL,
    `timeframe` VARCHAR(191) NOT NULL,
    `open` DOUBLE NOT NULL,
    `high` DOUBLE NOT NULL,
    `low` DOUBLE NOT NULL,
    `close` DOUBLE NOT NULL,
    `volume` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,

    INDEX `market_data_symbol_timeframe_timestamp_idx`(`symbol`, `timeframe`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risk_configurations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `risk_per_trade` DOUBLE NOT NULL DEFAULT 1.0,
    `max_daily_loss` DOUBLE NOT NULL DEFAULT 3.0,
    `max_drawdown` DOUBLE NOT NULL DEFAULT 10.0,
    `max_open_positions` INTEGER NOT NULL DEFAULT 5,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entity_id` INTEGER NULL,
    `details` VARCHAR(191) NULL,
    `user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_action_created_at_idx`(`action`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'USER',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `trade_signals` ADD CONSTRAINT `trade_signals_strategy_id_fkey` FOREIGN KEY (`strategy_id`) REFERENCES `strategies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trade_signals` ADD CONSTRAINT `trade_signals_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `trading_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trade_orders` ADD CONSTRAINT `trade_orders_signal_id_fkey` FOREIGN KEY (`signal_id`) REFERENCES `trade_signals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trade_orders` ADD CONSTRAINT `trade_orders_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `trading_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
