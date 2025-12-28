/**
 * Hooks barrel export
 */

export { useTextSelection } from './useTextSelection';
export type {
  TextSelectionState,
  UseTextSelectionOptions,
  UseTextSelectionReturn,
} from './useTextSelection';

export { useAIGeneration } from './useAIGeneration';
export type {
  UseAIGenerationOptions,
  UseAIGenerationReturn,
} from './useAIGeneration';

export { useSuggestions } from './useSuggestions';
export type {
  UseSuggestionsOptions,
  UseSuggestionsReturn,
} from './useSuggestions';

export { useWorkspaces } from './useWorkspaces';
export type {
  UseWorkspacesOptions,
  UseWorkspacesReturn,
} from './useWorkspaces';

// Re-export persistence hook from lib
export { usePersistence } from '../lib/persistence';
export type { UsePersistenceReturn } from '../lib/persistence';
