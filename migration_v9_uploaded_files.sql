-- ============================================================
-- Migration V9: 图片/文件存 PostgreSQL (BYTEA)，替代文件系统
-- 限制单文件 2MB（应用层 + multipart 配置双重限制）
-- ============================================================

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
