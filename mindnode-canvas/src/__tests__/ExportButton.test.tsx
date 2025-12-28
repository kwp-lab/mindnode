/**
 * Unit Tests for ExportButton Component
 * 
 * Tests export functionality for mind map workspaces and branches.
 * 
 * Requirements:
 * - 11.4: Provide download link for Markdown file
 * - 11.5: Support exporting individual branches as well as entire workspaces
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExportButton from '../components/ExportButton';
import { MindNode } from '../types';

// ============================================
// TEST DATA
// ============================================

function createMockNode(overrides: Partial<MindNode> = {}): MindNode {
  const now = new Date();
  return {
    id: 'node-1',
    workspaceId: 'workspace-1',
    parentId: null,
    type: 'root',
    data: {
      label: 'Root Node',
      contextContent: 'Root content',
    },
    position: { x: 0, y: 0 },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockTree(): MindNode[] {
  return [
    createMockNode({
      id: 'root',
      parentId: null,
      type: 'root',
      data: { label: 'Root', contextContent: 'Root content' },
      position: { x: 0, y: 0 },
    }),
    createMockNode({
      id: 'child-1',
      parentId: 'root',
      type: 'user',
      data: { label: 'Child 1', contextContent: 'Child 1 content' },
      position: { x: 200, y: 0 },
    }),
    createMockNode({
      id: 'child-2',
      parentId: 'root',
      type: 'ai',
      data: { label: 'Child 2', contextContent: 'Child 2 content' },
      position: { x: 200, y: 100 },
    }),
    createMockNode({
      id: 'grandchild-1',
      parentId: 'child-1',
      type: 'ai',
      data: { label: 'Grandchild', contextContent: 'Grandchild content' },
      position: { x: 400, y: 0 },
    }),
  ];
}

// ============================================
// MOCKS
// ============================================

// Track download calls
let downloadCalls: Array<{ markdown: string; filename: string }> = [];

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();

// Mock document.createElement to intercept download link creation
const originalCreateElement = document.createElement.bind(document);
let mockLinkClick: jest.Mock;

beforeAll(() => {
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
  
  // Override createElement to capture download link clicks
  mockLinkClick = jest.fn();
  document.createElement = jest.fn((tagName: string) => {
    const element = originalCreateElement(tagName);
    if (tagName === 'a') {
      element.click = mockLinkClick;
      // Capture download info when href and download are set
      const originalSetAttribute = element.setAttribute.bind(element);
      Object.defineProperty(element, 'href', {
        set(value: string) {
          originalSetAttribute('href', value);
        },
        get() {
          return element.getAttribute('href');
        }
      });
      Object.defineProperty(element, 'download', {
        set(value: string) {
          originalSetAttribute('download', value);
          // Record the download when download attribute is set
          downloadCalls.push({
            markdown: '', // Will be populated from Blob
            filename: value
          });
        },
        get() {
          return element.getAttribute('download');
        }
      });
    }
    return element;
  }) as typeof document.createElement;
});

beforeEach(() => {
  downloadCalls = [];
  mockLinkClick.mockClear();
  mockCreateObjectURL.mockClear();
  mockRevokeObjectURL.mockClear();
});

afterAll(() => {
  document.createElement = originalCreateElement;
});

// ============================================
// TESTS
// ============================================

describe('ExportButton', () => {
  describe('Rendering', () => {
    it('should render export button', () => {
      const nodes = createMockTree();
      render(<ExportButton nodes={nodes} />);
      
      expect(screen.getByTestId('export-button')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should be disabled when no nodes exist', () => {
      render(<ExportButton nodes={[]} />);
      
      const button = screen.getByTestId('export-button');
      expect(button).toBeDisabled();
    });

    it('should be disabled when disabled prop is true', () => {
      const nodes = createMockTree();
      render(<ExportButton nodes={nodes} disabled={true} />);
      
      const button = screen.getByTestId('export-button');
      expect(button).toBeDisabled();
    });
  });

  describe('Dropdown Menu', () => {
    it('should open dropdown when button is clicked', () => {
      const nodes = createMockTree();
      render(<ExportButton nodes={nodes} />);
      
      const button = screen.getByTestId('export-button');
      fireEvent.click(button);
      
      expect(screen.getByText('Export Workspace')).toBeInTheDocument();
      expect(screen.getByText('Export Branch')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      const nodes = createMockTree();
      render(
        <div>
          <ExportButton nodes={nodes} />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      // Open dropdown
      fireEvent.click(screen.getByTestId('export-button'));
      expect(screen.getByText('Export Workspace')).toBeInTheDocument();
      
      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'));
      
      await waitFor(() => {
        expect(screen.queryByText('Export Workspace')).not.toBeInTheDocument();
      });
    });

    it('should display node count in dropdown', () => {
      const nodes = createMockTree();
      render(<ExportButton nodes={nodes} />);
      
      fireEvent.click(screen.getByTestId('export-button'));
      
      expect(screen.getByText('4 nodes in workspace')).toBeInTheDocument();
    });
  });

  describe('Export Workspace - Requirement 11.4', () => {
    it('should trigger download when export workspace is clicked', async () => {
      const nodes = createMockTree();
      
      render(<ExportButton nodes={nodes} workspaceTitle="Test Workspace" />);
      
      // Open dropdown and click export workspace
      fireEvent.click(screen.getByTestId('export-button'));
      fireEvent.click(screen.getByTestId('export-workspace-button'));
      
      await waitFor(() => {
        // Verify download link was clicked
        expect(mockLinkClick).toHaveBeenCalled();
      });
      
      // Verify Blob was created for download
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should generate filename with .md extension', async () => {
      const nodes = createMockTree();
      
      render(<ExportButton nodes={nodes} workspaceTitle="Test Workspace" />);
      
      fireEvent.click(screen.getByTestId('export-button'));
      fireEvent.click(screen.getByTestId('export-workspace-button'));
      
      await waitFor(() => {
        expect(downloadCalls.length).toBeGreaterThan(0);
      });
      
      const lastDownload = downloadCalls[downloadCalls.length - 1];
      expect(lastDownload.filename).toMatch(/\.md$/);
    });

    it('should show success state after export', async () => {
      const nodes = createMockTree();
      
      render(<ExportButton nodes={nodes} />);
      
      fireEvent.click(screen.getByTestId('export-button'));
      fireEvent.click(screen.getByTestId('export-workspace-button'));
      
      await waitFor(() => {
        expect(screen.getByText('Exported!')).toBeInTheDocument();
      });
    });
  });

  describe('Export Branch - Requirement 11.5', () => {
    it('should disable branch export when no node is selected', () => {
      const nodes = createMockTree();
      render(<ExportButton nodes={nodes} selectedNodeId={null} />);
      
      fireEvent.click(screen.getByTestId('export-button'));
      
      const branchButton = screen.getByTestId('export-branch-button');
      expect(branchButton).toHaveClass('cursor-not-allowed');
      expect(screen.getByText('Select a node first')).toBeInTheDocument();
    });

    it('should enable branch export when a node is selected', () => {
      const nodes = createMockTree();
      render(<ExportButton nodes={nodes} selectedNodeId="child-1" />);
      
      fireEvent.click(screen.getByTestId('export-button'));
      
      const branchButton = screen.getByTestId('export-branch-button');
      expect(branchButton).not.toHaveClass('cursor-not-allowed');
      expect(screen.getByText('Export selected node & children')).toBeInTheDocument();
    });

    it('should trigger download when export branch is clicked', async () => {
      const nodes = createMockTree();
      
      render(<ExportButton nodes={nodes} selectedNodeId="child-1" />);
      
      fireEvent.click(screen.getByTestId('export-button'));
      fireEvent.click(screen.getByTestId('export-branch-button'));
      
      await waitFor(() => {
        expect(mockLinkClick).toHaveBeenCalled();
      });
      
      // Verify download was triggered
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it('should not trigger download when branch export is disabled', () => {
      const nodes = createMockTree();
      
      render(<ExportButton nodes={nodes} selectedNodeId={null} />);
      
      fireEvent.click(screen.getByTestId('export-button'));
      fireEvent.click(screen.getByTestId('export-branch-button'));
      
      // Download should not be triggered
      expect(mockLinkClick).not.toHaveBeenCalled();
    });
  });

  describe('Export Options', () => {
    it('should toggle include node types option', () => {
      const nodes = createMockTree();
      render(<ExportButton nodes={nodes} />);
      
      fireEvent.click(screen.getByTestId('export-button'));
      
      const checkbox = screen.getByLabelText('Include node type icons');
      expect(checkbox).not.toBeChecked();
      
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('should toggle include selection sources option', () => {
      const nodes = createMockTree();
      render(<ExportButton nodes={nodes} />);
      
      fireEvent.click(screen.getByTestId('export-button'));
      
      const checkbox = screen.getByLabelText('Include selection sources');
      expect(checkbox).toBeChecked(); // Default is true
      
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });
});
