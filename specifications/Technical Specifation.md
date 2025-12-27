这份项目说明书（Project Specification）专为 AI Coding Agent（如 Cursor, Windsurf, 或自定义 Agent）设计。它包含了项目背景、核心逻辑、数据结构以及功能模块，旨在让 Agent 能够理解“为什么这么做”以及“怎么写代码”。

---

# Project Specification: MindNode AI (暂定名)

## 1. 项目概述 (Project Overview)

**目标：** 开发一个基于无限画布（Infinite Canvas）的 AI 思维导图对话工具。
**核心价值：** 突破传统线性聊天限制，通过思维导图的树状结构组织 AI 对话，支持针对节点内特定文字进行划选分支（Selection-based Branching），实现深度逻辑拆解与知识建模。

---

## 2. 技术栈建议 (Technical Stack)

* **Frontend:** React.js / Next.js (App Router)
* **Canvas Engine:** `React Flow` 或 `Excalidraw` (推荐 React Flow，因为它对节点状态管理更友好)
* **State Management:** Zustand (轻量，适合处理复杂的树状结构)
* **Styling:** Tailwind CSS + Shadcn UI + lucide icons
* **Backend/Auth:** Supabase (PostgreSQL + Auth + Storage)
* **AI SDK:** Vercel AI SDK (支持流式传输与多模型接入)

---

## 3. 核心数据结构 (Core Data Model)

Coding Agent 需要理解节点之间的层级与上下文继承关系：

```typescript
interface MindNode {
  id: string;
  type: 'root' | 'ai' | 'user';
  data: {
    label: string; // 节点显示的文本 (Markdown)
    contextContent: string; // 完整的上下文内容
    selectionSource?: string; // 如果是从父节点划选生成的，记录原文
  };
  position: { x: number; y: number };
  parentId: string | null;
  workspaceId: string;
  createdAt: Date;
}

interface Edge {
  id: string;
  source: string; // 父节点 ID
  target: string; // 子节点 ID
}

```

---

## 4. 关键功能模块 (Key Modules)

### 4.1 无限画布交互 (Canvas Interaction)

* **节点创建：** * 选中节点按 `Tab`：在右侧创建子节点并自动进入编辑模式。
* 选中节点按 `Enter`：在下方创建同级节点。


* **布局引擎：** 引入 `dagre` 库实现自动布局，确保 AI 生成多个分支时节点不重叠。

### 4.2 AI 上下文组装逻辑 (Context Engine)

这是本产品的**核心算法**，Agent 需要实现以下逻辑：

* **路径溯源：** 当用户在某个节点触发 AI 时，系统必须回溯从 **Root -> ... -> Parent -> Current Node** 的所有文本。
* **Prompt 构造：**
```text
System: 你是一个逻辑分析专家。当前处于思维导图的深度探索中。
Context Path: [按顺序排列的路径节点文本]
User Selected Text: [如果是划选触发，放入此处]
User Question: [用户输入的新问题]
Instruction: 请基于上下文路径和特定划选内容进行针对性回复。

```



### 4.3 划词分支功能 (Selection-based Branching)

* **交互逻辑：** 在 AI 节点内选中一段文字时，弹出悬浮工具栏（Floating Toolbar）。
* **触发动作：** 点击“AI 分支”按钮后，创建一个带有 `selectionSource` 标记的新子节点，并自动调用 AI 接口。

### 4.4 工作区管理 (Workspace)

* **多工作区支持：** 基于 URL 路由区分 `workspace/[id]`。
* **持久化：** 实时同步节点位置、内容及折叠状态至数据库。

### 4.4 智能引导引擎 (AI Suggestion Engine) 

* **触发机制：** 当用户点击一个 AI 生成的节点，或节点生成完毕时，在节点下方/侧边静默展示 3 个微型建议气泡。

* **Prompt 逻辑：**

  * `Input`: 当前节点内容 + 完整溯源路径。

  * `Task`: 站在学习者的角度，预测用户可能存在的认知盲区或逻辑下一步。

  * `Constraint`: 建议需简洁（15字以内），具备启发性。

* **交互逻辑**： 点击建议气泡，直接以该建议为内容创建一个新的子节点并触发 AI 回复。

---

## 5. MVP 路线图 (MVP Roadmap for Agent)

### Phase 1: 基础骨架 (Canvas & Nodes)

* 搭建无限画布（React Flow）。
* 实现基础的 Tab / Enter 交互和节点 CRUD。
* 支持 Markdown 渲染。

### Phase 2: AI 对话与路径继承 (AI & Context)

* 接入 LLM 流式输出。
* 核心逻辑实现： 自动溯源当前路径并组装 Prompt。
* 实现基础的“点击节点生成回复”功能。

### Phase 3: 深度交互与引导 (Selection & Suggestions) - 重点

* 功能 A： 开发划词检测组件（Floating Toolbar）。
* 功能 B： 集成“建议生成”逻辑。在 AI 回复流结束时，后台异步请求 3 个建议并更新到节点数据中。
* UI 实现： 建议气泡的动效与点击即生成的交互。

### Phase 4: 知识库化与工作区 (Workspace & Export)

* Workspace 工作站管理。
* 一键导出结构化 Markdown 笔记。

---

## 6. 给 Coding Agent 的特别指令 (Instructions for AI Agent)

1. **保持原子化：** 请将 Canvas 渲染、AI 请求逻辑、状态管理分别拆分为独立的 Hooks 和组件。
2. **性能优先：** 在处理无限画布时，确保大规模节点下的渲染性能（使用 `React.memo`）。
3. **UI 规范：** 使用 Tailwind 进行响应式设计，节点样式需具备“呼吸感”，避免文字过密。
