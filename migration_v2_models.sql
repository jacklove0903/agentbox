-- ============================================================
-- Migration V2: 重建 models 表，只保留百炼平台真实可用的模型
-- ============================================================

-- 1. 加新列（如果还没有）
ALTER TABLE models ADD COLUMN IF NOT EXISTS model_name VARCHAR(255);
ALTER TABLE models ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE models ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- 2. 清空旧的假数据
DELETE FROM models;

-- 3. 插入真实百炼模型
-- ---- 千问 Qwen ----
INSERT INTO models (id, name, icon, provider, model_name, enabled, sort_order) VALUES
('qwen3-max',      '千问3 Max',     'https://img.alicdn.com/imgextra/i4/O1CN01aGx1PW1krlOJaFEBo_!!6000000004738-2-tps-124-122.png', '通义千问', 'qwen3-max',      true, 1),
('qwen3-plus',     '千问3 Plus',    'https://img.alicdn.com/imgextra/i4/O1CN01aGx1PW1krlOJaFEBo_!!6000000004738-2-tps-124-122.png', '通义千问', 'qwen3-plus',     true, 2),
('qwen-turbo',     '千问 Turbo',    'https://img.alicdn.com/imgextra/i4/O1CN01aGx1PW1krlOJaFEBo_!!6000000004738-2-tps-124-122.png', '通义千问', 'qwen-turbo',     true, 3),
('qwen-max',       '千问 Max',      'https://img.alicdn.com/imgextra/i4/O1CN01aGx1PW1krlOJaFEBo_!!6000000004738-2-tps-124-122.png', '通义千问', 'qwen-max',       true, 4),
('qwen-long',      '千问 Long',     'https://img.alicdn.com/imgextra/i4/O1CN01aGx1PW1krlOJaFEBo_!!6000000004738-2-tps-124-122.png', '通义千问', 'qwen-long',      true, 5),
('qwq-plus',       'QwQ Plus',      'https://img.alicdn.com/imgextra/i4/O1CN01aGx1PW1krlOJaFEBo_!!6000000004738-2-tps-124-122.png', '通义千问', 'qwq-plus',       true, 6),

-- ---- DeepSeek ----
('deepseek-v3',    'DeepSeek V3',   'https://cdn.deepseek.com/logo.png', 'DeepSeek', 'deepseek-v3',    true, 10),
('deepseek-r1',    'DeepSeek R1',   'https://cdn.deepseek.com/logo.png', 'DeepSeek', 'deepseek-r1',    true, 11),

-- ---- Kimi（月之暗面）----
('kimi-k2.5',         'Kimi K2.5',         'https://statics.moonshot.cn/kimi-chat/favicon.ico', 'Kimi', 'kimi-k2.5',         true, 20),
('kimi-k2-thinking',  'Kimi K2 Thinking',  'https://statics.moonshot.cn/kimi-chat/favicon.ico', 'Kimi', 'kimi-k2-thinking',  true, 21),

-- ---- GLM（智谱 AI）----
('glm-5',         'GLM-5',         'https://www.zhipuai.cn/favicon.ico', '智谱AI', 'glm-5',         true, 30),
('glm-4.5',       'GLM-4.5',       'https://www.zhipuai.cn/favicon.ico', '智谱AI', 'glm-4.5',       true, 31),

-- ---- MiniMax（稀宇科技）----
('minimax-m2.5',  'MiniMax M2.5',  'https://www.minimaxi.com/favicon.ico', 'MiniMax', 'MiniMax-M2.5',  true, 40);
