# Product Overview

MindNode Canvas is an AI-powered infinite canvas tool that transforms linear chat conversations into spatial, tree-structured knowledge graphs.

## Core Value Proposition

Break free from linear chat limitations by organizing AI conversations as visual mind maps. Each thought becomes a node, each logic path becomes traceable, and context is preserved through spatial memory.

## Key Features

- **Infinite Canvas**: Pan, zoom, and organize thoughts spatially using React Flow
- **Tree-Structured Conversations**: Parent-child node relationships maintain logical flow
- **Precision Branching**: Select any text within a node to create focused sub-branches
- **AI Integration**: Streaming responses with automatic context assembly from node ancestry
- **Smart Suggestions**: AI generates 3 follow-up questions after each response
- **Workspace Management**: Multi-workspace support with isolated data per workspace
- **Export**: Convert mind maps to structured Markdown documents
- **Authentication**: Email/password and OAuth (Google, GitHub) via Supabase

## Target Users

- SaaS entrepreneurs mapping product features
- Researchers breaking down complex papers
- Content creators developing article outlines
- Developers designing system architecture
- Anyone tackling complex, multi-faceted problems

## Core Interaction Model

- `Tab` on a node: Create child node (triggers AI if parent is AI/user node)
- `Enter` on a node: Create sibling node
- Select text + click "AI Branch": Create focused sub-branch on selected content
- Double-click node: Enter edit mode
