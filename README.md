# AgentBox

> 多模型 AI 聊天平台 — 一个问题，多个 AI 同时回答，对比选出最佳

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://openjdk.java.net/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-green.svg)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## 项目简介

**AgentBox** 是一个多模型 All-In-One AI 聊天平台，支持同时向多个大语言模型发送同一问题，实时对比不同 AI 的回答质量，并投票选出最佳回答。

**核心理念**：任何单一 AI 都可能产生幻觉，多个视角交叉验证，增强信心。

---

## 已实现功能

| 功能 | 说明 |
|------|------|
| **多模型并排对比** | 1-6 面板网格布局，同时向多个模型提问，实时流式对比 |
| **单模型对话** | 点击侧边栏模型进入独立聊天视图 |
| **会话管理** | 多会话支持，新建 / 切换 / 重命名 / 删除对话 |
| **联网搜索** | Web Search 开关，DuckDuckGo 搜索结果注入 LLM 上下文 |
| **模型投票排行** | 多模型对比时投票选最佳，个人模型胜率排行榜 |
| **AI 图片生成** | 基于硅基流动 FLUX 模型的文生图 |
| **AI 翻译** | 多语言互译工具面板 |
| **网页摘要** | 输入 URL 自动抓取并 AI 总结 |
| **用户认证** | 注册 / 登录 / JWT Token 鉴权 |
| **暗色模式** | 全局 Light / Dark 主题切换 |
| **Markdown 渲染** | 代码高亮 + 一键复制 + GFM 表格支持 |
| **对话导出** | 导出为 Markdown 文件 |

---

## 技术栈

### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| Spring Boot | 3.5.13 | Java 后端框架 |
| Spring AI | 1.1.4 | OpenAI 兼容接口集成 |
| MyBatis-Plus | 3.5.12 | ORM / 数据持久层 |
| PostgreSQL | 16 | 关系型数据库 |
| JWT (jjwt) | 0.11.5 | 用户认证 |

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| Next.js | 15.3 | React 全栈框架 (Turbopack) |
| React | 18 | UI 框架 |
| TypeScript | 5.8 | 类型安全 |
| Tailwind CSS | 3.4 | 原子化样式 |
| shadcn/ui + Radix | latest | 组件库 |
| Lucide | latest | 图标库 |
| react-markdown | 10 | Markdown 渲染 |

---

## 支持的 AI 模型

