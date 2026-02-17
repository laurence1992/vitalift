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
      client_program_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          id: string
          is_active: boolean
          program_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          id?: string
          is_active?: boolean
          program_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          id?: string
          is_active?: boolean
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_program_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_program_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_exercises: {
        Row: {
          archived_at: string | null
          category: string | null
          coach_id: string
          created_at: string
          equipment: string | null
          id: string
          image_url: string | null
          muscle_group: string | null
          name: string
          notes: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          archived_at?: string | null
          category?: string | null
          coach_id: string
          created_at?: string
          equipment?: string | null
          id?: string
          image_url?: string | null
          muscle_group?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          archived_at?: string | null
          category?: string | null
          coach_id?: string
          created_at?: string
          equipment?: string | null
          id?: string
          image_url?: string | null
          muscle_group?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_exercises_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string
          coach_id: string
          created_at: string
          id: string
        }
        Insert: {
          client_id: string
          coach_id: string
          created_at?: string
          id?: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_entries: {
        Row: {
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          body_fat: number | null
          bodyweight: number | null
          caloric_intake: number | null
          calories_burned: number | null
          client_id: string
          created_at: string
          date: string
          id: string
          resting_hr: number | null
          sleep_hours: number | null
          steps: number | null
        }
        Insert: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          body_fat?: number | null
          bodyweight?: number | null
          caloric_intake?: number | null
          calories_burned?: number | null
          client_id: string
          created_at?: string
          date?: string
          id?: string
          resting_hr?: number | null
          sleep_hours?: number | null
          steps?: number | null
        }
        Update: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          body_fat?: number | null
          bodyweight?: number | null
          caloric_intake?: number | null
          calories_burned?: number | null
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          resting_hr?: number | null
          sleep_hours?: number | null
          steps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          media_type: string
          media_url: string | null
          read_at: string | null
          sender_user_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string | null
          read_at?: string | null
          sender_user_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string | null
          read_at?: string | null
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          archived_at: string | null
          coach_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          archived_at?: string | null
          coach_id?: string | null
          created_at?: string
          email?: string
          id: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          archived_at?: string | null
          coach_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_days: {
        Row: {
          created_at: string
          day_note: string | null
          id: string
          label: string
          program_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          day_note?: string | null
          id?: string
          label?: string
          program_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          day_note?: string | null
          id?: string
          label?: string
          program_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercise_sets: {
        Row: {
          coach_note: string | null
          created_at: string
          id: string
          program_exercise_id: string
          rest_seconds: number | null
          set_index: number
          target_reps: string | null
          target_weight: number | null
        }
        Insert: {
          coach_note?: string | null
          created_at?: string
          id?: string
          program_exercise_id: string
          rest_seconds?: number | null
          set_index?: number
          target_reps?: string | null
          target_weight?: number | null
        }
        Update: {
          coach_note?: string | null
          created_at?: string
          id?: string
          program_exercise_id?: string
          rest_seconds?: number | null
          set_index?: number
          target_reps?: string | null
          target_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_exercise_sets_program_exercise_id_fkey"
            columns: ["program_exercise_id"]
            isOneToOne: false
            referencedRelation: "program_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          coach_notes: string | null
          created_at: string
          exercise_id: string
          id: string
          program_day_id: string
          rest_seconds: number | null
          sort_order: number
          target_reps: string | null
          target_sets: number
          target_weight: number | null
        }
        Insert: {
          coach_notes?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          program_day_id: string
          rest_seconds?: number | null
          sort_order?: number
          target_reps?: string | null
          target_sets?: number
          target_weight?: number | null
        }
        Update: {
          coach_notes?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          program_day_id?: string
          rest_seconds?: number | null
          sort_order?: number
          target_reps?: string | null
          target_sets?: number
          target_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "coach_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exercises_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_entries: {
        Row: {
          bodyweight: number | null
          client_id: string
          coach_id: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
        }
        Insert: {
          bodyweight?: number | null
          client_id: string
          coach_id?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
        }
        Update: {
          bodyweight?: number | null
          client_id?: string
          coach_id?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_entries_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          angle: string
          created_at: string
          id: string
          photo_url: string
          progress_entry_id: string
        }
        Insert: {
          angle?: string
          created_at?: string
          id?: string
          photo_url: string
          progress_entry_id: string
        }
        Update: {
          angle?: string
          created_at?: string
          id?: string
          photo_url?: string
          progress_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_photos_progress_entry_id_fkey"
            columns: ["progress_entry_id"]
            isOneToOne: false
            referencedRelation: "progress_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories: number | null
          carbs: number | null
          coach_id: string
          created_at: string
          fats: number | null
          id: string
          image_url: string | null
          ingredients: string | null
          instructions: string | null
          protein: number | null
          title: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          coach_id: string
          created_at?: string
          fats?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          instructions?: string | null
          protein?: number | null
          title: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          coach_id?: string
          created_at?: string
          fats?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          instructions?: string | null
          protein?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          reps: number | null
          set_number: number
          weight: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          reps?: number | null
          set_number: number
          weight?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          reps?: number | null
          set_number?: number
          weight?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          client_id: string
          created_at: string
          date: string
          day_id: string
          duration_seconds: number | null
          end_time: string | null
          id: string
          session_notes: string | null
          start_time: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          date?: string
          day_id: string
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          session_notes?: string | null
          start_time?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          day_id?: string
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          session_notes?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_coach_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      reconcile_orphan_clients: { Args: { _coach_id: string }; Returns: number }
    }
    Enums: {
      app_role: "coach" | "client"
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
      app_role: ["coach", "client"],
    },
  },
} as const
