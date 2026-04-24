# AgentBox

> 多模型 AI 聊天平台 — 一个问题，多个 AI 同时回答，对比选出最佳

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://openjdk.java.net/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-green.svg)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

## 🌐 在线体验

**👉 [http://118.31.71.208/](http://118.31.71.208/)**

> 注册即可使用，支持多模型并排对话、图片上传、AI 翻译、网页摘要等全部功能。

---

## 项目简介

**AgentBox** 是一个多模型 All-In-One AI 聊天平台，支持同时向多个大语言模型发送同一问题，实时流式对比不同 AI 的回答质量，并投票选出最佳回答。

**核心理念**：任何单一 AI 都可能产生幻觉，多个视角交叉验证，增强信心。

---

## ✨ 已实现功能

### 对话核心
| 功能 | 说明 |
|------|------|
| **多模型并排对比** | 1–6 面板网格布局，同时向多个模型提问，并行流式输出 |
| **多模态对话** | 支持图片上传（粘贴 / 拖拽 / 点击），视觉模型识图，非视觉模型收到图片时自动提示 |
| **思考模式 (Reasoning)** | 支持 Qwen3 系列的 `enable_thinking`，可切换深度思考 |
| **联网搜索** | Web Search 开关，搜索结果作为上下文注入 LLM |
| **单模型聊天** | 侧边栏点击模型进入独立对话视图 |

### 会话管理
| 功能 | 说明 |
|------|------|
| **多会话支持** | 新建 / 切换 / 重命名 / 删除对话 |
| **智能标题生成** | 首次对话后 LLM 异步生成会话标题（原子去重，并发安全） |
| **历史图片持久化** | 对话中上传的图片随消息持久化，切回会话依然展示 |

### 工具面板
| 功能 | 说明 |
|------|------|
| **AI 翻译** | 多语言实时互译，使用 `sort_order=1` 的默认模型，不污染对话列表 |
| **AI 图片生成** | 基于硅基流动 Kolors / FLUX 的文生图 |
| **网页摘要** | 输入 URL 自动抓取文本并 AI 总结 |
| **Prompt Enhancer** | 一键 AI 优化提示词（独立无状态调用） |
| **模型投票排行** | 多模型对比时投票，个人模型胜率排行榜 |

### 系统与体验
| 功能 | 说明 |
|------|------|
| **用户认证** | 注册 / 登录 / JWT Token 鉴权 |
| **暗色模式** | 全局 Light / Dark 主题切换 |
| **Markdown 渲染** | 代码高亮 + 一键复制 + GFM 表格 + 思考过程折叠 |
| **对话导出** | 导出为 Markdown 文件 |

---

## 🛠 技术栈

### 后端
| 技术 | 版本 |
|------|------|
| Spring Boot | 3.5.13 |
| Spring AI (OpenAI 兼容) | 1.1.4 |
| MyBatis-Plus | 3.5.12 |
| PostgreSQL + pgvector | 16 |
| JWT (jjwt) | 0.11.5 |

### 前端
| 技术 | 版本 |
|------|------|
| Next.js (App Router, Turbopack) | 15.3 |
| React | 18 |
| TypeScript | 5.8 |
| Tailwind CSS | 3.4 |
| shadcn/ui + Radix + Lucide | latest |
| react-markdown | 10 |

### 部署
| 组件 | 说明 |
|------|------|
| Docker Compose | Postgres / Backend / Frontend / Nginx 四件套 |
| Nginx | 反向代理 + 静态资源 + 上传体积限制 |

---

## 🤖 支持的 AI 模型

统一通过 [硅基流动 (SiliconFlow)](https://siliconflow.cn/) OpenAI 兼容接口调用：

| 厂商 | 代表模型 | 视觉 | 思考 |
|------|---------|------|------|
| 阿里 Qwen | Qwen3-8B, Qwen2.5-7B-Instruct, Qwen2.5-VL-7B | ✅ (VL) | ✅ (Qwen3) |
| DeepSeek | DeepSeek-V3.2, DeepSeek-R1 | | ✅ |
| 智谱 GLM | GLM-4-9B-Chat, GLM-4.5V | ✅ (V) | |
| 月之暗面 | Kimi K2 / K2.6 | | |
| MiniMax | MiniMax-M1 | | |

> 模型列表和 `supports_vision` 标志由 `models` 表驱动，可自由增删（见 `migration_v2/v8/v10`）。

---

## 📂 项目结构

```
AgentBox-Ai/
├── agentbox-platform/              # Spring Boot 后端
│   └── src/main/java/com/agentbox/platform/
│       ├── controllers/            # REST 控制器 (Chat / Auth / Tools / File / Vote / Model)
│       ├── services/               # 业务逻辑 (ChatService, ModelService, WebSummary…)
│       ├── models/                 # 实体 (Conversation, Message, UploadedFile, Model…)
│       ├── repositories/           # MyBatis-Plus Mapper
│       ├── dto/                    # 请求/响应 DTO
│       ├── config/                 # SecurityConfig / CORS
│       └── security/               # JwtUtil / JwtAuthFilter
├── agentbox-frontend/              # Next.js 前端
│   └── src/
│       ├── app/                    # 页面 + 根 layout + icon.svg
│       ├── components/             # ChatPanel / ChatInput / TranslatorPanel…
│       └── lib/                    # api / auth / theme
├── migration_v*.sql                # 数据库迁移（v2 ~ v11）
├── docker-compose.yml              # 开发环境（仅 Postgres）
├── docker-compose.prod.yml         # 生产环境（全栈）
├── deploy.sh                       # 服务器一键部署脚本
├── nginx/nginx.conf                # Nginx 反代配置
└── README.md
```

---

## 🚀 本地开发

### 环境要求
| 软件 | 版本 |
|------|------|
| JDK | 17+ |
| Node.js | 20+ |
| Docker | 20+ |
| Maven | 3.8+ |

### 1. 克隆并起数据库
```bash
git clone https://github.com/jacklove0903/agentbox.git
cd agentbox
docker compose up -d        # 启动 postgres (pgvector/pgvector:pg16)
```

### 2. 初始化数据库
```bash
# schema 初始化
docker exec -i agentbox-db psql -U postgres -d agentbox < schema.sql

# 按顺序执行所有 migration
for f in migration_v*.sql; do
  echo "-- $f"
  docker exec -i agentbox-db psql -U postgres -d agentbox < "$f"
done
```

### 3. 启动后端
```bash
cd agentbox-platform
# 配置硅基流动 API Key（可选：改 application.properties 或 export）
export SILICONFLOW_API_KEY=sk-xxx
mvn spring-boot:run
# → http://localhost:8080
```

### 4. 启动前端
```bash
cd agentbox-frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## 🐳 生产部署（Docker Compose）

服务器上一键部署：

```bash
git clone https://github.com/jacklove0903/agentbox.git
cd agentbox
chmod +x deploy.sh
./deploy.sh                 # 自动：拉代码 + 跑 migration + build + up
```

部署后访问 `http://<你的服务器IP>/`（nginx 监听 80，转发到 backend/frontend）。

### 脚本参数
| 参数 | 说明 |
|------|------|
| `./deploy.sh` | 完整流程（默认） |
| `./deploy.sh --skip-db` | 跳过数据库 migration |
| `./deploy.sh --no-cache` | 构建镜像时不使用缓存 |

> **注意**：`docker-compose.prod.yml` 目前硬编码了 DB 账号和 JWT_SECRET，生产环境建议改用 `.env` 或 Docker secret 管理。

---

## 📡 API 速览

### 对话
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/chat/stream` | POST | 多模型并行 SSE 流式对话（支持 `ephemeral`）|
| `/api/chat/history` | POST | 历史消息（含图片 URL）|
| `/api/chat/enhance` | POST | Prompt 增强（无状态）|

### 会话
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/conversations` | GET / POST | 列表 / 新建 |
| `/api/conversations/{id}/title` | PUT | 重命名 |
| `/api/conversations/{id}` | DELETE | 删除 |

### 认证 / 模型 / 投票
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register`, `/api/auth/login` | POST | 注册 / 登录 |
| `/api/models/getmodels` | GET | 启用模型列表（按 sort_order） |
| `/api/models/getmodelmap` | GET | 按厂商分组 |
| `/api/votes`, `/api/votes/stats` | POST / GET | 投票 / 个人统计 |

### 工具
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/tools/summarize` | POST | 网页摘要（SSE）|
| `/api/tools/image-gen` | POST | 文生图 |
| `/api/tools/image-gen/history` | GET | 图片历史 |
| `/api/files/upload` | POST | 图片上传（DB 存储，2MB，image/* 白名单） |
| `/api/files/{id}` | GET | 读取上传图片 |

---

## 🧭 后续计划

| 功能 | 优先级 | 状态 |
|------|--------|------|
| 上传中 loading 反馈 | 中 | 计划中 |
| 对话列表虚拟滚动 | 低 | 计划中 |
| 对话 / 消息软删除 + 回收站 | 中 | 计划中 |
| 消息搜索 | 中 | 计划中 |
| Prompt 模板库 | 低 | 计划中 |
| 移动端响应式适配 | 中 | 计划中 |
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
