-- =========================================================
-- ORLIN CRM DATABASE
-- CRM + RFM + K-Means + Promotion Campaign + AI Advisor
-- =========================================================

CREATE DATABASE IF NOT EXISTS orlin_crm
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE orlin_crm;

-- =========================================================
-- 1. USERS
-- =========================================================

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NULL,
    password_hash VARCHAR(255) NOT NULL,

    role ENUM('owner', 'staff') NOT NULL DEFAULT 'staff',
    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =========================================================
-- 2. CUSTOMERS
-- =========================================================

CREATE TABLE customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    customer_code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,

    -- Tidak UNIQUE karena data dummy testing
    whatsapp VARCHAR(30) NULL,
    email VARCHAR(150) NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_customer_name (name)
) ENGINE=InnoDB;


-- =========================================================
-- 3. SERVICES
-- =========================================================

CREATE TABLE services (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    service_code VARCHAR(30) NOT NULL UNIQUE,
    service_name VARCHAR(150) NOT NULL UNIQUE,

    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =========================================================
-- 4. TRANSACTIONS
-- =========================================================

CREATE TABLE transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    transaction_code VARCHAR(40) NOT NULL UNIQUE,

    customer_id BIGINT UNSIGNED NOT NULL,

    -- DATETIME supaya pada data baru customer bisa datang
    -- lebih dari satu kali dalam hari yang sama.
    transaction_date DATETIME NOT NULL,

    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    source ENUM(
        'historical_import',
        'manual'
    ) NOT NULL DEFAULT 'manual',

    created_by BIGINT UNSIGNED NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_transactions_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_transactions_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_transactions_customer (customer_id),
    INDEX idx_transactions_date (transaction_date),
    INDEX idx_transactions_customer_date (
        customer_id,
        transaction_date
    )
) ENGINE=InnoDB;


-- =========================================================
-- 5. TRANSACTION DETAILS
-- =========================================================

CREATE TABLE transaction_details (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    transaction_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,

    quantity INT UNSIGNED NOT NULL DEFAULT 1,

    -- Harga disimpan sebagai snapshot transaksi.
    unit_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_transaction_details_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_transaction_details_service
        FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_transaction_details_transaction (transaction_id),
    INDEX idx_transaction_details_service (service_id)
) ENGINE=InnoDB;


-- =========================================================
-- 6. ANALYSIS RUNS
-- =========================================================

CREATE TABLE analysis_runs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    analysis_name VARCHAR(150) NOT NULL,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Tanggal acuan perhitungan Recency.
    reference_date DATE NOT NULL,

    total_customers INT UNSIGNED NOT NULL DEFAULT 0,

    -- Informasi model yang digunakan
    model_version VARCHAR(50) NULL DEFAULT 'kmeans-v1',
    preprocessing VARCHAR(100) NULL DEFAULT 'StandardScaler',
    k_value INT UNSIGNED NOT NULL DEFAULT 4,

    silhouette_score DECIMAL(10,6) NULL,
    davies_bouldin_index DECIMAL(10,6) NULL,
    calinski_harabasz_index DECIMAL(15,6) NULL,

    status ENUM(
        'pending',
        'processing',
        'completed',
        'failed'
    ) NOT NULL DEFAULT 'pending',

    error_message TEXT NULL,

    created_by BIGINT UNSIGNED NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,

    CONSTRAINT fk_analysis_runs_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_analysis_status (status),
    INDEX idx_analysis_period (start_date, end_date)
) ENGINE=InnoDB;


-- =========================================================
-- 7. RFM RESULTS
-- =========================================================

