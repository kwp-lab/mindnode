# Project Structure

## Directory Organization

```
mindnode-canvas/
├── src/
│   ├── app/                    # Next.js App Router (pages & API routes)
│   ├── components/             # React components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Core business logic
│   ├── store/                  # Zustand state management
│   └── types/                  # TypeScript type definitions
├── supabase/                   # Supabase configuration & migrations
├── public/                     # Static assets
└── __tests__/                  # Test files (legacy location, prefer src/__tests__)
```

## Key Directories

### `src/app/`
Next.js App Router structure with file-based routing:
- `api/` - API route handlers (AI, nodes, workspaces, projects)
- `auth/` - Authentication callback routes
- `ws/` - Workspace-scoped pages (dashboard, canvas)
- `login/`, `signup/` - Auth pages
- `page.tsx` - Landing/home page
- `layout.tsx` - Root layout with providers

### `src/components/`
React components organized by feature:
- `CanvasWorkspace.tsx` - Main infinite canvas component
- `MindNodeComponent.tsx` - Individual node rendering
- `SelectionToolbar.tsx` - Text selection floating toolbar
- `SuggestionBubbles.tsx` - AI suggestion UI
- `WorkspaceSidebar.tsx` - Workspace navigation
- `ui/` - Shadcn UI components (button, input, dropdown, etc.)

### `src/hooks/`
Custom React hooks for feature logic:
- `useAIGeneration.ts` - AI streaming and generation
- `useTextSelection.ts` - Text selection detection
- `useWorkspaces.ts` - Workspace CRUD operations
- `useProjects.ts` - Project management
- `useSuggestions.ts` - AI suggestion generation
- `useNetworkStatus.ts` - Online/offline detection

### `src/lib/`
Core business logic modules:
- `auth/` - Authentication logic (client & server)
- `context/` - Context assembly engine (path traversal)
- `export/` - Markdown export functionality
- `layout/` - Dagre-based auto-layout algorithms
- `persistence/` - Offline queue & sync management
- `supabase/` - Supabase client setup & database types
- `viewport/` - Viewport culling for performance

### `src/store/`
Zustand store with sliced architecture:
- `index.ts` - Main store with Canvas, AI, Selection, Workspace, and Layout slices
- Uses Immer middleware for immutable updates
- Exports optimized selectors to prevent unnecessary re-renders

### `src/types/`
TypeScript type definitions:
- `index.ts` - Core types (MindNode, Edge, Workspace, Project)
- Type guards and validation functions
- Utility functions for edge creation and derivation

## Architectural Patterns

### State Management
- **Zustand** for global state with slice pattern
- **Immer** middleware for immutable updates
- Optimized selectors using `useShallow` to prevent re-renders
- Separate action selectors for efficient subscriptions

### Data Flow
1. User interaction → Component
2. Component → Zustand action
3. Action updates store (with validation)
4. Store change → Component re-render (via selector)
5. Persistence hook → Supabase sync (debounced)

### Context Assembly (Core Algorithm)
When AI generates a response:
1. Traverse from current node up to root
2. Collect all ancestor node content
3. Assemble into ordered context path
4. Include selection source if branch was from text selection
5. Send to AI with system prompt

### Component Patterns
- Use `React.memo` for node components (performance)
- Separate presentational and container components
- Custom hooks for complex logic extraction
- Shadcn UI for consistent design system

### API Routes
- RESTful conventions for CRUD operations
- Streaming responses for AI endpoints
- Server-side Supabase client for auth checks
- Error handling with typed error responses

## Naming Conventions

- **Files**: PascalCase for components (`MindNodeComponent.tsx`), camelCase for utilities (`useTextSelection.ts`)
- **Components**: PascalCase (`CanvasWorkspace`)
- **Hooks**: camelCase with `use` prefix (`useAIGeneration`)
- **Types**: PascalCase (`MindNode`, `NodeType`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_VIEWPORT`)
- **Functions**: camelCase (`createEdgeId`, `validateNode`)

## Testing Strategy

Tests located in `src/__tests__/`:
- `canvas.test.ts` - Canvas operations and viewport
- `context.test.ts` - Context assembly and path traversal
- `layout.test.ts` - Dagre layout algorithm
- `ExportButton.test.tsx` - Export functionality
- Property-based testing with fast-check for edge cases
