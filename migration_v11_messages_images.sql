-- ============================================================
-- Migration V11:
--   1) messages.image_urls  —— 用户消息附带的图片 URL 列表（JSON 字符串）
--   2) conversations.smart_title_generated —— 幂等标记，保证多模型并发时
--      智能标题只生成一次
-- ============================================================

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS image_urls TEXT;

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS smart_title_generated BOOLEAN NOT NULL DEFAULT FALSE;
