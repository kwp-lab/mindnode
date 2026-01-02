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
- npm 或 yarn
- Supabase 账号
- OpenAI API Key

### 2. 克隆项目

```bash
git clone <repository-url>
cd mindnode-canvas
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置环境变量

创建 `.env.local` 文件（参考 `.env.local.example`）：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI 配置
OPENAI_API_KEY=sk-your-openai-api-key

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 获取 Supabase 配置

1. 访问 [Supabase](https://supabase.com) 并创建新项目
2. 进入项目设置 > API
3. 复制以下信息：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 获取 OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com)
2. 进入 API Keys 页面
3. 创建新的 API Key
4. 复制 key → `OPENAI_API_KEY`

### 5. 设置数据库

#### 方法 1: 使用 Supabase Dashboard (推荐)

1. 进入 Supabase 项目的 SQL Editor
2. 依次运行以下迁移文件：

**第一步：创建表和 RLS 策略**
```sql
-- 复制 supabase/migrations/20241227000001_create_workspaces_and_nodes.sql 的内容
-- 粘贴到 SQL Editor 并执行
```

**第二步：配置认证**
```sql
-- 复制 supabase/migrations/20241228000001_configure_auth.sql 的内容
-- 粘贴到 SQL Editor 并执行
```

#### 方法 2: 使用 Supabase CLI

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接到你的项目
supabase link --project-ref your-project-ref

# 推送迁移
supabase db push
```

### 6. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 7. 创建账号并开始使用

1. 访问 `/signup` 创建账号
2. 登录后会自动创建默认工作区
3. 开始创建节点和 AI 对话！

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
npm run dev          # 启动开发服务器

# 构建
npm run build        # 生产构建
npm run start        # 启动生产服务器

# 测试
npm test             # 运行所有测试
npm run test:watch   # 监听模式运行测试
npm run test:coverage # 生成测试覆盖率报告

# 代码质量
npm run lint         # 运行 ESLint
```

### 运行测试

项目包含 74 个测试用例，覆盖核心功能：

```bash
# 运行所有测试
npm test

# 监听模式（开发时使用）
npm run test:watch

# 查看测试覆盖率
npm run test:coverage
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

### 2. AI 响应失败

- 检查 `OPENAI_API_KEY` 是否正确
- 确认 OpenAI 账户有足够的额度
- 查看浏览器控制台的错误信息

### 3. 数据库连接失败

- 确认 Supabase 项目 URL 和 Key 正确
- 检查数据库迁移是否已执行
- 验证 RLS 策略是否正确配置

### 4. OAuth 登录失败

- 确认 OAuth 提供商的回调 URL 配置正确
- 检查 Supabase Dashboard 中 OAuth 提供商是否已启用
- 查看浏览器控制台的错误信息

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
