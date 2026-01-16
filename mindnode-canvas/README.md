# MindNode Canvas

一个基于无限画布的 AI 对话工具，将线性聊天转换为空间化的树状知识图谱。

## 功能特性

- 🎨 **无限画布** - 使用 React Flow 实现的可平移、缩放的无限画布
- 🤖 **AI 对话集成** - 支持流式 AI 响应，使用 Vercel AI SDK
- 🌳 **树状结构** - 将对话组织为父子节点的树状结构
- ✂️ **文本选择分支** - 选择任意文本创建精准的对话分支
- 💡 **智能建议** - AI 自动生成后续问题建议
- 📝 **Markdown 支持** - 完整的 Markdown 渲染和编辑
- 💾 **自动保存** - 实时同步到 Supabase，支持离线队列
- 📤 **导出功能** - 导出为结构化的 Markdown 文档
- 🔐 **用户认证** - 支持邮箱密码和 OAuth (Google, GitHub)
- 🎯 **工作区管理** - 多工作区支持，数据隔离

## 技术栈

- **前端框架**: Next.js 14+ (App Router)
- **画布引擎**: React Flow v11+
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **后端**: Supabase (PostgreSQL + Auth + Realtime)
- **AI 集成**: Vercel AI SDK + OpenAI
- **布局算法**: Dagre
- **测试**: Jest + React Testing Library + fast-check (PBT)

## 快速开始

### 1. 环境要求

- Node.js 18+ 
- pnpm (推荐) 或 npm/yarn
- Docker 和 Docker Compose (用于本地 Supabase)
- Supabase CLI
- OpenAI API Key

### 2. 克隆项目

```bash
git clone <repository-url>
cd mindnode-canvas
```

### 3. 安装依赖

```bash
pnpm install
```

### 4. 安装 Supabase CLI

```bash
# macOS/Linux
brew install supabase/tap/supabase

# 或使用 npm
npm install -g supabase

# 验证安装
supabase --version
```

### 5. 启动本地 Supabase

```bash
# 启动本地 Supabase (包含 PostgreSQL, Auth, Storage 等)
supabase start

# 等待服务启动完成，会显示以下信息：
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323
# anon key: eyJhbGc...
# service_role key: eyJhbGc...
```

启动成功后，记下显示的 `API URL` 和 `anon key`。

### 6. 配置环境变量

创建 `.env.local` 文件（参考 `.env.local.example`）：

```bash
# 本地 Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<从 supabase start 输出中复制 anon key>

# OpenAI 配置
OPENAI_API_KEY=sk-your-openai-api-key

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 获取 OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com)
2. 进入 API Keys 页面
3. 创建新的 API Key
4. 复制 key → `OPENAI_API_KEY`

### 7. 应用数据库迁移

数据库迁移文件已经在 `supabase/migrations/` 目录中，启动本地 Supabase 时会自动应用。

如果需要手动应用或重置数据库：

```bash
# 重置数据库（清空所有数据并重新应用迁移）
supabase db reset

# 查看迁移状态
supabase migration list

# 创建新的迁移（如果需要）
supabase migration new your_migration_name
```

你也可以通过 Supabase Studio 查看和管理数据库：
- 访问 http://localhost:54323
- 进入 SQL Editor 或 Table Editor

### 8. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 9. 创建账号并开始使用

1. 访问 `/signup` 创建账号
2. 登录后会自动创建默认工作区
3. 开始创建节点和 AI 对话！

### 10. 停止服务

```bash
# 停止本地 Supabase
supabase stop

# 停止并删除所有数据（谨慎使用）
supabase stop --no-backup
```

## 开发指南

### 项目结构

```
mindnode-canvas/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── api/               # API 路由
│   │   │   ├── ai/           # AI 生成和建议
│   │   │   ├── nodes/        # 节点 CRUD
│   │   │   └── workspaces/   # 工作区 CRUD
│   │   ├── login/            # 登录页面
│   │   ├── signup/           # 注册页面
│   │   └── page.tsx          # 主页（画布）
│   ├── components/            # React 组件
│   │   ├── CanvasWorkspace.tsx      # 主画布组件
│   │   ├── MindNodeComponent.tsx    # 节点组件
│   │   ├── SelectionToolbar.tsx     # 文本选择工具栏
│   │   ├── SuggestionBubbles.tsx    # AI 建议气泡
│   │   └── WorkspaceSidebar.tsx     # 工作区侧边栏
│   ├── hooks/                 # 自定义 Hooks
│   │   ├── useAIGeneration.ts       # AI 生成
│   │   ├── useTextSelection.ts      # 文本选择
│   │   └── useWorkspaces.ts         # 工作区管理
│   ├── lib/                   # 核心逻辑
│   │   ├── auth/             # 认证逻辑
│   │   ├── context/          # 上下文组装引擎
│   │   ├── export/           # 导出功能
│   │   ├── layout/           # 布局算法
│   │   ├── persistence/      # 数据持久化
│   │   └── supabase/         # Supabase 客户端
│   ├── store/                 # Zustand 状态管理
│   └── types/                 # TypeScript 类型定义
├── supabase/
│   └── migrations/            # 数据库迁移文件
└── __tests__/                 # 测试文件
```

### 可用脚本

```bash
# 开发
pnpm dev             # 启动开发服务器

