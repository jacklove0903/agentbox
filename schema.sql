-- SQL script to create tables for AgentBox Platform
-- Run this in PostgreSQL to set up the database schema

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    model_id VARCHAR(255) NOT NULL,
    role VARCHAR(10) CHECK (role IN ('USER', 'AI')) NOT NULL,
    content TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create models table
CREATE TABLE models (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255)
);

-- Insert initial model data
INSERT INTO models (id, name, icon) VALUES
('ernie-3.5', '百度 Ernie-3.5', 'https://www.baidu.com/favicon.ico'),
('ernie-4.0', '百度 Ernie-4.0', 'https://www.baidu.com/favicon.ico'),
('ernie-speed', '百度 Ernie-Speed', 'https://www.baidu.com/favicon.ico'),
('hunyuan-turbo', '腾讯 Hunyuan-Turbo', 'https://www.tencent.com/favicon.ico'),
('hunyuan-large', '腾讯 Hunyuan-Large', 'https://www.tencent.com/favicon.ico'),
('hunyuan-standard', '腾讯 Hunyuan-Standard', 'https://www.tencent.com/favicon.ico'),
('qwen-7b', '阿里云 Qwen-7B', 'https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico'),
('qwen-14b', '阿里云 Qwen-14B', 'https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico'),
('qwen-max', '阿里云 Qwen-Max', 'https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico'),
('qwen-turbo', '阿里云 Qwen-Turbo', 'https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico'),
('pangu-3.0', '华为 Pangu-3.0', 'https://www.huawei.com/favicon.ico'),
('pangu-3.5', '华为 Pangu-3.5', 'https://www.huawei.com/favicon.ico'),
('doubao-lite', '字节跳动 Doubao-lite', 'https://www.bytedance.com/favicon.ico'),
('doubao-pro', '字节跳动 Doubao-pro', 'https://www.bytedance.com/favicon.ico'),
('doubao-vision', '字节跳动 Doubao-vision', 'https://www.bytedance.com/favicon.ico'),
('spark-3.0', '科大讯飞 Spark-3.0', 'https://www.iflytek.com/favicon.ico'),
('spark-4.0', '科大讯飞 Spark-4.0', 'https://www.iflytek.com/favicon.ico'),
('spark-max', '科大讯飞 Spark-Max', 'https://www.iflytek.com/favicon.ico'),
('chatglm-3', '智谱AI ChatGLM-3', 'https://www.zhipuai.cn/favicon.ico'),
('chatglm-4', '智谱AI ChatGLM-4', 'https://www.zhipuai.cn/favicon.ico'),
('glm-4-plus', '智谱AI GLM-4-Plus', NULL),
('sensenova-5.0', '商汤科技 SenseNova-5.0', NULL),
('sensenova-5.5', '商汤科技 SenseNova-5.5', NULL);

-- Update existing models with icon URLs if they are NULL
UPDATE models SET icon = 'https://ext.same-assets.com/2425995810/1402690310.png' WHERE icon IS NULL;