-- SQL script to create tables for AgentBox Platform
-- Run this in MySQL to set up the database schema

-- Create users table
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    model_id VARCHAR(255) NOT NULL,
    role ENUM('USER', 'AI') NOT NULL,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create models table
CREATE TABLE models (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255)
);

-- Insert initial model data
INSERT INTO models (id, name, icon) VALUES
('ernie-3.5', '百度 Ernie-3.5', NULL),
('ernie-4.0', '百度 Ernie-4.0', NULL),
('ernie-speed', '百度 Ernie-Speed', NULL),
('hunyuan-turbo', '腾讯 Hunyuan-Turbo', NULL),
('hunyuan-large', '腾讯 Hunyuan-Large', NULL),
('hunyuan-standard', '腾讯 Hunyuan-Standard', NULL),
('qwen-7b', '阿里云 Qwen-7B', NULL),
('qwen-14b', '阿里云 Qwen-14B', NULL),
('qwen-max', '阿里云 Qwen-Max', NULL),
('qwen-turbo', '阿里云 Qwen-Turbo', NULL),
('pangu-3.0', '华为 Pangu-3.0', NULL),
('pangu-3.5', '华为 Pangu-3.5', NULL),
('doubao-lite', '字节跳动 Doubao-lite', NULL),
('doubao-pro', '字节跳动 Doubao-pro', NULL),
('doubao-vision', '字节跳动 Doubao-vision', NULL),
('spark-3.0', '科大讯飞 Spark-3.0', NULL),
('spark-4.0', '科大讯飞 Spark-4.0', NULL),
('spark-max', '科大讯飞 Spark-Max', NULL),
('chatglm-3', '智谱AI ChatGLM-3', NULL),
('chatglm-4', '智谱AI ChatGLM-4', NULL),
('glm-4-plus', '智谱AI GLM-4-Plus', NULL),
('sensenova-5.0', '商汤科技 SenseNova-5.0', NULL),
('sensenova-5.5', '商汤科技 SenseNova-5.5', NULL);