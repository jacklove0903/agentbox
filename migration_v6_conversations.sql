-- ============================================================
-- Migration V6: 会话管理 (Conversations)
-- 新建 conversations 表，messages 表新增 conversation_id
-- ============================================================

-- 1. 会话表
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) DEFAULT '新对话',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);

-- 2. messages 表新增 conversation_id 列
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, timestamp);
