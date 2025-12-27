# Requirements Document: MindNode Canvas

## Introduction

MindNode Canvas is an infinite canvas-based AI conversation tool that transforms linear chat interactions into spatial, tree-structured knowledge maps. The system enables users to conduct deep, branching conversations with AI by organizing dialogue as interconnected nodes on a canvas, supporting precision questioning through text selection, and maintaining logical context inheritance across conversation branches.

## Glossary

- **Canvas**: The infinite 2D workspace where mind map nodes are displayed and manipulated
- **Node**: A single unit of content (user input or AI response) displayed as a card on the canvas
- **Root_Node**: The starting node of a workspace's mind map tree
- **Branch**: A child node created from a parent node, inheriting its context
- **Selection_Branch**: A branch created by selecting specific text within a parent node
- **Context_Path**: The ordered sequence of nodes from root to current node, used for AI context
- **Workspace**: A container for a complete mind map project with its own node tree
- **Floating_Toolbar**: UI element that appears when text is selected within a node
- **AI_Suggestion**: System-generated question prompts displayed near AI nodes

## Requirements

### Requirement 1: Infinite Canvas Navigation

**User Story:** As a user, I want to navigate an infinite 2D canvas, so that I can organize my thoughts spatially without constraints.

#### Acceptance Criteria

1. WHEN a user drags the canvas, THE Canvas SHALL pan smoothly in any direction
2. WHEN a user scrolls with mouse wheel, THE Canvas SHALL zoom in and out with the cursor as focal point
3. WHEN the canvas contains nodes, THE Canvas SHALL render all visible nodes within the viewport
4. WHEN a user navigates to extreme positions, THE Canvas SHALL maintain performance without lag
5. THE Canvas SHALL support touch gestures for pan and zoom on mobile devices

### Requirement 2: Node Creation and Management

**User Story:** As a user, I want to create and organize nodes using keyboard shortcuts, so that I can quickly build my thought structure.

#### Acceptance Criteria

1. WHEN a user selects a node and presses Tab, THE System SHALL create a child node to the right and enter edit mode
2. WHEN a user selects a node and presses Enter, THE System SHALL create a sibling node below and enter edit mode
3. WHEN a node is created, THE System SHALL automatically position it to avoid overlapping with existing nodes
4. WHEN a user types in edit mode, THE Node SHALL display the content with Markdown rendering
5. WHEN a user clicks outside an editing node, THE System SHALL save the content and exit edit mode
6. WHEN a user deletes a node, THE System SHALL remove the node and all its descendants from the canvas

### Requirement 3: AI Conversation Integration

**User Story:** As a user, I want to trigger AI responses from any node, so that I can get contextual assistance at any point in my thought process.

#### Acceptance Criteria

1. WHEN a user creates a child node from an AI or user node, THE System SHALL automatically trigger an AI response
2. WHEN generating AI response, THE System SHALL assemble context from the complete path from root to current node
3. WHEN AI generates a response, THE System SHALL stream the output in real-time to the node
4. WHEN AI response is complete, THE System SHALL mark the node as type 'ai' and display it distinctly
5. IF AI request fails, THEN THE System SHALL display an error message and allow retry

### Requirement 4: Selection-Based Branching

**User Story:** As a user, I want to select specific text within any node and create a focused branch, so that I can drill down into particular details without losing context.

#### Acceptance Criteria

1. WHEN a user selects text within a node, THE System SHALL display a Floating_Toolbar near the selection
2. WHEN a user clicks "AI Branch" in the toolbar, THE System SHALL create a child node with the selected text as context
3. WHEN creating a selection branch, THE System SHALL store the selected text in the node's selectionSource field
4. WHEN AI responds to a selection branch, THE System SHALL include both the full context path and the specific selected text in the prompt
5. WHEN a user deselects text, THE Floating_Toolbar SHALL disappear after a brief delay

### Requirement 5: Context Inheritance and Path Assembly

**User Story:** As a system architect, I want each node to inherit context from its ancestors, so that AI responses remain logically consistent throughout deep conversations.

#### Acceptance Criteria

1. WHEN assembling context for AI, THE System SHALL traverse from root node to current node in order
2. WHEN a node has a selectionSource, THE System SHALL include it as highlighted context in the AI prompt
3. WHEN multiple branches exist, THE System SHALL only include the direct path context, excluding sibling branches
4. WHEN context path exceeds token limits, THE System SHALL implement intelligent truncation while preserving critical context
5. THE System SHALL maintain context integrity across all depth levels of the tree

### Requirement 6: AI Suggestion Engine

**User Story:** As a user, I want to see intelligent follow-up suggestions after AI responses, so that I can discover new angles without having to think of every question myself.

#### Acceptance Criteria

1. WHEN an AI node completes generation, THE System SHALL asynchronously generate 3 suggestion prompts
2. WHEN generating suggestions, THE System SHALL analyze the current node content and full context path
3. WHEN suggestions are ready, THE System SHALL display them as clickable bubbles near the node
4. WHEN a user clicks a suggestion, THE System SHALL create a child node with that suggestion and trigger AI response
5. WHERE suggestions are displayed, THE System SHALL limit each suggestion to 15 characters or less for clarity

### Requirement 7: Workspace Management

