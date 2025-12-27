# Implementation Plan: MindNode Canvas

## Overview

This implementation plan breaks down the MindNode Canvas feature into incremental, testable tasks. The approach follows a bottom-up strategy: starting with core data structures and algorithms, then building UI components, and finally integrating AI capabilities. Each task builds on previous work, ensuring continuous validation through tests.

## Tasks

- [-] 1. Project Setup and Core Infrastructure
  - Initialize Next.js 14+ project with App Router
  - Configure TypeScript, Tailwind CSS, and ESLint
  - Set up Supabase client and environment variables
  - Install dependencies: React Flow, Zustand, Vercel AI SDK, fast-check, react-markdown
  - Configure testing framework (Jest + React Testing Library)
  - _Requirements: 13.1, 13.2_

- [ ] 2. Database Schema and Models
  - [ ] 2.1 Create Supabase database schema
    - Create workspaces table with RLS policies
    - Create nodes table with indexes
    - Set up foreign key relationships and cascade deletes
    - _Requirements: 7.1, 7.4, 10.1, 12.3_

  - [ ] 2.2 Implement TypeScript data models
    - Define Workspace, MindNode, and Edge interfaces
    - Create type guards and validation functions
    - _Requirements: 2.1, 2.2, 3.1_

  - [ ]* 2.3 Write property test for cascade deletion
    - **Property 7: Cascade Deletion Completeness**
    - **Validates: Requirements 2.6**

- [ ] 3. Context Assembly Engine
  - [ ] 3.1 Implement path traversal algorithm
    - Write assembleContext function to traverse from node to root
    - Handle edge cases (orphaned nodes, circular references)
    - _Requirements: 3.2, 5.1_

  - [ ]* 3.2 Write property test for context path ordering
    - **Property 8: Context Path Ordering**
    - **Validates: Requirements 3.2, 5.1**

  - [ ] 3.3 Implement prompt construction logic
    - Write buildAIPrompt function with context path and selection source
    - Handle token limit truncation strategy
    - _Requirements: 4.4, 5.2_

  - [ ]* 3.4 Write property test for selection branch context inclusion
    - **Property 9: Selection Branch Context Inclusion**
    - **Validates: Requirements 4.2, 4.4, 5.2**

  - [ ]* 3.5 Write property test for sibling branch exclusion
    - **Property 10: Sibling Branch Exclusion**
    - **Validates: Requirements 5.3**

- [ ] 4. State Management with Zustand
  - [ ] 4.1 Create canvas slice (nodes, edges, viewport)
    - Implement addNode, updateNode, deleteNode actions
    - Implement viewport management (pan, zoom)
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [ ] 4.2 Create AI slice (generation state)
    - Implement startGeneration, stopGeneration actions
    - Track generating nodes
    - _Requirements: 3.1, 3.3_

  - [ ] 4.3 Create selection slice (text selection state)
    - Implement setSelection, clearSelection actions
    - Store selected text and position
    - _Requirements: 4.1, 4.5_

  - [ ] 4.4 Create workspace slice
    - Implement workspace switching logic
    - Handle workspace CRUD operations
    - _Requirements: 7.1, 7.2_

  - [ ]* 4.5 Write property test for node modification persistence
    - **Property 12: Node Modification Persistence**
    - **Validates: Requirements 7.3, 10.2**

- [ ] 5. Checkpoint - Core Logic Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Layout Engine with Dagre
  - [ ] 6.1 Implement automatic layout algorithm
    - Integrate Dagre for tree layout
    - Configure node spacing and direction (LR)
    - _Requirements: 8.1_

  - [ ]* 6.2 Write property test for layout non-overlap invariant
    - **Property 5: Layout Non-Overlap Invariant**
    - **Validates: Requirements 2.3, 8.2**

  - [ ] 6.3 Implement manual position preservation
    - Track manually positioned nodes
    - Adjust only descendants during re-layout
    - _Requirements: 8.3_

  - [ ]* 6.4 Write property test for manual position preservation
    - **Property 13: Manual Position Preservation**
    - **Validates: Requirements 8.3**

- [ ] 7. Canvas Component with React Flow
  - [ ] 7.1 Create CanvasWorkspace component
    - Initialize React Flow with custom node types
    - Implement pan and zoom controls
    - Handle viewport state synchronization
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 7.2 Write property test for viewport culling correctness
    - **Property 2: Viewport Culling Correctness**
    - **Validates: Requirements 1.3**

  - [ ]* 7.3 Write property test for zoom focal point preservation
    - **Property 1: Zoom Focal Point Preservation**
    - **Validates: Requirements 1.2**

  - [ ] 7.4 Implement keyboard shortcuts (Tab, Enter)
    - Handle Tab to create child node
    - Handle Enter to create sibling node
    - _Requirements: 2.1, 2.2_

  - [ ]* 7.5 Write property tests for node creation shortcuts
    - **Property 3: Tab Creates Child Node**
    - **Property 4: Enter Creates Sibling Node**
    - **Validates: Requirements 2.1, 2.2**