CREATE TABLE rfm_results (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    analysis_run_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,

    last_transaction_date DATETIME NULL,

    recency INT UNSIGNED NOT NULL,
    frequency INT UNSIGNED NOT NULL,
    monetary DECIMAL(15,2) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rfm_analysis
        FOREIGN KEY (analysis_run_id)
        REFERENCES analysis_runs(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_rfm_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    UNIQUE KEY uq_rfm_analysis_customer (
        analysis_run_id,
        customer_id
    ),

    INDEX idx_rfm_customer (customer_id),
    INDEX idx_rfm_analysis (analysis_run_id)
) ENGINE=InnoDB;


-- =========================================================
-- 8. SEGMENTS
-- =========================================================

CREATE TABLE segments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    segment_code VARCHAR(30) NOT NULL UNIQUE,
    segment_name VARCHAR(100) NOT NULL UNIQUE,

    description TEXT NULL,
    default_objective VARCHAR(150) NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =========================================================
-- 9. CLUSTER RESULTS
-- =========================================================

CREATE TABLE cluster_results (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    analysis_run_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    rfm_result_id BIGINT UNSIGNED NOT NULL,

    -- Output asli K-Means: 0, 1, 2, 3
    cluster_number INT UNSIGNED NOT NULL,

    -- Interpretasi bisnis cluster
    segment_id BIGINT UNSIGNED NOT NULL,

    silhouette_value DECIMAL(10,6) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cluster_analysis
        FOREIGN KEY (analysis_run_id)
        REFERENCES analysis_runs(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_cluster_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_cluster_rfm
        FOREIGN KEY (rfm_result_id)
        REFERENCES rfm_results(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_cluster_segment
        FOREIGN KEY (segment_id)
        REFERENCES segments(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    UNIQUE KEY uq_cluster_analysis_customer (
        analysis_run_id,
        customer_id
    ),

    INDEX idx_cluster_analysis (analysis_run_id),
    INDEX idx_cluster_segment (segment_id),
    INDEX idx_cluster_number (cluster_number)
) ENGINE=InnoDB;


-- =========================================================
-- 10. PROMOTION STRATEGIES
-- =========================================================

CREATE TABLE promotion_strategies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    segment_id BIGINT UNSIGNED NOT NULL,

    strategy_name VARCHAR(150) NOT NULL,
    objective VARCHAR(150) NOT NULL,
    description TEXT NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_promotion_strategy_segment
        FOREIGN KEY (segment_id)
        REFERENCES segments(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    INDEX idx_promotion_strategy_segment (segment_id)
) ENGINE=InnoDB;


-- =========================================================
-- 11. CAMPAIGNS
-- =========================================================

CREATE TABLE campaigns (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    campaign_code VARCHAR(40) NOT NULL UNIQUE,
    campaign_name VARCHAR(150) NOT NULL,

    -- Basis segmentasi campaign
    analysis_run_id BIGINT UNSIGNED NOT NULL,
    segment_id BIGINT UNSIGNED NOT NULL,
    promotion_strategy_id BIGINT UNSIGNED NULL,

    promotion_type ENUM(
        'discount',
        'cashback',
        'voucher',
        'bundling',
        'other'
    ) NOT NULL DEFAULT 'other',

    promotion_value DECIMAL(15,2) NULL,

    promotion_unit ENUM(
        'percent',
        'amount'
    ) NULL,

    offer_description TEXT NULL,

    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,

    whatsapp_enabled TINYINT(1) NOT NULL DEFAULT 0,
    email_enabled TINYINT(1) NOT NULL DEFAULT 0,

    whatsapp_message TEXT NULL,

    email_subject VARCHAR(255) NULL,
    email_body TEXT NULL,

    -- simulation = tidak benar-benar dikirim
    -- test       = kirim ke kontak testing
    -- live       = provider sungguhan jika nanti digunakan
    delivery_mode ENUM(
        'simulation',
        'test',
        'live'
    ) NOT NULL DEFAULT 'simulation',

    status ENUM(
        'draft',
        'scheduled',
        'active',
        'completed',
        'cancelled'
    ) NOT NULL DEFAULT 'draft',

    created_by BIGINT UNSIGNED NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_campaign_analysis
        FOREIGN KEY (analysis_run_id)
        REFERENCES analysis_runs(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_campaign_segment
        FOREIGN KEY (segment_id)
        REFERENCES segments(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_campaign_strategy
        FOREIGN KEY (promotion_strategy_id)
        REFERENCES promotion_strategies(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_campaign_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_campaign_status (status),
    INDEX idx_campaign_period (
        start_datetime,
        end_datetime
    ),
    INDEX idx_campaign_segment (segment_id)
) ENGINE=InnoDB;


-- =========================================================
-- 12. CAMPAIGN TARGETS
-- =========================================================

CREATE TABLE campaign_targets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    campaign_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,

    -- Snapshot segment customer saat campaign dibuat
    segment_id BIGINT UNSIGNED NOT NULL,

    -- Analisis yang menjadi dasar targeting
    analysis_run_id BIGINT UNSIGNED NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_campaign_targets_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES campaigns(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_campaign_targets_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_campaign_targets_segment
        FOREIGN KEY (segment_id)
        REFERENCES segments(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_campaign_targets_analysis
        FOREIGN KEY (analysis_run_id)
        REFERENCES analysis_runs(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    UNIQUE KEY uq_campaign_target (
        campaign_id,
        customer_id
    ),

    INDEX idx_campaign_targets_campaign (campaign_id),
    INDEX idx_campaign_targets_customer (customer_id)
) ENGINE=InnoDB;


-- =========================================================
-- 13. CAMPAIGN DELIVERY LOGS
-- =========================================================

CREATE TABLE campaign_delivery_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    campaign_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,

    channel ENUM(
        'whatsapp',
        'email'
    ) NOT NULL,

    recipient VARCHAR(255) NOT NULL,

    status ENUM(
        'pending',
        'sent',
        'failed'
    ) NOT NULL DEFAULT 'pending',

    attempt_number INT UNSIGNED NOT NULL DEFAULT 1,

    provider_message_id VARCHAR(255) NULL,
    error_message TEXT NULL,

    sent_at DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_delivery_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES campaigns(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_delivery_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    INDEX idx_delivery_campaign (campaign_id),
    INDEX idx_delivery_customer (customer_id),
    INDEX idx_delivery_status (status),
    INDEX idx_delivery_channel (channel)
) ENGINE=InnoDB;


-- =========================================================
-- 14. NOTIFICATIONS
-- =========================================================

CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- NULL berarti notifikasi global untuk seluruh internal user
    user_id BIGINT UNSIGNED NULL,

    notification_type VARCHAR(50) NOT NULL,

    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    -- Contoh:
    -- reference_type = campaign
    -- reference_id   = ID campaign
    reference_type VARCHAR(50) NULL,
    reference_id BIGINT UNSIGNED NULL,

    is_read TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    INDEX idx_notification_user (user_id),
    INDEX idx_notification_read (is_read),
    INDEX idx_notification_created (created_at)
) ENGINE=InnoDB;


-- =========================================================
-- 15. CHAT SESSIONS
-- =========================================================

CREATE TABLE chat_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,

    title VARCHAR(200) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_chat_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    INDEX idx_chat_sessions_user (user_id)
) ENGINE=InnoDB;


-- =========================================================
-- 16. CHAT MESSAGES
-- =========================================================

CREATE TABLE chat_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    chat_session_id BIGINT UNSIGNED NOT NULL,

    role ENUM(
        'user',
        'assistant',
        'system'
    ) NOT NULL,

    message TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chat_messages_session
        FOREIGN KEY (chat_session_id)
        REFERENCES chat_sessions(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    INDEX idx_chat_messages_session (chat_session_id),
    INDEX idx_chat_messages_created (created_at)
) ENGINE=InnoDB;


-- =========================================================
-- 17. SETTINGS
-- =========================================================

CREATE TABLE settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,

    description VARCHAR(255) NULL,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =========================================================
-- SEED SEGMENTS
-- =========================================================

INSERT INTO segments (
    segment_code,
    segment_name,
    description,
    default_objective
)
VALUES
(
    'VVIP',
    'VVIP Customer',
    'Pelanggan sangat aktif dengan frekuensi kunjungan dan nilai transaksi sangat tinggi.',
    'Retention'
),
(
    'LOYAL',
    'Loyal Customer',
    'Pelanggan aktif dengan frekuensi kunjungan dan nilai transaksi relatif tinggi.',
    'Retention'
),
(
    'AT_RISK',
    'At Risk Customer',
    'Pelanggan yang sebelumnya aktif namun sudah cukup lama tidak melakukan kunjungan kembali.',
    'Reactivation'
),
(
    'INACTIVE',
    'Inactive Customer',
    'Pelanggan yang sudah sangat lama tidak melakukan transaksi atau kunjungan kembali.',
    'Win-back / Re-engagement'
);


-- =========================================================
-- SEED PROMOTION STRATEGIES
-- =========================================================

INSERT INTO promotion_strategies (
    segment_id,
    strategy_name,
    objective,
    description
)
SELECT
    id,
    'Exclusive Loyalty Promotion',
    'Retention',
    'Strategi promosi eksklusif untuk mempertahankan pelanggan dengan nilai sangat tinggi.'
FROM segments
WHERE segment_code = 'VVIP';


INSERT INTO promotion_strategies (
    segment_id,
    strategy_name,
    objective,
    description
)
SELECT
    id,
    'Loyalty Promotion',
    'Retention',
    'Strategi untuk mempertahankan pelanggan loyal dan mendorong keberlanjutan kunjungan.'
FROM segments
WHERE segment_code = 'LOYAL';


INSERT INTO promotion_strategies (
    segment_id,
    strategy_name,
    objective,
    description
)
SELECT
    id,
    'Comeback Promotion',
    'Reactivation',
    'Strategi untuk mendorong pelanggan berisiko agar kembali melakukan kunjungan.'
FROM segments
WHERE segment_code = 'AT_RISK';


INSERT INTO promotion_strategies (
    segment_id,
    strategy_name,
    objective,
    description
)
SELECT
    id,
    'Win-back Promotion',
    'Win-back / Re-engagement',
    'Strategi untuk menarik kembali pelanggan yang sudah lama tidak aktif.'
FROM segments
WHERE segment_code = 'INACTIVE';


-- =========================================================
-- DEFAULT SETTINGS
-- =========================================================

INSERT INTO settings (
    setting_key,
    setting_value,
    description
)
VALUES
(
    'app_name',
    'ORLIN CRM',
    'Nama aplikasi'
),
(
    'company_name',
    'ORLIN Salon Banjarnegara',
    'Nama perusahaan'
),
(
    'ml_model_version',
    'kmeans-v1',
    'Versi model K-Means aktif'
),
(
    'ml_cluster_count',
    '4',
    'Jumlah cluster model aktif'
),
(
    'campaign_default_mode',
    'simulation',
    'Mode pengiriman campaign default'
);