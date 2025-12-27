/**
 * Supabase Database Types
 * Auto-generated types for the MindNode Canvas database schema
 * 
 * These types match the database schema defined in:
 * supabase/migrations/20241227000001_create_workspaces_and_nodes.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type NodeType = 'root' | 'user' | 'ai';

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          root_node_id: string | null;
          created_at: string;
          updated_at: string;
          viewport_x: number;
          viewport_y: number;
          viewport_zoom: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          root_node_id?: string | null;
          created_at?: string;
          updated_at?: string;
          viewport_x?: number;
          viewport_y?: number;
          viewport_zoom?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          root_node_id?: string | null;
          created_at?: string;
          updated_at?: string;
          viewport_x?: number;
          viewport_y?: number;
          viewport_zoom?: number;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_workspaces_root_node";
            columns: ["root_node_id"];
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          }
        ];
      };
      nodes: {
        Row: {
          id: string;
          workspace_id: string;
          parent_id: string | null;
          type: NodeType;
          content: string;
          selection_source: string | null;
          position_x: number;
          position_y: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          parent_id?: string | null;
          type: NodeType;
          content?: string;
          selection_source?: string | null;
          position_x?: number;
          position_y?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          parent_id?: string | null;
          type?: NodeType;
          content?: string;
          selection_source?: string | null;
          position_x?: number;
          position_y?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nodes_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nodes_parent_id_fkey";
            columns: ["parent_id"];
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      node_type: NodeType;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Helper types for easier usage
export type WorkspaceRow = Database['public']['Tables']['workspaces']['Row'];
export type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert'];
export type WorkspaceUpdate = Database['public']['Tables']['workspaces']['Update'];

export type NodeRow = Database['public']['Tables']['nodes']['Row'];
export type NodeInsert = Database['public']['Tables']['nodes']['Insert'];
export type NodeUpdate = Database['public']['Tables']['nodes']['Update'];
