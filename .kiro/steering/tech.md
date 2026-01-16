# Technical Stack

## Frontend

- **Framework**: Next.js 14+ with App Router
- **UI Library**: React 19+
- **Canvas Engine**: React Flow v12+ (`@xyflow/react`)
- **State Management**: Zustand with Immer middleware
- **Styling**: Tailwind CSS 4 + Shadcn UI components
- **Icons**: Lucide React
- **Markdown**: react-markdown with remark-gfm

## Backend & Infrastructure

- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (email/password + OAuth)
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: IndexedDB (idb) for offline queue

## AI Integration

- **SDK**: Vercel AI SDK (`ai` package)
- **Provider**: OpenAI via `@ai-sdk/openai`
- **Features**: Streaming responses, context assembly

## Layout & Algorithms

- **Auto-layout**: Dagre for tree-based node positioning
- **Viewport Culling**: Custom viewport bounds calculation for performance

## Testing

- **Framework**: Jest with ts-jest
- **Testing Library**: React Testing Library
- **Property-Based Testing**: fast-check
- **Coverage**: 74 test cases covering core functionality

## Development Tools

- **Package Manager**: pnpm (recommended)
- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Next.js config
- **Local Backend**: Supabase CLI with Docker

## Common Commands

```bash
# Development
pnpm dev                 # Start Next.js dev server (port 3000)
pnpm build              # Production build
pnpm start              # Start production server

# Testing
pnpm test               # Run all tests
pnpm test:watch         # Watch mode for development
pnpm test:coverage      # Generate coverage report

# Code Quality
pnpm lint               # Run ESLint

# Supabase (Local Development)
supabase start          # Start local Supabase stack (Docker required)
supabase stop           # Stop local Supabase
supabase status         # Check service status
supabase db reset       # Reset database and reapply migrations
supabase migration list # View migration status
```

## Environment Setup

Required environment variables (`.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start>
OPENAI_API_KEY=sk-your-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Migrations

Migrations are in `supabase/migrations/` and auto-apply on `supabase start`. Key migrations:
- `20241227000001_create_workspaces_and_nodes.sql` - Core schema
- `20241228000001_configure_auth.sql` - Auth setup
- `20260103000001_create_projects_table.sql` - Projects feature

## Path Aliases

TypeScript path alias configured: `@/*` maps to `./src/*`
