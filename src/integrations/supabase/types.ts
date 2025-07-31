export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          category: string
          created_at: string | null
          id: string
          monthly_limit: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          monthly_limit: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          monthly_limit?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feedback_responses: {
        Row: {
          admin_id: string
          created_at: string
          feedback_id: string
          id: string
          response_text: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          feedback_id: string
          id?: string
          response_text: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          feedback_id?: string
          id?: string
          response_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "user_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_income_estimates: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          budget_nudges: boolean | null
          business_mode_nudges: boolean | null
          created_at: string
          custom_goal_reminder: boolean | null
          daily_log_reminder: boolean | null
          id: string
          month_reset_preview: boolean | null
          monthly_snapshot: boolean | null
          night_owl_checkin: boolean | null
          preferred_time: string | null
          recurring_expense_reminder: boolean | null
          reflection_prompts: boolean | null
          savings_progress: boolean | null
          streak_breaking_alerts: boolean | null
          streak_freeze_warnings: boolean | null
          streak_milestone_alerts: boolean | null
          streak_recovery_reminders: boolean | null
          unusual_activity: boolean | null
          updated_at: string
          user_id: string
          weekly_recap: boolean | null
        }
        Insert: {
          budget_nudges?: boolean | null
          business_mode_nudges?: boolean | null
          created_at?: string
          custom_goal_reminder?: boolean | null
          daily_log_reminder?: boolean | null
          id?: string
          month_reset_preview?: boolean | null
          monthly_snapshot?: boolean | null
          night_owl_checkin?: boolean | null
          preferred_time?: string | null
          recurring_expense_reminder?: boolean | null
          reflection_prompts?: boolean | null
          savings_progress?: boolean | null
          streak_breaking_alerts?: boolean | null
          streak_freeze_warnings?: boolean | null
          streak_milestone_alerts?: boolean | null
          streak_recovery_reminders?: boolean | null
          unusual_activity?: boolean | null
          updated_at?: string
          user_id: string
          weekly_recap?: boolean | null
        }
        Update: {
          budget_nudges?: boolean | null
          business_mode_nudges?: boolean | null
          created_at?: string
          custom_goal_reminder?: boolean | null
          daily_log_reminder?: boolean | null
          id?: string
          month_reset_preview?: boolean | null
          monthly_snapshot?: boolean | null
          night_owl_checkin?: boolean | null
          preferred_time?: string | null
          recurring_expense_reminder?: boolean | null
          reflection_prompts?: boolean | null
          savings_progress?: boolean | null
          streak_breaking_alerts?: boolean | null
          streak_freeze_warnings?: boolean | null
          streak_milestone_alerts?: boolean | null
          streak_recovery_reminders?: boolean | null
          unusual_activity?: boolean | null
          updated_at?: string
          user_id?: string
          weekly_recap?: boolean | null
        }
        Relationships: []
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
        Relationships: []
      }
      savings_goals: {
        Row: {
          category: string
          created_at: string | null
          id: string
          target_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          target_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          target_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      slideshow_banners: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          id: string
          image_url: string
          link_url: string | null
          title: string
          updated_at: string | null
          visible_to: Database["public"]["Enums"]["user_role_type"][]
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          id?: string
          image_url: string
          link_url?: string | null
          title: string
          updated_at?: string | null
          visible_to?: Database["public"]["Enums"]["user_role_type"][]
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string
          link_url?: string | null
          title?: string
          updated_at?: string | null
          visible_to?: Database["public"]["Enums"]["user_role_type"][]
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          card_type: string
          created_at: string
          id: string
          last_four_digits: string
          last_transaction_date: string | null
          next_billing_date: string | null
          service_provider: string
          status: string
          subscription_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          card_type: string
          created_at?: string
          id?: string
          last_four_digits: string
          last_transaction_date?: string | null
          next_billing_date?: string | null
          service_provider: string
          status?: string
          subscription_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_type?: string
          created_at?: string
          id?: string
          last_four_digits?: string
          last_transaction_date?: string | null
          next_billing_date?: string | null
          service_provider?: string
          status?: string
          subscription_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          archived: boolean
          category: string
          created_at: string | null
          date: string
          description: string
          id: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          archived?: boolean
          category: string
          created_at?: string | null
          date: string
          description: string
          id?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          archived?: boolean
          category?: string
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          comments: string | null
          contact_permission: boolean | null
          created_at: string
          id: string
          rating: string
          screenshot_url: string | null
          user_id: string
        }
        Insert: {
          comments?: string | null
          contact_permission?: boolean | null
          created_at?: string
          id?: string
          rating: string
          screenshot_url?: string | null
          user_id: string
        }
        Update: {
          comments?: string | null
          contact_permission?: boolean | null
          created_at?: string
          id?: string
          rating?: string
          screenshot_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notification_logs: {
        Row: {
          id: string
          metadata: Json | null
          notification_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          notification_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          notification_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          age_bracket: string | null
          avatar_url: string | null
          bio: string | null
          continent: string | null
          country: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at: string | null
          username: string | null
        }
        Insert: {
          age_bracket?: string | null
          avatar_url?: string | null
          bio?: string | null
          continent?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          age_bracket?: string | null
          avatar_url?: string | null
          bio?: string | null
          continent?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          currency_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency_code?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number
          current_title: string
          freeze_count: number
          highest_streak: number
          last_login: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number
          current_title?: string
          freeze_count?: number
          highest_streak?: number
          last_login?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number
          current_title?: string
          freeze_count?: number
          highest_streak?: number
          last_login?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_subscriptions_category: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_user_account: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      delete_user_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      notification_type: "blog_post" | "form_submission" | "system"
      user_role: "admin" | "editor"
      user_role_type: "admin" | "free" | "pro" | "premium"
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
      notification_type: ["blog_post", "form_submission", "system"],
      user_role: ["admin", "editor"],
      user_role_type: ["admin", "free", "pro", "premium"],
    },
  },
} as const
