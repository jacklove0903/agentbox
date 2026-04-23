-- ============================================================
-- Migration V5: 图片生成记录表
-- ============================================================

CREATE TABLE IF NOT EXISTS image_generations (
    id              BIGSERIAL PRIMARY KEY,
    user_id         VARCHAR(255) NOT NULL,
    prompt          TEXT         NOT NULL,
    model           VARCHAR(255) NOT NULL,
    size            VARCHAR(50)  NOT NULL DEFAULT '1024x1024',
    image_url       TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_gen_user ON image_generations(user_id, created_at DESC);
