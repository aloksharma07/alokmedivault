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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string
          id: string
          legacy_activity_id: string | null
          report_id: string | null
          target_user_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string
          id?: string
          legacy_activity_id?: string | null
          report_id?: string | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string
          id?: string
          legacy_activity_id?: string | null
          report_id?: string | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string
          hospital: string
          id: string
          legacy_doctor_id: string | null
          specialization: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital?: string
          id?: string
          legacy_doctor_id?: string | null
          specialization?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hospital?: string
          id?: string
          legacy_doctor_id?: string | null
          specialization?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string
          age: number | null
          created_at: string
          emergency_contact: string
          gender: string
          id: string
          legacy_patient_id: string | null
          medical_info: string
          patient_code: string
          qr_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          age?: number | null
          created_at?: string
          emergency_contact?: string
          gender?: string
          id?: string
          legacy_patient_id?: string | null
          medical_info?: string
          patient_code?: string
          qr_token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          age?: number | null
          created_at?: string
          emergency_contact?: string
          gender?: string
          id?: string
          legacy_patient_id?: string | null
          medical_info?: string
          patient_code?: string
          qr_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          is_active: boolean
          name: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          is_active?: boolean
          name?: string
          phone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          is_active?: boolean
          name?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qr_access_grants: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          qr_token: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          qr_token: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          qr_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_access_grants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_access_grants_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      report_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          legacy_category_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          legacy_category_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          legacy_category_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_shares: {
        Row: {
          created_at: string
          doctor_id: string
          expires_at: string
          id: string
          legacy_share_id: string | null
          message: string
          patient_id: string
          report_id: string
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          expires_at: string
          id?: string
          legacy_share_id?: string | null
          message?: string
          patient_id: string
          report_id: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          expires_at?: string
          id?: string
          legacy_share_id?: string | null
          message?: string
          patient_id?: string
          report_id?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_shares_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_shares_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_shares_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          category_id: string
          department: string
          doctor_name: string
          file_hash: string
          file_name: string
          file_size: number
          file_type: string
          hospital_name: string
          id: string
          is_important: boolean
          laboratory_name: string
          legacy_report_id: string | null
          legacy_stored_name: string | null
          notes: string
          patient_id: string
          report_date: string
          storage_path: string
          title: string
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          category_id: string
          department?: string
          doctor_name?: string
          file_hash: string
          file_name: string
          file_size: number
          file_type: string
          hospital_name?: string
          id?: string
          is_important?: boolean
          laboratory_name?: string
          legacy_report_id?: string | null
          legacy_stored_name?: string | null
          notes?: string
          patient_id: string
          report_date: string
          storage_path: string
          title: string
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          category_id?: string
          department?: string
          doctor_name?: string
          file_hash?: string
          file_name?: string
          file_size?: number
          file_type?: string
          hospital_name?: string
          id?: string
          is_important?: boolean
          laboratory_name?: string
          legacy_report_id?: string | null
          legacy_stored_name?: string | null
          notes?: string
          patient_id?: string
          report_date?: string
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "report_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
      admin_log_category: {
        Args: { _action: string; _details: string }
        Returns: undefined
      }
      admin_set_user_active: {
        Args: { _active: boolean; _user_id: string }
        Returns: undefined
      }
      can_access_report: { Args: { _report_id: string }; Returns: boolean }
      can_access_report_file: { Args: { _path: string }; Returns: boolean }
      create_report_share: {
        Args: {
          _doctor_id: string
          _expires_at: string
          _message: string
          _report_id: string
        }
        Returns: string
      }
      current_doctor_id: { Args: never; Returns: string }
      current_patient_id: { Args: never; Returns: string }
      doctor_can_view_report: { Args: { _report_id: string }; Returns: boolean }
      doctor_share_list: {
        Args: never
        Returns: {
          category_name: string
          created_at: string
          effective_status: string
          expires_at: string
          file_name: string
          file_size: number
          file_type: string
          hospital_name: string
          laboratory_name: string
          message: string
          notes: string
          patient_code: string
          patient_name: string
          patient_user_id: string
          report_date: string
          report_doctor: string
          report_id: string
          share_id: string
          status: string
          storage_path: string
          title: string
        }[]
      }
      has_active_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      list_active_doctors: {
        Args: never
        Returns: {
          hospital: string
          id: string
          name: string
          specialization: string
        }[]
      }
      log_activity: {
        Args: {
          _action: string
          _details?: string
          _report_id?: string
          _target_user_id?: string
        }
        Returns: undefined
      }
      patient_share_list: {
        Args: never
        Returns: {
          category_name: string
          created_at: string
          doctor_name: string
          doctor_specialization: string
          doctor_user_id: string
          effective_status: string
          expires_at: string
          message: string
          report_date: string
          report_id: string
          share_id: string
          status: string
          title: string
        }[]
      }
      redeem_patient_qr: {
        Args: { _qr_token: string }
        Returns: {
          age: number
          emergency_contact: string
          gender: string
          medical_info: string
          name: string
          patient_code: string
          patient_id: string
          patient_user_id: string
          phone: string
        }[]
      }
      reset_patient_qr: { Args: never; Returns: string }
      revoke_report_share: { Args: { _share_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "patient" | "doctor" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["patient", "doctor", "admin"],
    },
  },
} as const