**User Story:** As a user, I want to organize my mind maps into separate workspaces, so that I can manage different projects independently.

#### Acceptance Criteria

1. WHEN a user creates a new workspace, THE System SHALL generate a unique workspace ID and root node
2. WHEN a user switches workspaces, THE System SHALL load the corresponding node tree and canvas state
3. WHEN a user modifies nodes, THE System SHALL persist changes to the database in real-time
4. WHEN a user deletes a workspace, THE System SHALL remove all associated nodes and edges
5. THE System SHALL display a list of all user workspaces with preview information

### Requirement 8: Automatic Layout Engine

**User Story:** As a user, I want nodes to be automatically arranged when the tree grows complex, so that I can maintain visual clarity without manual positioning.

#### Acceptance Criteria

1. WHEN multiple child nodes are created, THE System SHALL use a tree layout algorithm to position them
2. WHEN layout is applied, THE System SHALL ensure no nodes overlap
3. WHEN a user manually repositions a node, THE System SHALL respect that position and adjust only descendants
4. WHERE automatic layout is triggered, THE System SHALL animate node movements smoothly
5. THE System SHALL provide a manual "Re-layout" button to reset all positions

### Requirement 9: Markdown Rendering and Editing

**User Story:** As a user, I want to write and view content in Markdown format, so that I can structure my thoughts with rich formatting.

#### Acceptance Criteria

1. WHEN a node is in view mode, THE System SHALL render Markdown content with proper formatting
2. WHEN a node is in edit mode, THE System SHALL display raw Markdown text in a textarea
3. WHEN rendering Markdown, THE System SHALL support headings, lists, code blocks, and emphasis
4. WHEN a user switches between edit and view modes, THE System SHALL preserve all formatting
5. THE System SHALL sanitize Markdown input to prevent XSS attacks

### Requirement 10: Data Persistence and Synchronization

**User Story:** As a user, I want my work to be automatically saved, so that I never lose my progress.

#### Acceptance Criteria

1. WHEN a node is created or modified, THE System SHALL save it to the database within 2 seconds
2. WHEN a node position changes, THE System SHALL update the database with new coordinates
3. WHEN a user returns to a workspace, THE System SHALL restore the exact canvas state including zoom and pan position
4. IF database connection is lost, THEN THE System SHALL queue changes locally and sync when connection restores
5. THE System SHALL display a sync status indicator showing save state

### Requirement 11: Export Functionality

**User Story:** As a user, I want to export my mind map as structured Markdown, so that I can use my work in other tools.

#### Acceptance Criteria

1. WHEN a user triggers export, THE System SHALL generate a hierarchical Markdown document
2. WHEN exporting, THE System SHALL represent the tree structure using Markdown heading levels
3. WHEN exporting, THE System SHALL preserve all node content and formatting
4. WHEN export is complete, THE System SHALL provide a download link for the Markdown file
5. THE System SHALL support exporting individual branches as well as entire workspaces

### Requirement 12: Authentication and User Management

**User Story:** As a user, I want to securely access my workspaces across devices, so that I can work from anywhere.

#### Acceptance Criteria

1. WHEN a new user signs up, THE System SHALL create a user account with email and password
2. WHEN a user logs in, THE System SHALL authenticate credentials and establish a session
3. WHEN a user is authenticated, THE System SHALL only display workspaces owned by that user
4. WHEN a user logs out, THE System SHALL clear the session and redirect to login page
5. THE System SHALL support OAuth authentication with Google and GitHub

### Requirement 13: Responsive UI and Performance

**User Story:** As a user, I want the interface to be fast and responsive, so that my thinking flow is not interrupted.

#### Acceptance Criteria

1. WHEN the canvas contains up to 100 nodes, THE System SHALL maintain 60 FPS during pan and zoom
2. WHEN AI is generating a response, THE System SHALL stream tokens without blocking the UI
3. WHEN a user interacts with nodes, THE System SHALL provide immediate visual feedback within 100ms
4. WHEN the viewport changes, THE System SHALL only render visible nodes to optimize performance
5. THE System SHALL lazy-load node content for large workspaces to reduce initial load time

### Requirement 14: Node Visual Design and States

**User Story:** As a user, I want nodes to have clear visual states, so that I can understand the system status at a glance.

#### Acceptance Criteria

1. WHEN a node is of type 'user', THE System SHALL display it with a distinct color scheme
2. WHEN a node is of type 'ai', THE System SHALL display it with a different color scheme
3. WHEN a node is selected, THE System SHALL highlight it with a border or shadow
4. WHEN a node is being edited, THE System SHALL show an edit indicator
5. WHEN AI is generating content for a node, THE System SHALL display a loading animation

### Requirement 15: Error Handling and User Feedback

**User Story:** As a user, I want clear feedback when errors occur, so that I understand what went wrong and how to proceed.

#### Acceptance Criteria

1. WHEN an AI request fails, THE System SHALL display an error message with retry option
2. WHEN database operations fail, THE System SHALL notify the user and queue the operation for retry
3. WHEN network connection is lost, THE System SHALL display a connection status warning
4. WHEN invalid input is provided, THE System SHALL show validation errors inline
5. THE System SHALL log all errors to a monitoring service for debugging
