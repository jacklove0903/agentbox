-- ============================================================
-- Migration V8: 新增视觉（多模态）模型，支持图片输入
-- 硅基流动 VL 系列
-- ============================================================

INSERT INTO models (id, name, icon, provider, model_name, enabled, sort_order) VALUES
('qwen3-vl-30b',    'Qwen3-VL 30B MoE',       'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg', '通义千问', 'Qwen/Qwen3-VL-30B-A3B-Instruct', true, 4),
('qwen2.5-vl-32b',  'Qwen2.5-VL 32B',         'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg', '通义千问', 'Qwen/Qwen2.5-VL-32B-Instruct',   true, 5),
('qwen2.5-vl-7b',   'Qwen2.5-VL 7B',          'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg', '通义千问', 'Qwen/Qwen2.5-VL-7B-Instruct',    true, 6)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    model_name = EXCLUDED.model_name,
    enabled = EXCLUDED.enabled,
    sort_order = EXCLUDED.sort_order;
