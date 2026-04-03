export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          firebase_uid: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_display_name: string | null
          user_email: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          firebase_uid: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_display_name?: string | null
          user_email?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          firebase_uid?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_display_name?: string | null
          user_email?: string | null
        }
        Relationships: []
      }
      agent_projects: {
        Row: {
          agent_type: string
          created_at: string
          description: string | null
          files: Json
          id: string
          is_published: boolean
          preview_html: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_type?: string
          created_at?: string
          description?: string | null
          files?: Json
          id?: string
          is_published?: boolean
          preview_html?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_type?: string
          created_at?: string
          description?: string | null
          files?: Json
          id?: string
          is_published?: boolean
          preview_html?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_memory: {
        Row: {
          communication_style: string | null
          created_at: string
          custom_ai_name: string | null
          custom_personality: string | null
          desires: string[] | null
          firebase_uid: string
          goals: string[] | null
          habits: string[] | null
          id: string
          personality_traits: string[] | null
          preferences: string[] | null
          strengths: string[] | null
          topics_discussed: string[] | null
          updated_at: string
          user_name: string | null
          weaknesses: string[] | null
        }
        Insert: {
          communication_style?: string | null
          created_at?: string
          custom_ai_name?: string | null
          custom_personality?: string | null
          desires?: string[] | null
          firebase_uid: string
          goals?: string[] | null
          habits?: string[] | null
          id?: string
          personality_traits?: string[] | null
          preferences?: string[] | null
          strengths?: string[] | null
          topics_discussed?: string[] | null
          updated_at?: string
          user_name?: string | null
          weaknesses?: string[] | null
        }
        Update: {
          communication_style?: string | null
          created_at?: string
          custom_ai_name?: string | null
          custom_personality?: string | null
          desires?: string[] | null
          firebase_uid?: string
          goals?: string[] | null
          habits?: string[] | null
          id?: string
          personality_traits?: string[] | null
          preferences?: string[] | null
          strengths?: string[] | null
          topics_discussed?: string[] | null
          updated_at?: string
          user_name?: string | null
          weaknesses?: string[] | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          firebase_uid: string
          id: string
          image_url: string | null
          reaction: string | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          firebase_uid: string
          id?: string
          image_url?: string | null
          reaction?: string | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          firebase_uid?: string
          id?: string
          image_url?: string | null
          reaction?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          firebase_uid: string
          id: string
          is_coding_partner: boolean | null
          session_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          firebase_uid: string
          id?: string
          is_coding_partner?: boolean | null
          session_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          firebase_uid?: string
          id?: string
          is_coding_partner?: boolean | null
          session_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_chats: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          messages: Json
          session_id: string
          shared_by_name: string | null
          title: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          messages?: Json
          session_id: string
          shared_by_name?: string | null
          title?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          messages?: Json
          session_id?: string
          shared_by_name?: string | null
          title?: string
        }
        Relationships: []
      }
      study_histories: {
        Row: {
          created_at: string
          encrypted_payload: string
          firebase_uid: string
          id: string
          iv: string
          mindmap_layout: string | null
          source_name: string | null
          source_type: string
          source_url: string | null
          study_mode: string
          title: string
          tone_style: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_payload: string
          firebase_uid: string
          id?: string
          iv: string
          mindmap_layout?: string | null
          source_name?: string | null
          source_type: string
          source_url?: string | null
          study_mode: string
          title?: string
          tone_style?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_payload?: string
          firebase_uid?: string
          id?: string
          iv?: string
          mindmap_layout?: string | null
          source_name?: string | null
          source_type?: string
          source_url?: string | null
          study_mode?: string
          title?: string
          tone_style?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      study_profiles: {
        Row: {
          age_group: string
          created_at: string
          education_level: string
          firebase_uid: string
          id: string
          updated_at: string
        }
        Insert: {
          age_group: string
          created_at?: string
          education_level: string
          firebase_uid: string
          id?: string
          updated_at?: string
        }
        Update: {
          age_group?: string
          created_at?: string
          education_level?: string
          firebase_uid?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          firebase_uid: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          firebase_uid: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          firebase_uid?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
