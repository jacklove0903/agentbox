# AgentBox - AI 聊天应用

一个现代化的AI聊天应用，支持多模型并行对话，采用简约黑白灰设计风格。

## 功能特性

- **多模型并行聊天** - 同时与多个AI模型对话（GPT-5.4、Claude Sonnet、Gemini等）
- **灵活布局** - 支持1-6列的网格布局，适应不同使用场景
- **响应式设计** - 侧边栏可折叠，界面美观现代
- **简约黑白灰设计** - 专业、优雅的视觉风格
- **功能扩展** - 预留Web搜索和图像生成功能

## 技术栈

- **前端框架**: Next.js 15.3.7 + React 18.3.1
- **样式方案**: Tailwind CSS 3.4.17 + Shadcn UI 组件库
- **UI组件**: Radix UI (对话框、下拉菜单、滚动区域、工具提示等)
- **图标库**: Lucide React
- **编程语言**: TypeScript

## 快速开始

### 环境要求

- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

应用将在 http://localhost:3000 启动。

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

## 项目结构

```
src/
├── app/             # Next.js App Router
│   ├── page.tsx     # 主页面
│   ├── layout.tsx   # 布局组件
│   └── globals.css  # 全局样式
├── components/      # 组件目录
│   ├── ui/          # Shadcn UI基础组件
│   ├── ChatInput.tsx       # 聊天输入框
│   ├── ChatPanel.tsx       # 聊天面板
│   ├── SideBar.tsx         # 侧边栏
│   └── WelcomeDialog.tsx   # 欢迎对话框
└── lib/             # 工具库
    └── utils.ts     # 工具函数
```

## 使用指南

### 选择AI模型

1. 在侧边栏的"Models"部分，点击模型名称即可添加或移除模型
2. 最多可同时选择6个模型进行并行对话

### 调整布局

1. 在侧边栏的"All-In-One"部分，选择不同的布局选项
2. 支持1列、2列、3列、4列（2x2）和6列（3x2）布局

### 发送消息

1. 在底部的输入框中输入消息
2. 按Enter键或点击发送按钮
3. 消息会同时发送给所有选中的AI模型
4. 每个模型会独立生成响应

### 功能切换

- **Web搜索** - 开启后，AI可以使用网络搜索获取最新信息
- **图像生成** - 开启后，可以生成和处理图像内容

## 开发计划

### 待实现功能

1. **AI模型API集成** - 连接实际的AI模型API
2. **用户认证系统** - 实现注册和登录功能
3. **消息历史记录** - 持久化存储聊天记录
4. **Web搜索功能** - 集成搜索引擎
5. **图像生成功能** - 集成图像生成API
6. **深色模式** - 添加主题切换功能
7. **文档管理** - 支持上传和处理文档
8. **支持系统** - 集成客服支持功能

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

---

**AgentBox** - 让AI对话更高效、更智能！