-- ============================================================
-- Migration V4: 切换到硅基流动 (SiliconFlow) 平台
-- 最新模型列表 (2025-07 更新，移除已下线模型)
-- ============================================================

-- 确保 provider 列存在
ALTER TABLE models ADD COLUMN IF NOT EXISTS provider VARCHAR(255);

-- 清空旧模型数据
DELETE FROM models;

-- 插入硅基流动平台当前可用模型（各厂商 2-3 个）
-- ---- 通义千问 Qwen (3) ----
INSERT INTO models (id, name, icon, provider, model_name, enabled, sort_order) VALUES
('qwen3.5-397b',   'Qwen3.5 397B MoE',  'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg', '通义千问', 'Qwen/Qwen3.5-397B-A17B',   true, 1),
('qwen3.5-27b',    'Qwen3.5 27B',       'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg', '通义千问', 'Qwen/Qwen3.5-27B',         true, 2),
('qwen3.6-35b',    'Qwen3.6 35B MoE',   'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg', '通义千问', 'Qwen/Qwen3.6-35B-A3B',     true, 3),

-- ---- DeepSeek (2) ----
('deepseek-v3.2',  'DeepSeek V3.2',     'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/DeepSeek.svg', 'DeepSeek', 'deepseek-ai/DeepSeek-V3.2',  true, 10),
('deepseek-r1',    'DeepSeek R1',       'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/DeepSeek.svg', 'DeepSeek', 'deepseek-ai/DeepSeek-R1',    true, 11),

-- ---- 月之暗面 Kimi (1) ----
('kimi-k2.6',      'Kimi K2.6',         'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/moonshotai_new.png', '月之暗面', 'Pro/moonshotai/Kimi-K2.6',  true, 20),

-- ---- 智谱 GLM (2) ----
('glm-5.1',        'GLM 5.1',           'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/zhipu.svg', '智谱AI', 'Pro/zai-org/GLM-5.1',  true, 30),
('glm-5',          'GLM 5',             'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/zhipu.svg', '智谱AI', 'Pro/zai-org/GLM-5',    true, 31),

-- ---- MiniMax (1) ----
('minimax-m2.5',   'MiniMax M2.5',      'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/minimax-color.svg', 'MiniMax', 'Pro/MiniMaxAI/MiniMax-M2.5', true, 40);
