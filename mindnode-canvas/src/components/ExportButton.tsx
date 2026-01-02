'use client';

/**
 * ExportButton Component
 * 
 * Provides export functionality for mind map workspaces and branches.
 * 
 * Requirements:
 * - 11.4: Provide download link for Markdown file
 * - 11.5: Support exporting individual branches as well as entire workspaces
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MindNode } from '../types';
import {
  exportToMarkdown,
  exportBranchToMarkdown,
  downloadMarkdown,
  generateExportFilename,
  ExportOptions,
} from '../lib/export';

// ============================================
// TYPES
// ============================================

export interface ExportButtonProps {
  /** All nodes in the current workspace */
  nodes: MindNode[];
  /** Current workspace title for filename */
  workspaceTitle?: string;
  /** Currently selected node ID (for branch export) */
  selectedNodeId?: string | null;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Compact mode for mobile - icon only */
  compact?: boolean;
}

type ExportMode = 'workspace' | 'branch';

// ============================================
// ICONS
// ============================================

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M19 9l-7 7-7-7" 
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M5 13l4 4L19 7" 
      />
    </svg>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ExportButton({
  nodes,
  workspaceTitle,
  selectedNodeId,
  disabled = false,
  className = '',
  compact = false,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [includeNodeTypes, setIncludeNodeTypes] = useState(false);
  const [includeSelectionSource, setIncludeSelectionSource] = useState(true);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Reset status after showing success/error
  useEffect(() => {
    if (exportStatus !== 'idle') {
      const timer = setTimeout(() => setExportStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [exportStatus]);

  /**
   * Handle export action
   */
  const handleExport = useCallback((mode: ExportMode) => {
    try {
      const options: ExportOptions = {
        includeNodeTypes,
        includeSelectionSource,
        title: workspaceTitle,
      };

      let result;
      let filename;

      if (mode === 'branch' && selectedNodeId) {
        // Export selected branch
        const selectedNode = nodes.find(n => n.id === selectedNodeId);
        const branchTitle = selectedNode?.data.label?.slice(0, 30) || 'branch';
        
        result = exportBranchToMarkdown(nodes, selectedNodeId, {
          ...options,
          title: branchTitle,
        });
        filename = generateExportFilename(branchTitle);
      } else {
        // Export entire workspace
        result = exportToMarkdown(nodes, options);
        filename = generateExportFilename(workspaceTitle);
      }

      if (result.nodeCount === 0) {
        console.warn('No nodes to export');
        setExportStatus('error');
        return;
      }

      downloadMarkdown(result.markdown, filename);
      setExportStatus('success');
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
    }
  }, [nodes, workspaceTitle, selectedNodeId, includeNodeTypes, includeSelectionSource]);

  const canExportBranch = selectedNodeId && nodes.some(n => n.id === selectedNodeId);
  const hasNodes = nodes.length > 0;

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Main Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || !hasNodes}
        className={`
          inline-flex items-center gap-2 ${compact ? 'p-2' : 'px-3 py-2'} text-sm font-medium rounded-lg
          transition-all duration-200
          ${disabled || !hasNodes
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm'
          }
          ${exportStatus === 'success' ? 'bg-green-50 border-green-300 text-green-700' : ''}
          ${exportStatus === 'error' ? 'bg-red-50 border-red-300 text-red-700' : ''}
        `}
        data-testid="export-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={compact ? 'Export' : undefined}
      >
        {exportStatus === 'success' ? (
          <>
            <CheckIcon className="w-4 h-4" />
            {!compact && <span>Exported!</span>}
          </>
        ) : (
          <>
            <DownloadIcon className="w-4 h-4" />
            {!compact && (
              <>
                <span>Export</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          role="menu"
          aria-orientation="vertical"
        >
          {/* Export Options */}
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Options
            </p>
            
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={includeNodeTypes}
                onChange={(e) => setIncludeNodeTypes(e.target.checked)}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span>Include node type icons</span>
            </label>
            
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSelectionSource}
                onChange={(e) => setIncludeSelectionSource(e.target.checked)}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span>Include selection sources</span>
            </label>
          </div>

          {/* Export Actions */}
          <div className="p-2">
            <button
              onClick={() => handleExport('workspace')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
              role="menuitem"
              data-testid="export-workspace-button"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <div className="text-left">
                <div className="font-medium">Export Workspace</div>
                <div className="text-xs text-gray-500">Export entire mind map</div>
              </div>
            </button>

            <button
              onClick={() => handleExport('branch')}
              disabled={!canExportBranch}
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors
                ${canExportBranch 
                  ? 'text-gray-700 hover:bg-gray-100' 
                  : 'text-gray-400 cursor-not-allowed'
                }
              `}
              role="menuitem"
              data-testid="export-branch-button"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              <div className="text-left">
                <div className="font-medium">Export Branch</div>
                <div className="text-xs text-gray-500">
                  {canExportBranch 
                    ? 'Export selected node & children' 
                    : 'Select a node first'
                  }
                </div>
              </div>
            </button>
          </div>

          {/* Node count info */}
          <div className="px-3 py-2 bg-gray-50 rounded-b-lg border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {nodes.length} node{nodes.length !== 1 ? 's' : ''} in workspace
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