- [ ] 8. Node Component
  - [ ] 8.1 Create MindNodeComponent with view/edit modes
    - Implement Markdown rendering with react-markdown
    - Implement edit mode with textarea
    - Handle mode switching on double-click
    - _Requirements: 2.4, 9.1, 9.2_

  - [ ]* 8.2 Write property test for Markdown round-trip preservation
    - **Property 6: Markdown Round-Trip Preservation**
    - **Validates: Requirements 2.4, 9.4**

  - [ ] 8.3 Implement XSS sanitization with DOMPurify
    - Sanitize Markdown HTML output
    - Configure allowed tags and attributes
    - _Requirements: 9.5_

  - [ ]* 8.4 Write property test for XSS sanitization safety
    - **Property 14: XSS Sanitization Safety**
    - **Validates: Requirements 9.5**

  - [ ] 8.5 Implement node visual states (user/ai/selected/editing)
    - Apply distinct styling based on node type
    - Show selection highlight
    - Display edit and loading indicators
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ]* 8.6 Write unit tests for node visual states
    - Test user node styling
    - Test AI node styling
    - Test selection highlight
    - Test edit mode indicator
    - Test loading animation
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 9. Checkpoint - UI Components Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Text Selection and Floating Toolbar
  - [ ] 10.1 Implement text selection detection hook
    - Use selectionchange event to detect text selection
    - Calculate selection position with getBoundingClientRect
    - Filter selections within node boundaries
    - _Requirements: 4.1_

  - [ ] 10.2 Create SelectionToolbar component
    - Position toolbar near selection
    - Provide "AI Branch" button
    - Handle click outside to dismiss
    - _Requirements: 4.1, 4.2_

  - [ ] 10.3 Implement selection branch creation
    - Create child node with selectionSource field
    - Trigger AI generation with selected text
    - _Requirements: 4.2, 4.3_

  - [ ]* 10.4 Write unit tests for selection toolbar
    - Test toolbar appears on text selection
    - Test toolbar positioning
    - Test branch creation on button click
    - _Requirements: 4.1, 4.2_

- [ ] 11. AI Integration with Vercel AI SDK
  - [ ] 11.1 Create AI generation API route (/api/ai/generate)
    - Implement POST handler with streaming support
    - Integrate OpenAI with Vercel AI SDK
    - Use buildAIPrompt for context assembly
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 11.2 Create AI generation hook (useAIGeneration)
    - Use useChat hook from Vercel AI SDK
    - Handle streaming token updates
    - Update node content in real-time
    - _Requirements: 3.3_

  - [ ] 11.3 Implement error handling for AI requests
    - Display error messages in nodes
    - Provide retry button
    - Log errors to monitoring service
    - _Requirements: 3.5, 15.1_

  - [ ]* 11.4 Write unit tests for AI error handling
    - Test rate limit error display
    - Test timeout error display
    - Test retry button functionality
    - _Requirements: 3.5, 15.1_

- [ ] 12. AI Suggestion Engine
  - [ ] 12.1 Create suggestions API route (/api/ai/suggestions)
    - Implement POST handler for suggestion generation
    - Generate 3 suggestions with 15-char limit
    - Use context path for intelligent suggestions
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ]* 12.2 Write property test for suggestion length constraint
    - **Property 11: Suggestion Length Constraint**
    - **Validates: Requirements 6.5**

  - [ ] 12.3 Create SuggestionBubbles component
    - Display 3 suggestion bubbles near AI nodes
    - Handle click to create branch
    - Animate appearance after generation
    - _Requirements: 6.3, 6.4_

  - [ ]* 12.4 Write unit tests for suggestion bubbles
    - Test bubble rendering
    - Test click creates branch
    - Test animation timing
    - _Requirements: 6.3, 6.4_

- [ ] 13. Checkpoint - AI Features Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Workspace Management
  - [ ] 14.1 Create workspace API routes
    - Implement GET /api/workspaces (list user workspaces)
    - Implement POST /api/workspaces (create workspace)
    - Implement DELETE /api/workspaces/[id] (delete workspace)
    - _Requirements: 7.1, 7.4, 7.5_

  - [ ] 14.2 Create WorkspaceSidebar component
    - Display list of workspaces
    - Handle workspace selection
    - Provide create and delete actions
    - _Requirements: 7.5_

  - [ ] 14.3 Implement workspace switching logic
    - Load workspace nodes and edges
    - Restore viewport state
    - Clear current canvas before loading
    - _Requirements: 7.2_

  - [ ]* 14.4 Write property test for workspace state round-trip
    - **Property 15: Workspace State Round-Trip**
    - **Validates: Requirements 10.3**

  - [ ]* 14.5 Write property test for user workspace isolation
    - **Property 17: User Workspace Isolation**
    - **Validates: Requirements 12.3**

