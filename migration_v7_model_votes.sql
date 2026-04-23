-- ============================================================
-- Migration V7: 模型对比投票 (Model Votes)
-- 记录用户在多模型对比中选择的最佳回答
-- ============================================================

CREATE TABLE IF NOT EXISTS model_votes (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(36),
    model_id VARCHAR(100) NOT NULL,
    user_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_votes_user ON model_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_model ON model_votes(model_id);
