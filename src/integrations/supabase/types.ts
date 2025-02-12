export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_comments: {
        Row: {
          author_name: string
          content: string
          created_at: string | null
          id: number
          post_id: number | null
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string | null
          id?: number
          post_id?: number | null
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string | null
          id?: number
          post_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_likes: {
        Row: {
          created_at: string | null
          id: number
          post_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          post_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          post_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_avatar: string
          author_name: string
          category: string
          content: string
          cover_image: string
          created_at: string | null
          date: string | null
          id: number
          read_time: string
          snippet: string
          status: string | null
          title: string
        }
        Insert: {
          author_avatar: string
          author_name: string
          category: string
          content: string
          cover_image: string
          created_at?: string | null
          date?: string | null
          id?: number
          read_time: string
          snippet: string
          status?: string | null
          title: string
        }
        Update: {
          author_avatar?: string
          author_name?: string
          category?: string
          content?: string
          cover_image?: string
          created_at?: string | null
          date?: string | null
          id?: number
          read_time?: string
          snippet?: string
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string | null
          email: string
          id: number
          message: string
          name: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: number
          message: string
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          message?: string
          name?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          created_at: string | null
          description: string
          email: string
          id: number
          name: string
          service_type: string
          status: string | null
          updated_at: string | null
          whatsapp: string
        }
        Insert: {
          created_at?: string | null
          description: string
          email: string
          id?: number
          name: string
          service_type: string
          status?: string | null
          updated_at?: string | null
          whatsapp: string
        }
        Update: {
          created_at?: string | null
          description?: string
          email?: string
          id?: number
          name?: string
          service_type?: string
          status?: string | null
          updated_at?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      impact_counters: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          title: string
          value: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          title: string
          value: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          title?: string
          value?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          in_app_notifications: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_logos: {
        Row: {
          created_at: string | null
          id: number
          logo_url: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          logo_url: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          logo_url?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      secure_urls: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          url_key: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          url_key: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          url_key?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          budget_range: string | null
          business_stage: string | null
          created_at: string | null
          email: string
          existing_assets: boolean | null
          id: number
          name: string
          output_format: string | null
          preferred_style: string[] | null
          project_description: string
          service_features: string[] | null
          service_platform: string | null
          service_subtype: string | null
          service_type: string
          target_audience: string | null
          timeline: string | null
          whatsapp: string
        }
        Insert: {
          budget_range?: string | null
          business_stage?: string | null
          created_at?: string | null
          email: string
          existing_assets?: boolean | null
          id?: number
          name: string
          output_format?: string | null
          preferred_style?: string[] | null
          project_description: string
          service_features?: string[] | null
          service_platform?: string | null
          service_subtype?: string | null
          service_type: string
          target_audience?: string | null
          timeline?: string | null
          whatsapp: string
        }
        Update: {
          budget_range?: string | null
          business_stage?: string | null
          created_at?: string | null
          email?: string
          existing_assets?: boolean | null
          id?: number
          name?: string
          output_format?: string | null
          preferred_style?: string[] | null
          project_description?: string
          service_features?: string[] | null
          service_platform?: string | null
          service_subtype?: string | null
          service_type?: string
          target_audience?: string | null
          timeline?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      notification_type: "blog_post" | "form_submission" | "system"
      user_role: "admin" | "editor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