通过 [硅基流动 (SiliconFlow)](https://siliconflow.cn/) OpenAI 兼容接口统一调用：

| 厂商 | 模型 |
|------|------|
| 阿里 Qwen | Qwen3-8B, Qwen2.5-7B-Instruct, Qwen2.5-Coder-7B-Instruct |
| DeepSeek | DeepSeek-V3, DeepSeek-R1 (蒸馏版) |
| 智谱 AI | GLM-4-9B-Chat, GLM-Z1-9B |
| 书生 InternLM | InternLM2.5-7B-Chat |
| 01.AI | Yi-1.5-9B-Chat |

> 模型列表可通过 `migration_v4_siliconflow.sql` 自由扩展。

---

## 项目结构

```
AgentBox-Ai/
├── agentbox-platform/          # Spring Boot 后端
│   └── src/main/java/com/agentbox/platform/
│       ├── controllers/        # REST 控制器
│       ├── services/           # 业务逻辑 (ChatService, AuthService, ...)
│       ├── models/             # 实体类
│       ├── repositories/       # MyBatis-Plus Mapper
│       ├── dto/                # 请求/响应 DTO
│       ├── config/             # 安全、CORS 配置
│       └── security/           # JWT 过滤器
├── agentbox-frontend/          # Next.js 前端
│   └── src/
│       ├── app/                # 页面 (page.tsx, login, register)
│       ├── components/         # UI 组件
│       └── lib/                # 工具 (api, auth, theme)
├── migration_v*.sql            # 数据库迁移脚本 (v2~v7)
├── docker-compose.yml          # PostgreSQL 容器编排
└── README.md
```

---

## 快速开始

### 环境要求

| 软件 | 版本 |
|------|------|
| JDK | 17+ |
| Node.js | 20+ |
| PostgreSQL | 14+ |
| Maven | 3.8+ |

### 1. 克隆项目

```bash
git clone https://github.com/jacklove0903/agentbox.git
cd agentbox
```

### 2. 启动数据库

```bash
# 方式一：Docker
docker compose up -d

# 方式二：已有 PostgreSQL，创建数据库
createdb agentbox
```

### 3. 初始化数据库

按顺序执行 SQL 迁移脚本：

```bash
psql -d agentbox -f schema.sql
psql -d agentbox -f migration_v2_models.sql
psql -d agentbox -f migration_v3_users.sql
psql -d agentbox -f migration_v4_siliconflow.sql
psql -d agentbox -f migration_v5_image_generations.sql
psql -d agentbox -f migration_v6_conversations.sql
psql -d agentbox -f migration_v7_model_votes.sql
```

### 4. 配置后端

编辑 `agentbox-platform/src/main/resources/application.properties`：

```properties
# 数据库连接
spring.datasource.url=jdbc:postgresql://localhost:5432/agentbox
spring.datasource.username=postgres
spring.datasource.password=postgres123

# 硅基流动 API Key（必填）
spring.ai.openai.api-key=${SILICONFLOW_API_KEY}
spring.ai.openai.base-url=https://api.siliconflow.cn

# JWT 密钥（生产环境务必修改）
jwt.secret=${JWT_SECRET:change-me-to-a-long-random-secret-of-at-least-32-bytes}
```

### 5. 启动后端

```bash
cd agentbox-platform
mvn spring-boot:run
# 后端地址：http://localhost:8080
```

### 6. 启动前端

```bash
cd agentbox-frontend
npm install
npm run dev
# 前端地址：http://localhost:3000
```

### 7. 访问系统

打开 [http://localhost:3000](http://localhost:3000)，注册账号即可使用。

---

## API 接口

### 认证

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |

### 对话

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/chat/stream` | POST | 流式对话 (SSE) |
| `/api/chat/history` | POST | 获取对话历史 |

### 会话管理

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/conversations` | GET | 会话列表 |
| `/api/conversations` | POST | 新建会话 |
| `/api/conversations/{id}/title` | PUT | 重命名 |
| `/api/conversations/{id}` | DELETE | 删除会话 |

### 模型 & 投票

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/models/getmodels` | GET | 模型列表 |
| `/api/models/getmodelmap` | GET | 按厂商分组 |
| `/api/votes` | POST | 投票最佳回答 |
| `/api/votes/stats` | GET | 个人投票统计 |

### 工具

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/tools/translate` | POST | AI 翻译 |
| `/api/tools/summarize` | POST | 网页摘要 |
| `/api/tools/image/generate` | POST | 图片生成 |

---

## 后续计划

| 功能 | 优先级 | 状态 |
|------|--------|------|
| AI Enhance 提示词优化 | 中 | 计划中 |
| 图片 / 文件上传对话 | 中 | 计划中 |
| 会话标题智能生成 (LLM) | 低 | 计划中 |
| 移动端响应式适配 | 中 | 计划中 |
| Prompt 模板库 | 低 | 计划中 |
| 流式 Token 计数 | 低 | 计划中 |

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/xxx`)
3. 提交更改 (`git commit -m 'feat: xxx'`)
4. 推送到分支 (`git push origin feature/xxx`)
5. 开启 Pull Request

---

## 开源协议

[Apache License 2.0](LICENSE)

---

## 致谢

- [Spring AI](https://spring.io/projects/spring-ai)
- [MyBatis-Plus](https://baomidou.com/)
- [Next.js](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [SiliconFlow](https://siliconflow.cn/)
- [Tailwind CSS](https://tailwindcss.com/)

---

如果这个项目对你有帮助，请给一个 ⭐ Star！

