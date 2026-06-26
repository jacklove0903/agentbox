-- ============================================================
-- AgentBox Platform — 完整数据库 Schema
-- 整合自 schema.sql, models.sql, migration_v2 ~ v11
-- 适用于 PostgreSQL 16+
-- ============================================================

-- =====================
-- 1. 用户表
-- =====================
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(50)  UNIQUE NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 2. 模型表
-- =====================
CREATE TABLE IF NOT EXISTS models (
    id              VARCHAR(255) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    icon            VARCHAR(255),
    provider        VARCHAR(255),
    model_name      VARCHAR(255),
    enabled         BOOLEAN DEFAULT true,
    sort_order      INT DEFAULT 0,
    supports_vision BOOLEAN NOT NULL DEFAULT FALSE
);

-- =====================
-- 3. 消息表
-- =====================
CREATE TABLE IF NOT EXISTS messages (
    id              SERIAL PRIMARY KEY,
    user_id         VARCHAR(255) NOT NULL,
    model_id        VARCHAR(255) NOT NULL,
    role            VARCHAR(10) CHECK (role IN ('USER', 'AI')) NOT NULL,
    content         TEXT,
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    conversation_id VARCHAR(36),
    image_urls      TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, timestamp);

-- =====================
-- 4. 会话表
-- =====================
CREATE TABLE IF NOT EXISTS conversations (
    id                      VARCHAR(36) PRIMARY KEY,
    user_id                 VARCHAR(255) NOT NULL,
    title                   VARCHAR(500) DEFAULT '新对话',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    smart_title_generated   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);

-- =====================
-- 5. 图片生成记录表
-- =====================
CREATE TABLE IF NOT EXISTS image_generations (
    id          BIGSERIAL PRIMARY KEY,
    user_id     VARCHAR(255) NOT NULL,
    prompt      TEXT         NOT NULL,
    model       VARCHAR(255) NOT NULL,
    size        VARCHAR(50)  NOT NULL DEFAULT '1024x1024',
    image_url   TEXT,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_gen_user ON image_generations(user_id, created_at DESC);

-- =====================
-- 6. 模型对比投票表
-- =====================
CREATE TABLE IF NOT EXISTS model_votes (
    id              BIGSERIAL PRIMARY KEY,
    user_id         VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(36),
    model_id        VARCHAR(100) NOT NULL,
    user_message    TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_votes_user ON model_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_model ON model_votes(model_id);

-- =====================
-- 7. 上传文件表 (BYTEA)
-- =====================
CREATE TABLE IF NOT EXISTS uploaded_files (
    id            VARCHAR(64) PRIMARY KEY,
    user_id       VARCHAR(64)  NOT NULL,
    original_name VARCHAR(512),
    content_type  VARCHAR(128),
    size_bytes    BIGINT       NOT NULL,
    data          BYTEA        NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_created ON uploaded_files(created_at);

-- ============================================================
-- 8. 初始模型数据 (硅基流动平台, 含视觉模型)
-- ============================================================

-- ---- 通义千问 Qwen ----
INSERT INTO models (id, name, icon, provider, model_name, enabled, sort_order) VALUES
('qwen3.5-397b',   'Qwen3.5 397B MoE',  'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg', '通义千问', 'Qwen/Qwen3.5-397B-A17B',   true, 1),
('qwen3.5-27b',    'Qwen3.5 27B',       'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg', '通义千问', 'Qwen/Qwen3.5-27B',         true, 2),
('qwen3.6-35b',    'Qwen3.6 35B MoE',   'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg', '通义千问', 'Qwen/Qwen3.6-35B-A3B',     true, 3),

-- ---- 通义千问 视觉模型 ----
('qwen3-vl-30b',   'Qwen3-VL 30B MoE',  'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg', '通义千问', 'Qwen/Qwen3-VL-30B-A3B-Instruct', true, 4),
('qwen2.5-vl-32b', 'Qwen2.5-VL 32B',    'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg', '通义千问', 'Qwen/Qwen2.5-VL-32B-Instruct',   true, 5),
('qwen2.5-vl-7b',  'Qwen2.5-VL 7B',     'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg', '通义千问', 'Qwen/Qwen2.5-VL-7B-Instruct',    true, 6),

-- ---- DeepSeek ----
('deepseek-v3.2',  'DeepSeek V3.2',     'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/DeepSeek.svg', 'DeepSeek', 'deepseek-ai/DeepSeek-V3.2',  true, 10),
('deepseek-r1',    'DeepSeek R1',       'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/DeepSeek.svg', 'DeepSeek', 'deepseek-ai/DeepSeek-R1',    true, 11),

-- ---- 月之暗面 Kimi ----
('kimi-k2.6',      'Kimi K2.6',         'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/moonshotai_new.png', '月之暗面', 'Pro/moonshotai/Kimi-K2.6',  true, 20),

-- ---- 智谱 GLM ----
('glm-5.1',        'GLM 5.1',           'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/zhipu.svg', '智谱AI', 'Pro/zai-org/GLM-5.1',  true, 30),
('glm-5',          'GLM 5',             'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/zhipu.svg', '智谱AI', 'Pro/zai-org/GLM-5',    true, 31),

-- ---- MiniMax ----
('minimax-m2.5',   'MiniMax M2.5',      'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/minimax-color.svg', 'MiniMax', 'Pro/MiniMaxAI/MiniMax-M2.5', true, 40)
ON CONFLICT (id) DO NOTHING;

-- 标记支持视觉的模型
UPDATE models SET supports_vision = TRUE WHERE id IN (
    'qwen3.6-35b',
    'qwen3-vl-30b',
    'qwen2.5-vl-32b',
    'qwen2.5-vl-7b'
);
