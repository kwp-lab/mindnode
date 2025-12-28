/**
 * Components barrel export
 */

export { default as CanvasWorkspace } from './CanvasWorkspace';
export { default as MindNodeComponent } from './MindNodeComponent';
export { default as SelectionToolbar } from './SelectionToolbar';
export { default as SuggestionBubbles } from './SuggestionBubbles';
export { default as WorkspaceSidebar } from './WorkspaceSidebar';
export { SyncStatusIndicator, SyncStatusDot } from './SyncStatusIndicator';

// Re-export types
export type { CanvasWorkspaceProps } from './CanvasWorkspace';
export type { MindNodeData } from './MindNodeComponent';
export type { SelectionToolbarProps } from './SelectionToolbar';
export type { SuggestionBubblesProps } from './SuggestionBubbles';
export type { WorkspaceSidebarProps } from './WorkspaceSidebar';
export type { SyncStatusIndicatorProps } from './SyncStatusIndicator';