- [ ] 15. Data Persistence and Synchronization
  - [ ] 15.1 Implement real-time node persistence
    - Debounce node updates (2 second delay)
    - Batch multiple updates into single transaction
    - Use optimistic updates for UI responsiveness
    - _Requirements: 10.1, 10.2_

  - [ ] 15.2 Implement offline queue with IndexedDB
    - Queue failed operations locally
    - Retry with exponential backoff
    - Sync when connection restores
    - _Requirements: 10.4_

  - [ ] 15.3 Create sync status indicator
    - Display synced/syncing/error states
    - Show connection status
    - _Requirements: 10.5_

  - [ ]* 15.4 Write unit tests for sync status indicator
    - Test synced state display
    - Test syncing state display
    - Test error state display
    - _Requirements: 10.5_

- [ ] 16. Export Functionality
  - [ ] 16.1 Implement Markdown export logic
    - Traverse tree and generate hierarchical Markdown
    - Map tree depth to heading levels
    - Preserve node content and formatting
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 16.2 Write property test for export tree structure preservation
    - **Property 16: Export Tree Structure Preservation**
    - **Validates: Requirements 11.2, 11.3**

  - [ ] 16.3 Create export UI
    - Add export button to workspace toolbar
    - Provide download link for Markdown file
    - Support exporting individual branches
    - _Requirements: 11.4, 11.5_

  - [ ]* 16.4 Write unit tests for export UI
    - Test export button triggers download
    - Test branch export functionality
    - _Requirements: 11.4, 11.5_

- [ ] 17. Authentication with Supabase
  - [ ] 17.1 Set up Supabase Auth
    - Configure email/password authentication
    - Set up OAuth providers (Google, GitHub)
    - Implement RLS policies for workspaces and nodes
    - _Requirements: 12.1, 12.2, 12.5_

  - [ ] 17.2 Create authentication pages
    - Create sign-up page
    - Create login page
    - Create logout functionality
    - _Requirements: 12.1, 12.2, 12.4_

  - [ ] 17.3 Implement protected routes
    - Redirect unauthenticated users to login
    - Load user session on app initialization
    - _Requirements: 12.3_

  - [ ]* 17.4 Write unit tests for authentication flows
    - Test sign-up flow
    - Test login flow
    - Test logout flow
    - Test OAuth flow
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

- [ ] 18. Error Handling and Validation
  - [ ] 18.1 Implement input validation
    - Validate node content (non-empty)
    - Validate workspace title (length limits)
    - Prevent circular parent references
    - _Requirements: 15.4_

  - [ ] 18.2 Implement network error handling
    - Detect online/offline status
    - Display connection indicator
    - Enable offline mode
    - _Requirements: 15.3_

  - [ ] 18.3 Implement database error handling
    - Handle connection failures
    - Handle write conflicts
    - Display user-friendly error messages
    - _Requirements: 15.2_

  - [ ]* 18.4 Write unit tests for error handling
    - Test validation error display
    - Test network error handling
    - Test database error handling
    - _Requirements: 15.2, 15.3, 15.4_

- [ ] 19. Performance Optimization
  - [ ] 19.1 Implement viewport culling
    - Only render nodes within viewport bounds
    - Use React.memo for node components
    - Implement custom comparison function
    - _Requirements: 13.4_

  - [ ] 19.2 Optimize state management
    - Use Zustand selectors for efficient subscriptions
    - Memoize derived state (visible nodes)
    - Implement shallow equality checks
    - _Requirements: 13.1_

  - [ ] 19.3 Optimize AI streaming
    - Chunk token updates (every 50ms)
    - Implement backpressure handling
    - Cancel in-flight requests on navigation
    - _Requirements: 13.2_

  - [ ]* 19.4 Write performance tests
    - Test canvas performance with 100 nodes
    - Test streaming doesn't block UI
    - Test interaction responsiveness
    - _Requirements: 13.1, 13.2, 13.3_

- [ ] 20. Final Integration and Polish
  - [ ] 20.1 Integrate all components into main app
    - Wire canvas, sidebar, and toolbar together
    - Ensure proper data flow between components
    - Test complete user workflows
    - _Requirements: All_

  - [ ] 20.2 Add loading states and transitions
    - Implement skeleton loaders
    - Add smooth transitions for layout changes
    - Improve perceived performance
    - _Requirements: 13.3_

  - [ ] 20.3 Implement responsive design
    - Ensure mobile compatibility
    - Add touch gesture support
    - Optimize for different screen sizes
    - _Requirements: 1.5_

  - [ ]* 20.4 Write integration tests
    - Test complete conversation flow
    - Test workspace switching
    - Test export flow
    - Test offline mode
    - _Requirements: All_

- [ ] 21. Final Checkpoint - Complete System
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
