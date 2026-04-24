-- ============================================================
-- Migration V10: 给 models 表加 supports_vision 标志
-- 标记哪些模型原生支持图片输入，用于后端自动丢弃不兼容请求的 media
-- ============================================================

ALTER TABLE models ADD COLUMN IF NOT EXISTS supports_vision BOOLEAN NOT NULL DEFAULT FALSE;

-- 标记已知支持视觉的模型
UPDATE models SET supports_vision = TRUE WHERE id IN (
    'qwen3.6-35b'
   
);
