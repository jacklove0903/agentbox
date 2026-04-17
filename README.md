```
# AgentBox 🤖

> 多模型 AI 聊天平台 - 一个问题，多个 AI 回答

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://openjdk.java.net/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.0-green.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

---

## ✨ 项目简介

**AgentBox** 是一个多模型 AI 聊天平台，类似 [ChatHub](https://chathub.gg/)，支持同时调用多个大语言模型，对比不同 AI 的回答质量。

> 🎯 **核心理念**：任何单一 AI 都可能产生幻觉，获得多个视角，增强信心。

---

## 🚀 功能特性

| 功能 | 说明 |
|------|------|
| 🔄 **多模型对比** | 同时调用 8 家厂商 20+ 模型，对比回答质量 |
| 💬 **智能对话** | 流式响应，打字机效果，实时显示 |
| 📄 **文档分析** | 上传 PDF/Word 文档，AI 智能分析 |
| 🧠 **知识库 RAG** | 基于向量检索的增强生成 |
| 📊 **会话管理** | 历史对话记录，多轮对话记忆 |
| 🎨 **现代 UI** | React + Ant Design 精美界面 |

---

## 🛠️ 技术栈

### 后端
| 技术 | 版本 | 说明 |
|------|------|------|
| **框架** | Spring Boot 3.2.0 | Java 后端框架 |
| **ORM** | MyBatis-Plus 3.5.5 | 数据持久层 |
| **AI 框架** | Spring AI Alibaba 1.1.2 | 大模型集成 |
| **数据库** | PostgreSQL 16 | 关系型数据库 |
| **向量库** | PGVector | 向量检索 |
| **缓存** | Redis | 会话缓存 |

### 前端
| 技术 | 版本 | 说明 |
|------|------|------|
| **框架** | React 18 | UI 框架 |
| **语言** | TypeScript | 类型安全 |
| **UI 库** | Ant Design | 组件库 |
| **构建** | Vite | 快速构建 |

### 运维
| 技术 | 说明 |
|------|------|
| **Docker** | 容器化部署 |
| **Docker Compose** | 服务编排 |

---

## 📁 项目结构
```


## 🚀 快速开始

### 环境要求

| 软件 | 版本 | 说明 |
|------|------|------|
| JDK | 17+ | Java 运行环境 |
| Node.js | 20+ | 前端运行环境 |
| Docker | 最新 | 容器化部署 |
| Maven | 3.8+ | 构建工具 |

### 1. 克隆项目

```bash
git clone https://github.com/jacklove0903/agentbox.git
cd agentbox
```

### 2. 启动依赖服务

```
# 启动 PostgreSQL + Redis
docker compose up -d

# 查看服务状态
docker compose ps
```

### 3. 启动后端

```
cd agentbox-platform

# 修改数据库配置（src/main/resources/application.yml）
# 启动后端
mvn spring-boot:run

# 后端地址：http://localhost:8080
```

### 4. 启动前端

```
cd agentbox-frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 前端地址：http://localhost:5173
```

### 5. 访问系统

打开浏览器访问：[http://localhost:5173](http://localhost:5173/)

---

## 📊 支持的 AI 模型

| 厂商     | 模型                                    | 状态 |
| ---------- | ----------------------------------------- | ------ |
| 阿里云   | Qwen-Max, Qwen-Turbo, Qwen-7B, Qwen-14B | ✅   |
| 百度     | Ernie-3.5, Ernie-4.0, Ernie-Speed       | ✅   |
| 腾讯     | Hunyuan-Turbo, Hunyuan-Large            | ✅   |
| 华为     | Pangu-3.0, Pangu-3.5                    | ✅   |
| 字节     | Doubao-Pro, Doubao-Lite, Doubao-Vision  | ✅   |
| 智谱 AI  | ChatGLM-3, ChatGLM-4, GLM-4-Plus        | ✅   |
| 科大讯飞 | Spark-3.0, Spark-4.0, Spark-Max         | ✅   |
| 商汤     | SenseNova-5.0, SenseNova-5.5            | ✅   |

---

## 🔧 配置说明

### 后端配置 (application.yml)

```
server:
  port: 8080

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/agentbox
    username: postgres
    password: postgres123
    driver-class-name: org.postgresql.Driver

  data:
    redis:
      host: localhost
      port: 6379

# Spring AI 配置
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}  # 从环境变量读取
```

### 环境变量

```
# .env 文件（不提交到 Git）
DASHSCOPE_API_KEY=your-api-key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agentbox
DB_USERNAME=postgres
DB_PASSWORD=postgres123
```

---

## 📸 项目截图

> 待添加...

---

## 🔌 API 接口

| 接口                   | 方法 | 说明         |
| ------------------------ | ------ | -------------- |
| `/api/models`      | GET  | 获取所有模型 |
| `/api/models/{id}` | GET  | 获取单个模型 |
| `/api/chat`        | POST | 发送对话消息 |
| `/api/chat/stream` | POST | 流式对话     |
| `/api/documents`   | POST | 上传文档     |
| `/api/knowledge`   | GET  | 知识库检索   |

---

## 🧪 开发指南

### 添加新模型

1. 在 `models` 表添加记录
2. 配置 API Key
3. 前端添加模型图标

### 自定义功能

```
# 后端开发
cd agentbox-platform
mvn spring-boot:run

# 前端开发
cd agentbox-frontend
npm run dev
```

---

## 📋 待办事项

| 功能       | 优先级 | 状态 |
| ------------ | -------- | ------ |
| 多模型对比 | 🔴 高  | ⬜   |
| 流式响应   | 🔴 高  | ⬜   |
| 知识库 RAG | 🔴 高  | ⬜   |
| 会话历史   | 🟡 中  | ⬜   |
| 文档上传   | 🟡 中  | ⬜   |
| 用户系统   | 🟢 低  | ⬜   |

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📝 开源协议

Apache License 2.0 - 详见 <span data-type="inline-memo" data-inline-memo-content="Blocked URL: LICENSE">LICENSE [blocked]</span> 文件

---

## 👨‍💻 作者

|        |                                               |
| -------- | ----------------------------------------------- |
| GitHub | [@jacklove0903](https://github.com/jacklove0903) |
| 邮箱   | (待添加)                                      |

---

## 🙏 致谢

* [Spring AI](https://spring.io/projects/spring-ai)
* [MyBatis-Plus](https://baomidou.com/)
* [React](https://reactjs.org/)
* [Ant Design](https://ant.design/)
* [PGVector](https://github.com/pgvector/pgvector)

---

如果这个项目对你有帮助，请给一个 ⭐ Star！

[返回顶部](http://127.0.0.1:49907/c/019d859f-3e91-70e9-a249-bf900f322727#agentbox-)

```

```

