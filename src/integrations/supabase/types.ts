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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          address: string
          bank_name: string
          created_at: string
          footer_text: string
          id: string
          logo_data_url: string | null
          maintenance_mode: boolean
          mark_data_url: string | null
          support_chat_url: string
          support_email: string
          support_enabled: boolean
          support_message: string
          support_phone: string
          support_telegram: string
          support_whatsapp: string
          tagline: string
          updated_at: string
        }
        Insert: {
          address?: string
          bank_name?: string
          created_at?: string
          footer_text?: string
          id?: string
          logo_data_url?: string | null
          maintenance_mode?: boolean
          mark_data_url?: string | null
          support_chat_url?: string
          support_email?: string
          support_enabled?: boolean
          support_message?: string
          support_phone?: string
          support_telegram?: string
          support_whatsapp?: string
          tagline?: string
          updated_at?: string
        }
        Update: {
          address?: string
          bank_name?: string
          created_at?: string
          footer_text?: string
          id?: string
          logo_data_url?: string | null
          maintenance_mode?: boolean
          mark_data_url?: string | null
          support_chat_url?: string
          support_email?: string
          support_enabled?: boolean
          support_message?: string
          support_phone?: string
          support_telegram?: string
          support_whatsapp?: string
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_number: string
          account_status: string
          avatar_url: string | null
          balance: number
          country: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_number: string
          account_status?: string
          avatar_url?: string | null
          balance?: number
          country?: string | null
          created_at?: string
          email: string
          first_name?: string
          id: string
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_status?: string
          avatar_url?: string | null
          balance?: number
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          receiver_name: string | null
          sender_name: string | null
          status: string
          transaction_id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          receiver_name?: string | null
          sender_name?: string | null
          status?: string
          transaction_id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          receiver_name?: string | null
          sender_name?: string | null
          status?: string
          transaction_id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      transfers: {
        Row: {
          account_number: string | null
          amount: number
          country: string | null
          created_at: string
          iban: string | null
          id: string
          recipient_bank: string | null
          recipient_name: string
          reference: string | null
          routing_number: string | null
          status: string
          swift_code: string | null
          transfer_type: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          amount: number
          country?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          recipient_bank?: string | null
          recipient_name: string
          reference?: string | null
          routing_number?: string | null
          status?: string
          swift_code?: string | null
          transfer_type: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          amount?: number
          country?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          recipient_bank?: string | null
          recipient_name?: string
          reference?: string | null
          routing_number?: string | null
          status?: string
          swift_code?: string | null
          transfer_type?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      adjust_own_balance: { Args: { delta: number }; Returns: number }
      admin_reset_user: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      admin_reset_user_by_account: {
        Args: { _account_number: string }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      credit_account_by_number: {
        Args: {
          _account_number: string
          _amount: number
          _description: string
          _sender_name: string
        }
        Returns: string
      }
      execute_transfer: {
        Args: {
          _amount: number
          _description: string
          _recipient_account: string
          _reference?: string
        }
        Returns: {
          new_balance: number
          recipient_tx_id: string
          sender_tx_id: string
        }[]
      }
      execute_withdrawal: {
        Args: { _amount: number; _description: string }
        Returns: {
          new_balance: number
          transaction_id: string
        }[]
      }
      generate_account_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_account_by_number: {
        Args: { _account_number: string }
        Returns: {
          account_number: string
          full_name: string
        }[]
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
