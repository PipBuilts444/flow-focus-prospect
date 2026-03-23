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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          company_id: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          description: string | null
          id: string
          meeting_type: Database["public"]["Enums"]["meeting_type"] | null
          next_step: string | null
          next_step_date: string | null
          outcome: string | null
          owner: string | null
          status: Database["public"]["Enums"]["activity_status"]
          title: string
          updated_at: string
        }
        Insert: {
          activity_date?: string
          activity_type?: Database["public"]["Enums"]["activity_type"]
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          id?: string
          meeting_type?: Database["public"]["Enums"]["meeting_type"] | null
          next_step?: string | null
          next_step_date?: string | null
          outcome?: string | null
          owner?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          title: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_type?: Database["public"]["Enums"]["activity_type"]
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          id?: string
          meeting_type?: Database["public"]["Enums"]["meeting_type"] | null
          next_step?: string | null
          next_step_date?: string | null
          outcome?: string | null
          owner?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          account_owner: string | null
          company_name: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          industry: string | null
          is_deleted: boolean
          notes: string | null
          status: Database["public"]["Enums"]["company_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          account_owner?: string | null
          company_name: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          industry?: string | null
          is_deleted?: boolean
          notes?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_owner?: string | null
          company_name?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          industry?: string | null
          is_deleted?: boolean
          notes?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          first_name: string
          full_name: string | null
          id: string
          is_deleted: boolean
          last_name: string
          notes: string | null
          phone: string | null
          role_or_title: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string
          full_name?: string | null
          id?: string
          is_deleted?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          role_or_title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string
          full_name?: string | null
          id?: string
          is_deleted?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          role_or_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_revenue_schedule: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          month: string
          revenue_amount: number
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          month: string
          revenue_amount?: number
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          month?: string
          revenue_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_revenue_schedule_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          blocker_or_risk: string | null
          commercial_notes: string | null
          commit_confidence: string | null
          company_id: string | null
          confidence_percent: number
          created_at: string
          deal_name: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          deleted_at: string | null
          deleted_by: string | null
          delivery_considerations: string | null
          delivery_duration_months: number
          expected_close_date: string | null
          expected_start_date: string | null
          final_commercial_assumptions: string | null
          forecast_category: Database["public"]["Enums"]["forecast_category"]
          id: string
          is_deleted: boolean
          key_stakeholder: string | null
          latest_close_date: string | null
          likely_service_area: string | null
          likely_start_month: string | null
          lost_date: string | null
          lost_notes: string | null
          lost_reason: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          original_close_date: string | null
          owner: string | null
          primary_contact_id: string | null
          problem_challenge: string | null
          procurement_status: string | null
          refined_problem: string | null
          revenue_profile_type: Database["public"]["Enums"]["revenue_profile"]
          scope_hypothesis: string | null
          slip_count: number
          source: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          status: Database["public"]["Enums"]["deal_status"]
          updated_at: string
          urgency_why_now: string | null
          value: number
          weighted_value: number | null
          won_date: string | null
        }
        Insert: {
          blocker_or_risk?: string | null
          commercial_notes?: string | null
          commit_confidence?: string | null
          company_id?: string | null
          confidence_percent?: number
          created_at?: string
          deal_name: string
          deal_type?: Database["public"]["Enums"]["deal_type"]
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_considerations?: string | null
          delivery_duration_months?: number
          expected_close_date?: string | null
          expected_start_date?: string | null
          final_commercial_assumptions?: string | null
          forecast_category?: Database["public"]["Enums"]["forecast_category"]
          id?: string
          is_deleted?: boolean
          key_stakeholder?: string | null
          latest_close_date?: string | null
          likely_service_area?: string | null
          likely_start_month?: string | null
          lost_date?: string | null
          lost_notes?: string | null
          lost_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          original_close_date?: string | null
          owner?: string | null
          primary_contact_id?: string | null
          problem_challenge?: string | null
          procurement_status?: string | null
          refined_problem?: string | null
          revenue_profile_type?: Database["public"]["Enums"]["revenue_profile"]
          scope_hypothesis?: string | null
          slip_count?: number
          source?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
          urgency_why_now?: string | null
          value?: number
          weighted_value?: number | null
          won_date?: string | null
        }
        Update: {
          blocker_or_risk?: string | null
          commercial_notes?: string | null
          commit_confidence?: string | null
          company_id?: string | null
          confidence_percent?: number
          created_at?: string
          deal_name?: string
          deal_type?: Database["public"]["Enums"]["deal_type"]
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_considerations?: string | null
          delivery_duration_months?: number
          expected_close_date?: string | null
          expected_start_date?: string | null
          final_commercial_assumptions?: string | null
          forecast_category?: Database["public"]["Enums"]["forecast_category"]
          id?: string
          is_deleted?: boolean
          key_stakeholder?: string | null
          latest_close_date?: string | null
          likely_service_area?: string | null
          likely_start_month?: string | null
          lost_date?: string | null
          lost_notes?: string | null
          lost_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          original_close_date?: string | null
          owner?: string | null
          primary_contact_id?: string | null
          problem_challenge?: string | null
          procurement_status?: string | null
          refined_problem?: string | null
          revenue_profile_type?: Database["public"]["Enums"]["revenue_profile"]
          scope_hypothesis?: string | null
          slip_count?: number
          source?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
          urgency_why_now?: string | null
          value?: number
          weighted_value?: number | null
          won_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      activity_status: "Scheduled" | "Completed" | "Cancelled"
      activity_type: "Meeting" | "Call" | "Email" | "Note"
      company_status: "active" | "inactive" | "prospect"
      deal_stage:
        | "Lead"
        | "Qualified"
        | "Discovery"
        | "Proposal"
        | "Commercials / Procurement"
        | "Verbal Commit"
        | "Closed Won"
        | "Closed Lost"
      deal_status: "open" | "closed_won" | "closed_lost"
      deal_type:
        | "Discovery"
        | "PoC"
        | "MVP"
        | "Implementation"
        | "Retainer"
        | "Managed Service"
      forecast_category:
        | "Pipeline"
        | "Best Case"
        | "Commit"
        | "Closed Won"
        | "Closed Lost"
      meeting_type:
        | "Intro"
        | "Qualification"
        | "Discovery"
        | "Proposal Review"
        | "Commercial"
        | "Internal"
      revenue_profile: "equal_spread" | "custom"
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
      activity_status: ["Scheduled", "Completed", "Cancelled"],
      activity_type: ["Meeting", "Call", "Email", "Note"],
      company_status: ["active", "inactive", "prospect"],
      deal_stage: [
        "Lead",
        "Qualified",
        "Discovery",
        "Proposal",
        "Commercials / Procurement",
        "Verbal Commit",
        "Closed Won",
        "Closed Lost",
      ],
      deal_status: ["open", "closed_won", "closed_lost"],
      deal_type: [
        "Discovery",
        "PoC",
        "MVP",
        "Implementation",
        "Retainer",
        "Managed Service",
      ],
      forecast_category: [
        "Pipeline",
        "Best Case",
        "Commit",
        "Closed Won",
        "Closed Lost",
      ],
      meeting_type: [
        "Intro",
        "Qualification",
        "Discovery",
        "Proposal Review",
        "Commercial",
        "Internal",
      ],
      revenue_profile: ["equal_spread", "custom"],
    },
  },
} as const