# 构建
pnpm build           # 生产构建
pnpm start           # 启动生产服务器

# 测试
pnpm test            # 运行所有测试
pnpm test:watch      # 监听模式运行测试
pnpm test:coverage   # 生成测试覆盖率报告

# 代码质量
pnpm lint            # 运行 ESLint

# Supabase
supabase start       # 启动本地 Supabase
supabase stop        # 停止本地 Supabase
supabase status      # 查看服务状态
supabase db reset    # 重置数据库
supabase migration list  # 查看迁移状态
```

### 运行测试

项目包含 74 个测试用例，覆盖核心功能：

```bash
# 运行所有测试
pnpm test

# 监听模式（开发时使用）
pnpm test:watch

# 查看测试覆盖率
pnpm test:coverage
```

测试文件：
- `canvas.test.ts` - 画布和视口操作
- `context.test.ts` - 上下文组装和路径遍历
- `layout.test.ts` - Dagre 布局算法
- `ExportButton.test.tsx` - 导出功能
- `setup.test.ts` - 项目配置验证

## OAuth 配置（可选）

如果需要支持 Google 或 GitHub 登录，请参考 [AUTH_SETUP.md](./AUTH_SETUP.md) 进行配置。

### 快速配置 Google OAuth

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建 OAuth 2.0 凭据
3. 添加重定向 URI: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
4. 在 Supabase Dashboard > Authentication > Providers > Google 中配置

### 快速配置 GitHub OAuth

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 创建新的 OAuth App
3. 设置回调 URL: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
4. 在 Supabase Dashboard > Authentication > Providers > GitHub 中配置

## 使用说明

### 基本操作

- **创建子节点**: 选中节点后按 `Tab`
- **创建兄弟节点**: 选中节点后按 `Enter`
- **编辑节点**: 双击节点进入编辑模式
- **平移画布**: 拖拽空白区域
- **缩放画布**: 鼠标滚轮
- **文本选择分支**: 选中节点内的文本，点击"AI Branch"按钮

### AI 对话

1. 创建子节点会自动触发 AI 响应
2. AI 会基于从根节点到当前节点的完整路径生成回复
3. 使用文本选择功能可以针对特定内容提问
4. AI 响应完成后会显示 3 个智能建议问题

### 工作区管理

- 点击左侧边栏的 "+" 创建新工作区
- 点击工作区名称切换工作区
- 每个工作区独立保存节点和画布状态

### 导出

- 点击右上角的导出按钮
- 选择导出整个工作区或单个分支
- 生成的 Markdown 文件保持树状结构（使用标题层级）

## 常见问题

### 1. "Missing Supabase environment variables" 错误

确保 `.env.local` 文件存在且包含正确的 Supabase 配置。修改后需要重启开发服务器。

### 2. Supabase 服务无法启动

```bash
# 检查 Docker 是否运行
docker ps

# 查看 Supabase 状态
supabase status

# 查看详细日志
supabase start --debug

# 如果端口被占用，可以停止并重启
supabase stop
supabase start
```

### 3. AI 响应失败

- 检查 `OPENAI_API_KEY` 是否正确
- 确认 OpenAI 账户有足够的额度
- 查看浏览器控制台的错误信息

### 4. 数据库连接失败

- 确认本地 Supabase 已启动 (`supabase status`)
- 检查 `.env.local` 中的 URL 是否为 `http://localhost:54321`
- 运行 `supabase db reset` 重新应用迁移
- 验证 RLS 策略是否正确配置

### 5. 数据库迁移问题

```bash
# 查看迁移状态
supabase migration list

# 重置数据库（会清空所有数据）
supabase db reset

# 手动应用特定迁移
supabase migration up
```

### 6. OAuth 登录失败（本地开发）

本地开发环境的 OAuth 配置需要额外设置：
- 在 OAuth 提供商中添加 `http://localhost:54321/auth/v1/callback` 作为回调 URL
- 在 Supabase Studio (http://localhost:54323) 的 Authentication > Providers 中配置
- 查看浏览器控制台的错误信息

### 7. 端口冲突

如果默认端口被占用，可以修改 `supabase/config.toml` 中的端口配置：

```toml
[api]
port = 54321  # API 端口

[db]
port = 54322  # PostgreSQL 端口

[studio]
port = 54323  # Studio 端口
```

## 性能优化

- **视口裁剪**: 只渲染可见区域的节点
- **React.memo**: 节点组件使用 memo 优化
- **防抖更新**: 节点位置更新使用 2 秒防抖
- **批量操作**: 多个节点更新合并为单个事务
- **离线队列**: 网络断开时本地缓存操作

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT

## 相关文档

- [认证配置指南](./AUTH_SETUP.md)
- [技术规格文档](../.kiro/specs/mindnode-canvas/design.md)
- [需求文档](../.kiro/specs/mindnode-canvas/requirements.md)
- [实现任务列表](../.kiro/specs/mindnode-canvas/tasks.md)
