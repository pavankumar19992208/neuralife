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
      academic_years: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_current: boolean | null
          school_id: string
          start_date: string
          year_label: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_current?: boolean | null
          school_id: string
          start_date: string
          year_label: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_current?: boolean | null
          school_id?: string
          start_date?: string
          year_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_share_tokens: {
        Row: {
          access_count: number
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          school_id: string
          token: string
          url_path: string
        }
        Insert: {
          access_count?: number
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          school_id: string
          token: string
          url_path: string
        }
        Update: {
          access_count?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          school_id?: string
          token?: string
          url_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_share_tokens_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          academic_year_id: string
          attendance_date: string
          device_id: string | null
          id: string
          marked_at: string
          marked_by: string
          neura_id: string
          period_number: number | null
          reason: string | null
          school_id: string
          signature_hash: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          academic_year_id: string
          attendance_date: string
          device_id?: string | null
          id?: string
          marked_at?: string
          marked_by: string
          neura_id: string
          period_number?: number | null
          reason?: string | null
          school_id: string
          signature_hash?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          academic_year_id?: string
          attendance_date?: string
          device_id?: string | null
          id?: string
          marked_at?: string
          marked_by?: string
          neura_id?: string
          period_number?: number | null
          reason?: string | null
          school_id?: string
          signature_hash?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_corrections: {
        Row: {
          attendance_date: string
          corrected_at: string
          corrected_by: string
          corrected_status: Database["public"]["Enums"]["attendance_status"]
          correction_time: string | null
          id: string
          neura_id: string
          original_attendance_id: string
          original_status: Database["public"]["Enums"]["attendance_status"]
          reason: string | null
          school_id: string
        }
        Insert: {
          attendance_date: string
          corrected_at?: string
          corrected_by: string
          corrected_status: Database["public"]["Enums"]["attendance_status"]
          correction_time?: string | null
          id?: string
          neura_id: string
          original_attendance_id: string
          original_status: Database["public"]["Enums"]["attendance_status"]
          reason?: string | null
          school_id: string
        }
        Update: {
          attendance_date?: string
          corrected_at?: string
          corrected_by?: string
          corrected_status?: Database["public"]["Enums"]["attendance_status"]
          correction_time?: string | null
          id?: string
          neura_id?: string
          original_attendance_id?: string
          original_status?: Database["public"]["Enums"]["attendance_status"]
          reason?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "attendance_corrections_original_attendance_id_fkey"
            columns: ["original_attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action_detail: Json | null
          actor_id: string | null
          actor_mobile: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string | null
          event_type: string
          id: string
          ip_address_hash: string | null
          result: string
          school_id: string | null
          target_id: string | null
          target_neura_id: string | null
          target_table: string | null
        }
        Insert: {
          action_detail?: Json | null
          actor_id?: string | null
          actor_mobile?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string | null
          event_type: string
          id?: string
          ip_address_hash?: string | null
          result: string
          school_id?: string | null
          target_id?: string | null
          target_neura_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_detail?: Json | null
          actor_id?: string | null
          actor_mobile?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address_hash?: string | null
          result?: string
          school_id?: string | null
          target_id?: string | null
          target_neura_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          academic_year_id: string | null
          auto_posted_to_sphere: boolean | null
          badge_description: string | null
          badge_name: string
          badge_type: string
          earned_at: string | null
          id: string
          model_version: string | null
          neura_id: string
          pin_position: number | null
          pinned_on_profile: boolean | null
          school_id: string
          sphere_post_id: string | null
          subject: string | null
          visible_band_minimum: Database["public"]["Enums"]["age_band"] | null
        }
        Insert: {
          academic_year_id?: string | null
          auto_posted_to_sphere?: boolean | null
          badge_description?: string | null
          badge_name: string
          badge_type: string
          earned_at?: string | null
          id?: string
          model_version?: string | null
          neura_id: string
          pin_position?: number | null
          pinned_on_profile?: boolean | null
          school_id: string
          sphere_post_id?: string | null
          subject?: string | null
          visible_band_minimum?: Database["public"]["Enums"]["age_band"] | null
        }
        Update: {
          academic_year_id?: string | null
          auto_posted_to_sphere?: boolean | null
          badge_description?: string | null
          badge_name?: string
          badge_type?: string
          earned_at?: string | null
          id?: string
          model_version?: string | null
          neura_id?: string
          pin_position?: number | null
          pinned_on_profile?: boolean | null
          school_id?: string
          sphere_post_id?: string | null
          subject?: string | null
          visible_band_minimum?: Database["public"]["Enums"]["age_band"] | null
        }
        Relationships: [
          {
            foreignKeyName: "badges_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "badges_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_sphere_post_id_fkey"
            columns: ["sphere_post_id"]
            isOneToOne: false
            referencedRelation: "neurasphere_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      behaviour_incidents: {
        Row: {
          academic_year_id: string
          action_taken: string | null
          category: Database["public"]["Enums"]["behaviour_category"]
          created_at: string | null
          description: string
          id: string
          incident_date: string
          logged_by: string
          neura_id: string
          parent_visible: boolean
          school_id: string
        }
        Insert: {
          academic_year_id: string
          action_taken?: string | null
          category: Database["public"]["Enums"]["behaviour_category"]
          created_at?: string | null
          description: string
          id?: string
          incident_date?: string
          logged_by: string
          neura_id: string
          parent_visible: boolean
          school_id: string
        }
        Update: {
          academic_year_id?: string
          action_taken?: string | null
          category?: Database["public"]["Enums"]["behaviour_category"]
          created_at?: string | null
          description?: string
          id?: string
          incident_date?: string
          logged_by?: string
          neura_id?: string
          parent_visible?: boolean
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behaviour_incidents_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behaviour_incidents_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behaviour_incidents_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "behaviour_incidents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      board_exam_results: {
        Row: {
          academic_year_id: string | null
          exam_year: number
          grade: string | null
          id: string
          marks: number
          max_marks: number
          neura_id: string
          school_id: string
          subject: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          academic_year_id?: string | null
          exam_year: number
          grade?: string | null
          id?: string
          marks: number
          max_marks?: number
          neura_id: string
          school_id: string
          subject: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          academic_year_id?: string | null
          exam_year?: number
          grade?: string | null
          id?: string
          marks?: number
          max_marks?: number
          neura_id?: string
          school_id?: string
          subject?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_exam_results_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_exam_results_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "board_exam_results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_routes: {
        Row: {
          conductor_name: string | null
          created_at: string | null
          driver_mobile: string | null
          driver_name: string | null
          id: string
          route_name: string
          route_number: string | null
          school_id: string
          status: string | null
          vehicle_number: string | null
        }
        Insert: {
          conductor_name?: string | null
          created_at?: string | null
          driver_mobile?: string | null
          driver_name?: string | null
          id?: string
          route_name: string
          route_number?: string | null
          school_id: string
          status?: string | null
          vehicle_number?: string | null
        }
        Update: {
          conductor_name?: string | null
          created_at?: string | null
          driver_mobile?: string | null
          driver_name?: string | null
          id?: string
          route_name?: string
          route_number?: string | null
          school_id?: string
          status?: string | null
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_routes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_stops: {
        Row: {
          afternoon_drop_time: string | null
          id: string
          morning_pickup_time: string | null
          route_id: string
          school_id: string
          stop_name: string
          stop_order: number
        }
        Insert: {
          afternoon_drop_time?: string | null
          id?: string
          morning_pickup_time?: string | null
          route_id: string
          school_id: string
          stop_name: string
          stop_order: number
        }
        Update: {
          afternoon_drop_time?: string | null
          id?: string
          morning_pickup_time?: string | null
          route_id?: string
          school_id?: string
          stop_name?: string
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "bus_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_stops_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      calibrated_mastery_scores: {
        Row: {
          calibrated_percentile: number | null
          calibration_version: string | null
          classification: Database["public"]["Enums"]["mastery_classification"]
          computed_date: string
          id: string
          neura_id: string
          population_sample_size: number | null
          raw_score: number
          school_id: string
          subject: string
          topic: string
          vs_class_avg: number | null
          vs_school_avg: number | null
        }
        Insert: {
          calibrated_percentile?: number | null
          calibration_version?: string | null
          classification: Database["public"]["Enums"]["mastery_classification"]
          computed_date: string
          id?: string
          neura_id: string
          population_sample_size?: number | null
          raw_score: number
          school_id: string
          subject: string
          topic: string
          vs_class_avg?: number | null
          vs_school_avg?: number | null
        }
        Update: {
          calibrated_percentile?: number | null
          calibration_version?: string | null
          classification?: Database["public"]["Enums"]["mastery_classification"]
          computed_date?: string
          id?: string
          neura_id?: string
          population_sample_size?: number | null
          raw_score?: number
          school_id?: string
          subject?: string
          topic?: string
          vs_class_avg?: number | null
          vs_school_avg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calibrated_mastery_scores_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      calibration_baselines: {
        Row: {
          at_risk_threshold: number | null
          board: Database["public"]["Enums"]["board_type"]
          class_year: number
          computed_at: string
          id: string
          mastered_threshold: number | null
          mean_raw_score: number
          p25: number | null
          p50: number | null
          p75: number | null
          p90: number | null
          sample_size: number
          std_dev: number
          subject: string
          topic: string
        }
        Insert: {
          at_risk_threshold?: number | null
          board: Database["public"]["Enums"]["board_type"]
          class_year: number
          computed_at: string
          id?: string
          mastered_threshold?: number | null
          mean_raw_score: number
          p25?: number | null
          p50?: number | null
          p75?: number | null
          p90?: number | null
          sample_size: number
          std_dev: number
          subject: string
          topic: string
        }
        Update: {
          at_risk_threshold?: number | null
          board?: Database["public"]["Enums"]["board_type"]
          class_year?: number
          computed_at?: string
          id?: string
          mastered_threshold?: number | null
          mean_raw_score?: number
          p25?: number | null
          p50?: number | null
          p75?: number | null
          p90?: number | null
          sample_size?: number
          std_dev?: number
          subject?: string
          topic?: string
        }
        Relationships: []
      }
      circle_memberships: {
        Row: {
          circle_id: string
          id: string
          joined_at: string | null
          neura_id: string
          status: string | null
        }
        Insert: {
          circle_id: string
          id?: string
          joined_at?: string | null
          neura_id: string
          status?: string | null
        }
        Update: {
          circle_id?: string
          id?: string
          joined_at?: string | null
          neura_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_memberships_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "learning_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_memberships_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      concessions: {
        Row: {
          academic_year_id: string
          approved_at: string | null
          approved_by: string | null
          concession_type: Database["public"]["Enums"]["concession_type"]
          created_at: string | null
          deduction_amount: number | null
          deduction_percentage: number | null
          fee_head: Database["public"]["Enums"]["fee_head"] | null
          id: string
          is_active: boolean | null
          neura_id: string
          reason: string | null
          school_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          academic_year_id: string
          approved_at?: string | null
          approved_by?: string | null
          concession_type: Database["public"]["Enums"]["concession_type"]
          created_at?: string | null
          deduction_amount?: number | null
          deduction_percentage?: number | null
          fee_head?: Database["public"]["Enums"]["fee_head"] | null
          id?: string
          is_active?: boolean | null
          neura_id: string
          reason?: string | null
          school_id: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          academic_year_id?: string
          approved_at?: string | null
          approved_by?: string | null
          concession_type?: Database["public"]["Enums"]["concession_type"]
          created_at?: string | null
          deduction_amount?: number | null
          deduction_percentage?: number | null
          fee_head?: Database["public"]["Enums"]["fee_head"] | null
          id?: string
          is_active?: boolean | null
          neura_id?: string
          reason?: string | null
          school_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concessions_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concessions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concessions_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "concessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_text_version: string
          consent_type: string
          consented_at: string
          consented_by_id: string | null
          consented_by_mobile: string | null
          consented_by_role: Database["public"]["Enums"]["user_role"]
          id: string
          ip_address_hash: string | null
          neura_id: string
          school_id: string
          withdrawal_reason: string | null
          withdrawn_at: string | null
        }
        Insert: {
          consent_text_version: string
          consent_type: string
          consented_at?: string
          consented_by_id?: string | null
          consented_by_mobile?: string | null
          consented_by_role: Database["public"]["Enums"]["user_role"]
          id?: string
          ip_address_hash?: string | null
          neura_id: string
          school_id: string
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          consent_text_version?: string
          consent_type?: string
          consented_at?: string
          consented_by_id?: string | null
          consented_by_mobile?: string | null
          consented_by_role?: Database["public"]["Enums"]["user_role"]
          id?: string
          ip_address_hash?: string | null
          neura_id?: string
          school_id?: string
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      content_chapters: {
        Row: {
          audit_status: string | null
          audited_at: string | null
          audited_by: string | null
          band: Database["public"]["Enums"]["age_band"]
          board: Database["public"]["Enums"]["board_type"]
          bundle_size_kb: number | null
          bundle_url: string | null
          bundle_version: string | null
          chapter_number: number
          chapter_title: string
          checksum_sha256: string | null
          class_year: number
          created_at: string | null
          id: string
          medium: Database["public"]["Enums"]["medium_type"]
          prerequisite_chapters: string[] | null
          published: boolean | null
          subject: string
          topic_count: number | null
        }
        Insert: {
          audit_status?: string | null
          audited_at?: string | null
          audited_by?: string | null
          band: Database["public"]["Enums"]["age_band"]
          board: Database["public"]["Enums"]["board_type"]
          bundle_size_kb?: number | null
          bundle_url?: string | null
          bundle_version?: string | null
          chapter_number: number
          chapter_title: string
          checksum_sha256?: string | null
          class_year: number
          created_at?: string | null
          id: string
          medium: Database["public"]["Enums"]["medium_type"]
          prerequisite_chapters?: string[] | null
          published?: boolean | null
          subject: string
          topic_count?: number | null
        }
        Update: {
          audit_status?: string | null
          audited_at?: string | null
          audited_by?: string | null
          band?: Database["public"]["Enums"]["age_band"]
          board?: Database["public"]["Enums"]["board_type"]
          bundle_size_kb?: number | null
          bundle_url?: string | null
          bundle_version?: string | null
          chapter_number?: number
          chapter_title?: string
          checksum_sha256?: string | null
          class_year?: number
          created_at?: string | null
          id?: string
          medium?: Database["public"]["Enums"]["medium_type"]
          prerequisite_chapters?: string[] | null
          published?: boolean | null
          subject?: string
          topic_count?: number | null
        }
        Relationships: []
      }
      content_recommendations: {
        Row: {
          chapter_ids: string[] | null
          completed_at: string | null
          id: string
          neura_id: string
          problem_set_ids: string[] | null
          pushed_at: string | null
          pushed_to_device: boolean | null
          reason: string
          recommended_at: string | null
          school_id: string
          started_at: string | null
          subject: string
          topic: string
        }
        Insert: {
          chapter_ids?: string[] | null
          completed_at?: string | null
          id?: string
          neura_id: string
          problem_set_ids?: string[] | null
          pushed_at?: string | null
          pushed_to_device?: boolean | null
          reason: string
          recommended_at?: string | null
          school_id: string
          started_at?: string | null
          subject: string
          topic: string
        }
        Update: {
          chapter_ids?: string[] | null
          completed_at?: string | null
          id?: string
          neura_id?: string
          problem_set_ids?: string[] | null
          pushed_at?: string | null
          pushed_to_device?: boolean | null
          reason?: string
          recommended_at?: string | null
          school_id?: string
          started_at?: string | null
          subject?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_recommendations_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      content_topics: {
        Row: {
          chapter_id: string
          created_at: string | null
          error_pattern_tags: string[] | null
          estimated_minutes: number | null
          has_animation: boolean | null
          has_diagram: boolean | null
          has_interaction: boolean | null
          id: string
          interaction_type: string | null
          prerequisite_topics: string[] | null
          problem_count: number | null
          topic_number: number
          topic_title: string
        }
        Insert: {
          chapter_id: string
          created_at?: string | null
          error_pattern_tags?: string[] | null
          estimated_minutes?: number | null
          has_animation?: boolean | null
          has_diagram?: boolean | null
          has_interaction?: boolean | null
          id: string
          interaction_type?: string | null
          prerequisite_topics?: string[] | null
          problem_count?: number | null
          topic_number: number
          topic_title: string
        }
        Update: {
          chapter_id?: string
          created_at?: string | null
          error_pattern_tags?: string[] | null
          estimated_minutes?: number | null
          has_animation?: boolean | null
          has_diagram?: boolean | null
          has_interaction?: boolean | null
          id?: string
          interaction_type?: string | null
          prerequisite_topics?: string[] | null
          problem_count?: number | null
          topic_number?: number
          topic_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "content_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_chapters: {
        Row: {
          chapter_number: number
          created_at: string | null
          id: string
          textbook_id: string
          title_en: string
          title_te: string | null
        }
        Insert: {
          chapter_number: number
          created_at?: string | null
          id?: string
          textbook_id: string
          title_en: string
          title_te?: string | null
        }
        Update: {
          chapter_number?: number
          created_at?: string | null
          id?: string
          textbook_id?: string
          title_en?: string
          title_te?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_chapters_textbook_id_fkey"
            columns: ["textbook_id"]
            isOneToOne: false
            referencedRelation: "cs_textbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_generated_content: {
        Row: {
          audit_status: string
          generated_at: string | null
          generated_by: string | null
          id: string
          last_modified_at: string | null
          medium: string
          segments: Json
          topic_id: string
        }
        Insert: {
          audit_status?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          last_modified_at?: string | null
          medium: string
          segments?: Json
          topic_id: string
        }
        Update: {
          audit_status?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          last_modified_at?: string | null
          medium?: string
          segments?: Json
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_generated_content_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "cs_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_grade_subjects: {
        Row: {
          board: string
          created_at: string
          grade: number
          id: string
          subject_en: string
          subject_te: string | null
        }
        Insert: {
          board: string
          created_at?: string
          grade: number
          id?: string
          subject_en: string
          subject_te?: string | null
        }
        Update: {
          board?: string
          created_at?: string
          grade?: number
          id?: string
          subject_en?: string
          subject_te?: string | null
        }
        Relationships: []
      }
      cs_textbooks: {
        Row: {
          board: string
          created_at: string | null
          grade: number
          id: string
          subject: string
        }
        Insert: {
          board: string
          created_at?: string | null
          grade: number
          id?: string
          subject: string
        }
        Update: {
          board?: string
          created_at?: string | null
          grade?: number
          id?: string
          subject?: string
        }
        Relationships: []
      }
      cs_topics: {
        Row: {
          chapter_id: string
          created_at: string | null
          id: string
          title_en: string
          title_te: string | null
          topic_number: number
        }
        Insert: {
          chapter_id: string
          created_at?: string | null
          id?: string
          title_en: string
          title_te?: string | null
          topic_number: number
        }
        Update: {
          chapter_id?: string
          created_at?: string | null
          id?: string
          title_en?: string
          title_te?: string | null
          topic_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "cs_topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "cs_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_patterns: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          affected_schools: number | null
          affected_students: number | null
          ai_recommendation: string | null
          board: Database["public"]["Enums"]["board_type"] | null
          class_year: number | null
          detected_at: string | null
          failure_rate: number
          id: string
          pattern_type: Database["public"]["Enums"]["pattern_type"]
          resolution_note: string | null
          school_id: string | null
          severity: string | null
          status: string | null
          subject: string
          top_error_patterns: string[] | null
          topic: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_schools?: number | null
          affected_students?: number | null
          ai_recommendation?: string | null
          board?: Database["public"]["Enums"]["board_type"] | null
          class_year?: number | null
          detected_at?: string | null
          failure_rate: number
          id?: string
          pattern_type: Database["public"]["Enums"]["pattern_type"]
          resolution_note?: string | null
          school_id?: string | null
          severity?: string | null
          status?: string | null
          subject: string
          top_error_patterns?: string[] | null
          topic: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_schools?: number | null
          affected_students?: number | null
          ai_recommendation?: string | null
          board?: Database["public"]["Enums"]["board_type"] | null
          class_year?: number | null
          detected_at?: string | null
          failure_rate?: number
          id?: string
          pattern_type?: Database["public"]["Enums"]["pattern_type"]
          resolution_note?: string | null
          school_id?: string | null
          severity?: string | null
          status?: string | null
          subject?: string
          top_error_patterns?: string[] | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_patterns_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fee_head_amounts: {
        Row: {
          amount: number
          class_year: number | null
          custom_fee_head_id: string
          id: string
          student_category: Database["public"]["Enums"]["fee_category"] | null
        }
        Insert: {
          amount?: number
          class_year?: number | null
          custom_fee_head_id: string
          id?: string
          student_category?: Database["public"]["Enums"]["fee_category"] | null
        }
        Update: {
          amount?: number
          class_year?: number | null
          custom_fee_head_id?: string
          id?: string
          student_category?: Database["public"]["Enums"]["fee_category"] | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_fee_head_amounts_custom_fee_head_id_fkey"
            columns: ["custom_fee_head_id"]
            isOneToOne: false
            referencedRelation: "custom_fee_heads"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fee_heads: {
        Row: {
          academic_year_id: string
          collection_type: string
          created_at: string | null
          description: string | null
          display_name: string
          head_code: string
          id: string
          is_active: boolean | null
          school_id: string
        }
        Insert: {
          academic_year_id: string
          collection_type: string
          created_at?: string | null
          description?: string | null
          display_name: string
          head_code: string
          id?: string
          is_active?: boolean | null
          school_id: string
        }
        Update: {
          academic_year_id?: string
          collection_type?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          head_code?: string
          id?: string
          is_active?: boolean | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fee_heads_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_fee_heads_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_requests: {
        Row: {
          cancellation_deadline: string | null
          cancelled_at: string | null
          completed_at: string | null
          completion_confirmed_at: string | null
          execution_deadline: string | null
          id: string
          neura_id: string
          reference_code: string
          requested_at: string | null
          requested_by_mobile: string
          status: string | null
        }
        Insert: {
          cancellation_deadline?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          completion_confirmed_at?: string | null
          execution_deadline?: string | null
          id?: string
          neura_id: string
          reference_code: string
          requested_at?: string | null
          requested_by_mobile: string
          status?: string | null
        }
        Update: {
          cancellation_deadline?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          completion_confirmed_at?: string | null
          execution_deadline?: string | null
          id?: string
          neura_id?: string
          reference_code?: string
          requested_at?: string | null
          requested_by_mobile?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deletion_requests_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      exam_marks: {
        Row: {
          entered_at: string | null
          entered_by: string | null
          exam_id: string
          exam_subject_id: string
          id: string
          is_absent: boolean
          marks_obtained: number | null
          neura_id: string
          updated_at: string
        }
        Insert: {
          entered_at?: string | null
          entered_by?: string | null
          exam_id: string
          exam_subject_id: string
          id?: string
          is_absent?: boolean
          marks_obtained?: number | null
          neura_id: string
          updated_at?: string
        }
        Update: {
          entered_at?: string | null
          entered_by?: string | null
          exam_id?: string
          exam_subject_id?: string
          id?: string
          is_absent?: boolean
          marks_obtained?: number | null
          neura_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_marks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_marks_exam_subject_id_fkey"
            columns: ["exam_subject_id"]
            isOneToOne: false
            referencedRelation: "exam_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_marks_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      exam_results: {
        Row: {
          class_rank: number | null
          class_year: number | null
          computed_at: string
          exam_id: string
          grade: string
          id: string
          is_pass: boolean
          neura_id: string
          neuracoin_earned: number
          overall_rank: number | null
          percentage: number
          section: string | null
          subject_results: Json
          teacher_remarks: string | null
          total_marks_obtained: number
          total_max_marks: number
        }
        Insert: {
          class_rank?: number | null
          class_year?: number | null
          computed_at?: string
          exam_id: string
          grade: string
          id?: string
          is_pass: boolean
          neura_id: string
          neuracoin_earned?: number
          overall_rank?: number | null
          percentage: number
          section?: string | null
          subject_results?: Json
          teacher_remarks?: string | null
          total_marks_obtained: number
          total_max_marks: number
        }
        Update: {
          class_rank?: number | null
          class_year?: number | null
          computed_at?: string
          exam_id?: string
          grade?: string
          id?: string
          is_pass?: boolean
          neura_id?: string
          neuracoin_earned?: number
          overall_rank?: number | null
          percentage?: number
          section?: string | null
          subject_results?: Json
          teacher_remarks?: string | null
          total_marks_obtained?: number
          total_max_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      exam_subject_chapters: {
        Row: {
          chapter_id: string
          exam_subject_id: string
          id: string
        }
        Insert: {
          chapter_id: string
          exam_subject_id: string
          id?: string
        }
        Update: {
          chapter_id?: string
          exam_subject_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_subject_chapters_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "cs_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_subject_chapters_exam_subject_id_fkey"
            columns: ["exam_subject_id"]
            isOneToOne: false
            referencedRelation: "exam_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_subjects: {
        Row: {
          class_year: number
          created_at: string
          exam_date: string | null
          exam_id: string
          id: string
          max_marks: number
          pass_marks: number
          section: string | null
          subject: string
          teacher_id: string | null
        }
        Insert: {
          class_year: number
          created_at?: string
          exam_date?: string | null
          exam_id: string
          id?: string
          max_marks?: number
          pass_marks?: number
          section?: string | null
          subject: string
          teacher_id?: string | null
        }
        Update: {
          class_year?: number
          created_at?: string
          exam_date?: string | null
          exam_id?: string
          id?: string
          max_marks?: number
          pass_marks?: number
          section?: string | null
          subject?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_subjects_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          academic_year_id: string
          ai_insight: string | null
          chapter_ids: Json
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          end_date: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          name: string
          schedule_type: string
          school_id: string
          start_date: string
          status: Database["public"]["Enums"]["exam_status"]
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          ai_insight?: string | null
          chapter_ids?: Json
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          end_date: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          id?: string
          name: string
          schedule_type?: string
          school_id: string
          start_date: string
          status?: Database["public"]["Enums"]["exam_status"]
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          ai_insight?: string | null
          chapter_ids?: Json
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          name?: string
          schedule_type?: string
          school_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["exam_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          app_version: string | null
          device_platform: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          registered_at: string | null
          token: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          app_version?: string | null
          device_platform?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          registered_at?: string | null
          token: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          app_version?: string | null
          device_platform?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          registered_at?: string | null
          token?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      fee_concession_rules: {
        Row: {
          academic_year_id: string | null
          amount_type: string
          applies_to_heads: string[] | null
          auto_apply: boolean | null
          concession_type: Database["public"]["Enums"]["concession_type"]
          concession_value: number
          created_at: string | null
          eligibility_note: string | null
          id: string
          is_active: boolean | null
          max_cap: number | null
          rule_name: string
          school_id: string
        }
        Insert: {
          academic_year_id?: string | null
          amount_type: string
          applies_to_heads?: string[] | null
          auto_apply?: boolean | null
          concession_type: Database["public"]["Enums"]["concession_type"]
          concession_value: number
          created_at?: string | null
          eligibility_note?: string | null
          id?: string
          is_active?: boolean | null
          max_cap?: number | null
          rule_name: string
          school_id: string
        }
        Update: {
          academic_year_id?: string | null
          amount_type?: string
          applies_to_heads?: string[] | null
          auto_apply?: boolean | null
          concession_type?: Database["public"]["Enums"]["concession_type"]
          concession_value?: number
          created_at?: string | null
          eligibility_note?: string | null
          id?: string
          is_active?: boolean | null
          max_cap?: number | null
          rule_name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_concession_rules_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_concession_rules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_ledger: {
        Row: {
          academic_year_id: string
          amount_due: number
          amount_paid: number | null
          amount_waived: number | null
          auto_generated: boolean | null
          created_at: string | null
          custom_fee_head_id: string | null
          custom_head_label: string | null
          due_date: string
          exam_schedule_id: string | null
          fee_head: Database["public"]["Enums"]["fee_head"]
          id: string
          neura_id: string
          period_label: string | null
          school_id: string
          status: Database["public"]["Enums"]["fee_status"] | null
        }
        Insert: {
          academic_year_id: string
          amount_due: number
          amount_paid?: number | null
          amount_waived?: number | null
          auto_generated?: boolean | null
          created_at?: string | null
          custom_fee_head_id?: string | null
          custom_head_label?: string | null
          due_date: string
          exam_schedule_id?: string | null
          fee_head: Database["public"]["Enums"]["fee_head"]
          id?: string
          neura_id: string
          period_label?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["fee_status"] | null
        }
        Update: {
          academic_year_id?: string
          amount_due?: number
          amount_paid?: number | null
          amount_waived?: number | null
          auto_generated?: boolean | null
          created_at?: string | null
          custom_fee_head_id?: string | null
          custom_head_label?: string | null
          due_date?: string
          exam_schedule_id?: string | null
          fee_head?: Database["public"]["Enums"]["fee_head"]
          id?: string
          neura_id?: string
          period_label?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["fee_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_ledger_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_ledger_custom_fee_head_id_fkey"
            columns: ["custom_fee_head_id"]
            isOneToOne: false
            referencedRelation: "custom_fee_heads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_ledger_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "fee_ledger_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payment_allocations: {
        Row: {
          amount_allocated: number
          created_at: string | null
          id: string
          ledger_id: string
          payment_id: string
        }
        Insert: {
          amount_allocated: number
          created_at?: string | null
          id?: string
          ledger_id: string
          payment_id: string
        }
        Update: {
          amount_allocated?: number
          created_at?: string | null
          id?: string
          ledger_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payment_allocations_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "fee_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "fee_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          academic_year_id: string
          collected_by: string
          created_at: string | null
          id: string
          neura_id: string
          notes: string | null
          payment_date: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          receipt_number: string
          school_id: string
          total_amount: number
          transaction_reference: string | null
          void_reason: string | null
          voided: boolean | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          academic_year_id: string
          collected_by: string
          created_at?: string | null
          id?: string
          neura_id: string
          notes?: string | null
          payment_date?: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          receipt_number: string
          school_id: string
          total_amount: number
          transaction_reference?: string | null
          void_reason?: string | null
          voided?: boolean | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          academic_year_id?: string
          collected_by?: string
          created_at?: string | null
          id?: string
          neura_id?: string
          notes?: string | null
          payment_date?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          receipt_number?: string
          school_id?: string
          total_amount?: number
          transaction_reference?: string | null
          void_reason?: string | null
          voided?: boolean | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year_id: string
          admission_fee: number | null
          class_year: number
          created_at: string | null
          development_fee: number | null
          exam_fee_per_term: number | null
          fee_due_day_of_month: number | null
          id: string
          late_fee_amount: number | null
          late_fee_grace_days: number | null
          neuralife_sub_monthly: number | null
          school_id: string
          smartpad_emi_amount: number | null
          smartpad_emi_months: number | null
          smartpad_fee: number | null
          student_category: Database["public"]["Enums"]["fee_category"]
          transport_fee_monthly: number | null
          tuition_fee_monthly: number | null
        }
        Insert: {
          academic_year_id: string
          admission_fee?: number | null
          class_year: number
          created_at?: string | null
          development_fee?: number | null
          exam_fee_per_term?: number | null
          fee_due_day_of_month?: number | null
          id?: string
          late_fee_amount?: number | null
          late_fee_grace_days?: number | null
          neuralife_sub_monthly?: number | null
          school_id: string
          smartpad_emi_amount?: number | null
          smartpad_emi_months?: number | null
          smartpad_fee?: number | null
          student_category: Database["public"]["Enums"]["fee_category"]
          transport_fee_monthly?: number | null
          tuition_fee_monthly?: number | null
        }
        Update: {
          academic_year_id?: string
          admission_fee?: number | null
          class_year?: number
          created_at?: string | null
          development_fee?: number | null
          exam_fee_per_term?: number | null
          fee_due_day_of_month?: number | null
          id?: string
          late_fee_amount?: number | null
          late_fee_grace_days?: number | null
          neuralife_sub_monthly?: number | null
          school_id?: string
          smartpad_emi_amount?: number | null
          smartpad_emi_months?: number | null
          smartpad_fee?: number | null
          student_category?: Database["public"]["Enums"]["fee_category"]
          transport_fee_monthly?: number | null
          tuition_fee_monthly?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_config: {
        Row: {
          display_color: string
          grade_label: string
          grade_points: number
          id: string
          max_percentage: number
          min_percentage: number
          neuracoin_reward: number
          school_id: string | null
          sort_order: number
        }
        Insert: {
          display_color?: string
          grade_label: string
          grade_points?: number
          id?: string
          max_percentage: number
          min_percentage: number
          neuracoin_reward?: number
          school_id?: string | null
          sort_order?: number
        }
        Update: {
          display_color?: string
          grade_label?: string
          grade_points?: number
          id?: string
          max_percentage?: number
          min_percentage?: number
          neuracoin_reward?: number
          school_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_config_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          academic_year_id: string
          class_year: number
          content_ref: string | null
          created_at: string | null
          differentiated_version: string | null
          due_date: string
          has_differentiated: boolean | null
          homework_type: string | null
          id: string
          instructions: string | null
          school_id: string
          section: string
          standard_version: string | null
          subject: string
          teacher_id: string
          title: string
        }
        Insert: {
          academic_year_id: string
          class_year: number
          content_ref?: string | null
          created_at?: string | null
          differentiated_version?: string | null
          due_date: string
          has_differentiated?: boolean | null
          homework_type?: string | null
          id?: string
          instructions?: string | null
          school_id: string
          section: string
          standard_version?: string | null
          subject: string
          teacher_id: string
          title: string
        }
        Update: {
          academic_year_id?: string
          class_year?: number
          content_ref?: string | null
          created_at?: string | null
          differentiated_version?: string | null
          due_date?: string
          has_differentiated?: boolean | null
          homework_type?: string | null
          id?: string
          instructions?: string | null
          school_id?: string
          section?: string
          standard_version?: string | null
          subject?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          canvas_page_ref: string | null
          created_at: string | null
          homework_id: string
          id: string
          is_late: boolean | null
          neura_id: string
          school_id: string
          status: string | null
          submission_source: string | null
          submitted_at: string | null
          teacher_remarks: string | null
        }
        Insert: {
          canvas_page_ref?: string | null
          created_at?: string | null
          homework_id: string
          id?: string
          is_late?: boolean | null
          neura_id: string
          school_id: string
          status?: string | null
          submission_source?: string | null
          submitted_at?: string | null
          teacher_remarks?: string | null
        }
        Update: {
          canvas_page_ref?: string | null
          created_at?: string | null
          homework_id?: string
          id?: string
          is_late?: boolean | null
          neura_id?: string
          school_id?: string
          status?: string | null
          submission_source?: string | null
          submitted_at?: string | null
          teacher_remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "homework_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          key: string
          response_body: Json
          status_code: number
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          key: string
          response_body: Json
          status_code: number
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          key?: string
          response_body?: Json
          status_code?: number
        }
        Relationships: []
      }
      interventions: {
        Row: {
          follow_up_date: string | null
          id: string
          intervention_type: string
          logged_at: string | null
          logged_by: string
          neura_id: string
          notes: string | null
          outcome: string | null
          school_id: string
          subject: string | null
        }
        Insert: {
          follow_up_date?: string | null
          id?: string
          intervention_type: string
          logged_at?: string | null
          logged_by: string
          neura_id: string
          notes?: string | null
          outcome?: string | null
          school_id: string
          subject?: string | null
        }
        Update: {
          follow_up_date?: string | null
          id?: string
          intervention_type?: string
          logged_at?: string | null
          logged_by?: string
          neura_id?: string
          notes?: string | null
          outcome?: string | null
          school_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interventions_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "interventions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_circles: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          member_count: number | null
          name: string
          subject_tag: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name: string
          subject_tag?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name?: string
          subject_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_circles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      leave_applications: {
        Row: {
          created_at: string | null
          days_count: number
          from_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          status: Database["public"]["Enums"]["leave_status"] | null
          substitute_teacher_id: string | null
          teacher_id: string
          to_date: string
        }
        Insert: {
          created_at?: string | null
          days_count: number
          from_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          substitute_teacher_id?: string | null
          teacher_id: string
          to_date: string
        }
        Update: {
          created_at?: string | null
          days_count?: number
          from_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          substitute_teacher_id?: string | null
          teacher_id?: string
          to_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_substitute_teacher_id_fkey"
            columns: ["substitute_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          cl_entitled: number | null
          cl_used: number | null
          created_at: string | null
          el_entitled: number | null
          el_used: number | null
          id: string
          leave_year_label: string
          lop_days: number | null
          school_id: string
          sl_entitled: number | null
          sl_used: number | null
          teacher_id: string
        }
        Insert: {
          cl_entitled?: number | null
          cl_used?: number | null
          created_at?: string | null
          el_entitled?: number | null
          el_used?: number | null
          id?: string
          leave_year_label: string
          lop_days?: number | null
          school_id: string
          sl_entitled?: number | null
          sl_used?: number | null
          teacher_id: string
        }
        Update: {
          cl_entitled?: number | null
          cl_used?: number | null
          created_at?: string | null
          el_entitled?: number | null
          el_used?: number | null
          id?: string
          leave_year_label?: string
          lop_days?: number | null
          school_id?: string
          sl_entitled?: number | null
          sl_used?: number | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      marks_entry_audit: {
        Row: {
          action: string
          created_at: string
          entered_by: string
          exam_id: string
          exam_subject_id: string
          id: string
          neura_id: string
          new_marks: number | null
          old_marks: number | null
          reason: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entered_by: string
          exam_id: string
          exam_subject_id: string
          id?: string
          neura_id: string
          new_marks?: number | null
          old_marks?: number | null
          reason?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entered_by?: string
          exam_id?: string
          exam_subject_id?: string
          id?: string
          neura_id?: string
          new_marks?: number | null
          old_marks?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marks_entry_audit_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_entry_audit_exam_subject_id_fkey"
            columns: ["exam_subject_id"]
            isOneToOne: false
            referencedRelation: "exam_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_entry_audit_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      mastery_snapshots: {
        Row: {
          authenticity_weight: number | null
          edge_model_version: string | null
          error_patterns: string[] | null
          hesitation_count: number | null
          hint_dependency_rate: number | null
          id: string
          neura_id: string
          raw_score: number
          school_id: string
          session_count: number | null
          snapshot_date: string
          subject: string
          synced_at: string | null
          topic: string
        }
        Insert: {
          authenticity_weight?: number | null
          edge_model_version?: string | null
          error_patterns?: string[] | null
          hesitation_count?: number | null
          hint_dependency_rate?: number | null
          id?: string
          neura_id: string
          raw_score: number
          school_id: string
          session_count?: number | null
          snapshot_date: string
          subject: string
          synced_at?: string | null
          topic: string
        }
        Update: {
          authenticity_weight?: number | null
          edge_model_version?: string | null
          error_patterns?: string[] | null
          hesitation_count?: number | null
          hint_dependency_rate?: number | null
          id?: string
          neura_id?: string
          raw_score?: number
          school_id?: string
          session_count?: number | null
          snapshot_date?: string
          subject?: string
          synced_at?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_snapshots_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      message_threads: {
        Row: {
          class_teacher_visible: boolean | null
          created_at: string | null
          id: string
          initiated_by: Database["public"]["Enums"]["user_role"]
          last_message_at: string | null
          neura_id: string
          parent_mobile: string
          principal_visible: boolean | null
          school_id: string
          teacher_id: string
        }
        Insert: {
          class_teacher_visible?: boolean | null
          created_at?: string | null
          id?: string
          initiated_by: Database["public"]["Enums"]["user_role"]
          last_message_at?: string | null
          neura_id: string
          parent_mobile: string
          principal_visible?: boolean | null
          school_id: string
          teacher_id: string
        }
        Update: {
          class_teacher_visible?: boolean | null
          created_at?: string | null
          id?: string
          initiated_by?: Database["public"]["Enums"]["user_role"]
          last_message_at?: string | null
          neura_id?: string
          parent_mobile?: string
          principal_visible?: boolean | null
          school_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "message_threads_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          id: string
          message_text: string
          read_at: string | null
          sender_id: string
          sender_type: Database["public"]["Enums"]["user_role"]
          sent_at: string | null
          sms_fallback_sent: boolean | null
          thread_id: string
        }
        Insert: {
          id?: string
          message_text: string
          read_at?: string | null
          sender_id: string
          sender_type: Database["public"]["Enums"]["user_role"]
          sent_at?: string | null
          sms_fallback_sent?: boolean | null
          thread_id: string
        }
        Update: {
          id?: string
          message_text?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: Database["public"]["Enums"]["user_role"]
          sent_at?: string | null
          sms_fallback_sent?: boolean | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          changelog: string | null
          checksum_sha256: string
          file_size_mb: number | null
          file_url: string
          id: string
          is_active: boolean | null
          min_app_version: string | null
          min_os_version: string | null
          model_type: string
          published_at: string | null
          target_band: Database["public"]["Enums"]["age_band"] | null
          trained_on_samples: number | null
          version: string
        }
        Insert: {
          changelog?: string | null
          checksum_sha256: string
          file_size_mb?: number | null
          file_url: string
          id?: string
          is_active?: boolean | null
          min_app_version?: string | null
          min_os_version?: string | null
          model_type: string
          published_at?: string | null
          target_band?: Database["public"]["Enums"]["age_band"] | null
          trained_on_samples?: number | null
          version: string
        }
        Update: {
          changelog?: string | null
          checksum_sha256?: string
          file_size_mb?: number | null
          file_url?: string
          id?: string
          is_active?: boolean | null
          min_app_version?: string | null
          min_os_version?: string | null
          model_type?: string
          published_at?: string | null
          target_band?: Database["public"]["Enums"]["age_band"] | null
          trained_on_samples?: number | null
          version?: string
        }
        Relationships: []
      }
      moderation_actions: {
        Row: {
          action: string
          action_metadata: Json | null
          created_at: string | null
          id: string
          post_id: string
          reason: string | null
          taken_by: string
          taken_by_type: string
        }
        Insert: {
          action: string
          action_metadata?: Json | null
          created_at?: string | null
          id?: string
          post_id: string
          reason?: string | null
          taken_by: string
          taken_by_type: string
        }
        Update: {
          action?: string
          action_metadata?: Json | null
          created_at?: string | null
          id?: string
          post_id?: string
          reason?: string | null
          taken_by?: string
          taken_by_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "neurasphere_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      neuracoin_ledger: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          neura_id: string
          reference_id: string | null
          reference_type: string | null
          school_id: string
          transaction_type: Database["public"]["Enums"]["neuracoin_transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          neura_id: string
          reference_id?: string | null
          reference_type?: string | null
          school_id: string
          transaction_type: Database["public"]["Enums"]["neuracoin_transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          neura_id?: string
          reference_id?: string | null
          reference_type?: string | null
          school_id?: string
          transaction_type?: Database["public"]["Enums"]["neuracoin_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "neuracoin_ledger_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "neuracoin_ledger_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      neuralife_benchmark_stats: {
        Row: {
          board: string
          computed_at: string
          id: string
          metric: string
          p25: number
          p50: number
          p75: number
          period: string
          school_count: number
          size_bucket: string
          state: string
        }
        Insert: {
          board: string
          computed_at?: string
          id?: string
          metric: string
          p25: number
          p50: number
          p75: number
          period: string
          school_count?: number
          size_bucket: string
          state: string
        }
        Update: {
          board?: string
          computed_at?: string
          id?: string
          metric?: string
          p25?: number
          p50?: number
          p75?: number
          period?: string
          school_count?: number
          size_bucket?: string
          state?: string
        }
        Relationships: []
      }
      neurasphere_posts: {
        Row: {
          ai_category: string | null
          ai_checked_at: string | null
          ai_confidence: number | null
          ai_reason: string | null
          ai_score: Database["public"]["Enums"]["ai_score"] | null
          author_type: Database["public"]["Enums"]["author_type"] | null
          badge_id: string | null
          content_text: string
          created_at: string | null
          deleted_at: string | null
          id: string
          image_url: string | null
          is_cross_school: boolean | null
          is_pinned: boolean | null
          moderation_confidence: number | null
          moderation_reason: string | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          neura_id: string | null
          parent_visible: boolean | null
          post_category: Database["public"]["Enums"]["post_category"] | null
          post_type: Database["public"]["Enums"]["post_type"]
          published_at: string | null
          scheduled_at: string | null
          school_id: string
          source: string | null
          status: string | null
          tags: string[] | null
        }
        Insert: {
          ai_category?: string | null
          ai_checked_at?: string | null
          ai_confidence?: number | null
          ai_reason?: string | null
          ai_score?: Database["public"]["Enums"]["ai_score"] | null
          author_type?: Database["public"]["Enums"]["author_type"] | null
          badge_id?: string | null
          content_text: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_cross_school?: boolean | null
          is_pinned?: boolean | null
          moderation_confidence?: number | null
          moderation_reason?: string | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          neura_id?: string | null
          parent_visible?: boolean | null
          post_category?: Database["public"]["Enums"]["post_category"] | null
          post_type: Database["public"]["Enums"]["post_type"]
          published_at?: string | null
          scheduled_at?: string | null
          school_id: string
          source?: string | null
          status?: string | null
          tags?: string[] | null
        }
        Update: {
          ai_category?: string | null
          ai_checked_at?: string | null
          ai_confidence?: number | null
          ai_reason?: string | null
          ai_score?: Database["public"]["Enums"]["ai_score"] | null
          author_type?: Database["public"]["Enums"]["author_type"] | null
          badge_id?: string | null
          content_text?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_cross_school?: boolean | null
          is_pinned?: boolean | null
          moderation_confidence?: number | null
          moderation_reason?: string | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          neura_id?: string | null
          parent_visible?: boolean | null
          post_category?: Database["public"]["Enums"]["post_category"] | null
          post_type?: Database["public"]["Enums"]["post_type"]
          published_at?: string | null
          scheduled_at?: string | null
          school_id?: string
          source?: string | null
          status?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "neurasphere_posts_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "neurasphere_posts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      neurasphere_settings: {
        Row: {
          allow_cross_school: boolean | null
          blocked_posters: string[] | null
          created_at: string | null
          enable_achievements: boolean | null
          enable_manual_posts: boolean | null
          enable_photo_posts: boolean | null
          id: string
          keyword_blocklist: string[] | null
          max_posts_per_day: number | null
          posting_hours_end: string | null
          posting_hours_start: string | null
          require_approval: boolean | null
          school_id: string
          settings_audit_log: Json | null
          updated_at: string | null
        }
        Insert: {
          allow_cross_school?: boolean | null
          blocked_posters?: string[] | null
          created_at?: string | null
          enable_achievements?: boolean | null
          enable_manual_posts?: boolean | null
          enable_photo_posts?: boolean | null
          id?: string
          keyword_blocklist?: string[] | null
          max_posts_per_day?: number | null
          posting_hours_end?: string | null
          posting_hours_start?: string | null
          require_approval?: boolean | null
          school_id: string
          settings_audit_log?: Json | null
          updated_at?: string | null
        }
        Update: {
          allow_cross_school?: boolean | null
          blocked_posters?: string[] | null
          created_at?: string | null
          enable_achievements?: boolean | null
          enable_manual_posts?: boolean | null
          enable_photo_posts?: boolean | null
          id?: string
          keyword_blocklist?: string[] | null
          max_posts_per_day?: number | null
          posting_hours_end?: string | null
          posting_hours_start?: string | null
          require_approval?: boolean | null
          school_id?: string
          settings_audit_log?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "neurasphere_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dedup: {
        Row: {
          created_at: string | null
          dedup_key: string
          expires_at: string
          id: string
          notification_id: string | null
        }
        Insert: {
          created_at?: string | null
          dedup_key: string
          expires_at: string
          id?: string
          notification_id?: string | null
        }
        Update: {
          created_at?: string | null
          dedup_key?: string
          expires_at?: string
          id?: string
          notification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_dedup_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          academic_push: boolean | null
          admin_push: boolean | null
          device_push: boolean | null
          homework_push: boolean | null
          id: string
          language: Database["public"]["Enums"]["medium_type"] | null
          sms_enabled: boolean | null
          social_push: boolean | null
          updated_at: string | null
          user_id: string
          user_type: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          academic_push?: boolean | null
          admin_push?: boolean | null
          device_push?: boolean | null
          homework_push?: boolean | null
          id?: string
          language?: Database["public"]["Enums"]["medium_type"] | null
          sms_enabled?: boolean | null
          social_push?: boolean | null
          updated_at?: string | null
          user_id: string
          user_type: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          academic_push?: boolean | null
          admin_push?: boolean | null
          device_push?: boolean | null
          homework_push?: boolean | null
          id?: string
          language?: Database["public"]["Enums"]["medium_type"] | null
          sms_enabled?: boolean | null
          social_push?: boolean | null
          updated_at?: string | null
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_payload: Json | null
          action_type: string | null
          body: string
          category: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          delivered_at: string | null
          failure_reason: string | null
          hold_until: string | null
          id: string
          language: Database["public"]["Enums"]["medium_type"] | null
          read_at: string | null
          recipient_id: string
          recipient_type: Database["public"]["Enums"]["user_role"]
          related_neura_id: string | null
          retry_count: number | null
          school_id: string
          sent_at: string | null
          severity: Database["public"]["Enums"]["notification_severity"]
          status: Database["public"]["Enums"]["notification_status"] | null
          title: string
        }
        Insert: {
          action_payload?: Json | null
          action_type?: string | null
          body: string
          category: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          delivered_at?: string | null
          failure_reason?: string | null
          hold_until?: string | null
          id?: string
          language?: Database["public"]["Enums"]["medium_type"] | null
          read_at?: string | null
          recipient_id: string
          recipient_type: Database["public"]["Enums"]["user_role"]
          related_neura_id?: string | null
          retry_count?: number | null
          school_id: string
          sent_at?: string | null
          severity: Database["public"]["Enums"]["notification_severity"]
          status?: Database["public"]["Enums"]["notification_status"] | null
          title: string
        }
        Update: {
          action_payload?: Json | null
          action_type?: string | null
          body?: string
          category?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          delivered_at?: string | null
          failure_reason?: string | null
          hold_until?: string | null
          id?: string
          language?: Database["public"]["Enums"]["medium_type"] | null
          read_at?: string | null
          recipient_id?: string
          recipient_type?: Database["public"]["Enums"]["user_role"]
          related_neura_id?: string | null
          retry_count?: number | null
          school_id?: string
          sent_at?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"]
          status?: Database["public"]["Enums"]["notification_status"] | null
          title?: string
        }
        Relationships: []
      }
      ocr_fallback_batches: {
        Row: {
          became_training_pair: boolean | null
          cloud_vision_result: string | null
          created_at: string | null
          id: string
          is_agreement: boolean | null
          on_device_confidence: number
          on_device_text: string | null
          processed_at: string | null
          school_id: string
          session_id: string | null
          stroke_hash: string | null
          subject_context: string | null
        }
        Insert: {
          became_training_pair?: boolean | null
          cloud_vision_result?: string | null
          created_at?: string | null
          id?: string
          is_agreement?: boolean | null
          on_device_confidence: number
          on_device_text?: string | null
          processed_at?: string | null
          school_id: string
          session_id?: string | null
          stroke_hash?: string | null
          subject_context?: string | null
        }
        Update: {
          became_training_pair?: boolean | null
          cloud_vision_result?: string | null
          created_at?: string | null
          id?: string
          is_agreement?: boolean | null
          on_device_confidence?: number
          on_device_text?: string | null
          processed_at?: string | null
          school_id?: string
          session_id?: string | null
          stroke_hash?: string | null
          subject_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_fallback_batches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "student_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ota_update_log: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          from_version: string | null
          id: string
          initiated_at: string | null
          model_type: string
          smartpad_id: string
          status: string
          to_version: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          from_version?: string | null
          id?: string
          initiated_at?: string | null
          model_type: string
          smartpad_id: string
          status: string
          to_version: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          from_version?: string | null
          id?: string
          initiated_at?: string | null
          model_type?: string
          smartpad_id?: string
          status?: string
          to_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "ota_update_log_smartpad_id_fkey"
            columns: ["smartpad_id"]
            isOneToOne: false
            referencedRelation: "smartpad_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_requests: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          expires_at: string
          id: string
          locked_until: string | null
          max_attempts: number | null
          mobile: string
          otp_hash: string
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          locked_until?: string | null
          max_attempts?: number | null
          mobile: string
          otp_hash: string
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          locked_until?: string | null
          max_attempts?: number | null
          mobile?: string
          otp_hash?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      parent_auth_links: {
        Row: {
          created_at: string | null
          id: string
          mobile: string
          neura_id: string
          school_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mobile: string
          neura_id: string
          school_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mobile?: string
          neura_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_auth_links_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "parent_auth_links_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_contacts: {
        Row: {
          annual_income: number | null
          can_login: boolean | null
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          mobile: string
          neura_id: string
          occupation: string | null
          parent_name: string
          relationship: string
          school_id: string
        }
        Insert: {
          annual_income?: number | null
          can_login?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          mobile: string
          neura_id: string
          occupation?: string | null
          parent_name: string
          relationship: string
          school_id: string
        }
        Update: {
          annual_income?: number | null
          can_login?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          mobile?: string
          neura_id?: string
          occupation?: string | null
          parent_name?: string
          relationship?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_contacts_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "parent_contacts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_meetings: {
        Row: {
          agenda: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          meeting_type: string | null
          neura_id: string
          notes_after: string | null
          parent_confirmed: boolean | null
          scheduled_at: string
          school_id: string
          status: string | null
          teacher_id: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_type?: string | null
          neura_id: string
          notes_after?: string | null
          parent_confirmed?: boolean | null
          scheduled_at: string
          school_id: string
          status?: string | null
          teacher_id: string
        }
        Update: {
          agenda?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_type?: string | null
          neura_id?: string
          notes_after?: string | null
          parent_confirmed?: boolean | null
          scheduled_at?: string
          school_id?: string
          status?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_meetings_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "parent_meetings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_meetings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_adjustments: {
        Row: {
          added_by: string | null
          adjustment_type: string
          amount: number
          created_at: string
          id: string
          is_deduction: boolean
          label: string
          payslip_id: string
          school_id: string
        }
        Insert: {
          added_by?: string | null
          adjustment_type: string
          amount: number
          created_at?: string
          id?: string
          is_deduction?: boolean
          label: string
          payslip_id: string
          school_id: string
        }
        Update: {
          added_by?: string | null
          adjustment_type?: string
          amount?: number
          created_at?: string
          id?: string
          is_deduction?: boolean
          label?: string
          payslip_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          basic_earned: number | null
          created_at: string | null
          da_earned: number | null
          earned_days: number
          esi_deduction: number | null
          gross_earned: number
          hra_earned: number | null
          id: string
          lop_days: number | null
          net_salary: number
          other_deductions: number | null
          payroll_run_id: string
          payslip_generated: boolean | null
          payslip_url: string | null
          pf_deduction: number | null
          pt_deduction: number | null
          salary_structure_id: string
          school_id: string
          special_allowance: number | null
          tds_deduction: number | null
          teacher_id: string
          total_deductions: number
          transport_allowance: number | null
          working_days_in_month: number
        }
        Insert: {
          basic_earned?: number | null
          created_at?: string | null
          da_earned?: number | null
          earned_days: number
          esi_deduction?: number | null
          gross_earned: number
          hra_earned?: number | null
          id?: string
          lop_days?: number | null
          net_salary: number
          other_deductions?: number | null
          payroll_run_id: string
          payslip_generated?: boolean | null
          payslip_url?: string | null
          pf_deduction?: number | null
          pt_deduction?: number | null
          salary_structure_id: string
          school_id: string
          special_allowance?: number | null
          tds_deduction?: number | null
          teacher_id: string
          total_deductions: number
          transport_allowance?: number | null
          working_days_in_month: number
        }
        Update: {
          basic_earned?: number | null
          created_at?: string | null
          da_earned?: number | null
          earned_days?: number
          esi_deduction?: number | null
          gross_earned?: number
          hra_earned?: number | null
          id?: string
          lop_days?: number | null
          net_salary?: number
          other_deductions?: number | null
          payroll_run_id?: string
          payslip_generated?: boolean | null
          payslip_url?: string | null
          pf_deduction?: number | null
          pt_deduction?: number | null
          salary_structure_id?: string
          school_id?: string
          special_allowance?: number | null
          tds_deduction?: number | null
          teacher_id?: string
          total_deductions?: number
          transport_allowance?: number | null
          working_days_in_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_salary_structure_id_fkey"
            columns: ["salary_structure_id"]
            isOneToOne: false
            referencedRelation: "salary_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          academic_year_id: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          generated_at: string | null
          generated_by: string | null
          id: string
          month: number
          notes: string | null
          paid_at: string | null
          school_id: string
          status: string
          teacher_count: number
          total_deductions: number
          total_gross: number
          total_net: number
          updated_at: string
          year: number
        }
        Insert: {
          academic_year_id: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          month: number
          notes?: string | null
          paid_at?: string | null
          school_id: string
          status?: string
          teacher_count?: number
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
          year: number
        }
        Update: {
          academic_year_id?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          month?: number
          notes?: string | null
          paid_at?: string | null
          school_id?: string
          status?: string
          teacher_count?: number
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          basic: number
          created_at: string
          da: number
          esi_employee: number
          gross_salary: number
          hra: number
          id: string
          lop_days: number
          lop_deduction: number
          month: number
          net_salary: number
          payment_date: string | null
          payment_reference: string | null
          payroll_run_id: string
          pf_employee: number
          present_days: number
          professional_tax: number
          school_id: string
          special_allowance: number
          status: string
          teacher_id: string
          total_deductions: number
          transport_allowance: number
          updated_at: string
          working_days: number
          year: number
        }
        Insert: {
          basic?: number
          created_at?: string
          da?: number
          esi_employee?: number
          gross_salary?: number
          hra?: number
          id?: string
          lop_days?: number
          lop_deduction?: number
          month: number
          net_salary?: number
          payment_date?: string | null
          payment_reference?: string | null
          payroll_run_id: string
          pf_employee?: number
          present_days?: number
          professional_tax?: number
          school_id: string
          special_allowance?: number
          status?: string
          teacher_id: string
          total_deductions?: number
          transport_allowance?: number
          updated_at?: string
          working_days?: number
          year: number
        }
        Update: {
          basic?: number
          created_at?: string
          da?: number
          esi_employee?: number
          gross_salary?: number
          hra?: number
          id?: string
          lop_days?: number
          lop_deduction?: number
          month?: number
          net_salary?: number
          payment_date?: string | null
          payment_reference?: string | null
          payroll_run_id?: string
          pf_employee?: number
          present_days?: number
          professional_tax?: number
          school_id?: string
          special_allowance?: number
          status?: string
          teacher_id?: string
          total_deductions?: number
          transport_allowance?: number
          updated_at?: string
          working_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          deleted_at: string | null
          id: string
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          neura_id: string
          post_id: string
          published_at: string | null
          school_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          neura_id: string
          post_id: string
          published_at?: string | null
          school_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          neura_id?: string
          post_id?: string
          published_at?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "neurasphere_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          id: string
          neura_id: string
          post_id: string
          reaction_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          neura_id: string
          post_id: string
          reaction_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          neura_id?: string
          post_id?: string
          reaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "neurasphere_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          report_details: string | null
          report_reason: string
          reported_by_neura_id: string
          reporter_school_id: string
          reviewed_at: string | null
          reviewed_by_teacher_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          report_details?: string | null
          report_reason: string
          reported_by_neura_id: string
          reporter_school_id: string
          reviewed_at?: string | null
          reviewed_by_teacher_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          report_details?: string | null
          report_reason?: string
          reported_by_neura_id?: string
          reporter_school_id?: string
          reviewed_at?: string | null
          reviewed_by_teacher_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "neurasphere_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reports_reported_by_neura_id_fkey"
            columns: ["reported_by_neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "post_reports_reporter_school_id_fkey"
            columns: ["reporter_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reports_reviewed_by_teacher_id_fkey"
            columns: ["reviewed_by_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_sets: {
        Row: {
          audit_status: string | null
          chapter_id: string
          created_at: string | null
          created_by: string | null
          difficulty: string
          id: string
          problems: Json
          target_error_patterns: string[] | null
          topic_id: string
        }
        Insert: {
          audit_status?: string | null
          chapter_id: string
          created_at?: string | null
          created_by?: string | null
          difficulty: string
          id: string
          problems: Json
          target_error_patterns?: string[] | null
          topic_id: string
        }
        Update: {
          audit_status?: string | null
          chapter_id?: string
          created_at?: string | null
          created_by?: string | null
          difficulty?: string
          id?: string
          problems?: Json
          target_error_patterns?: string[] | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_sets_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "content_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_sets_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "content_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_sequence_counters: {
        Row: {
          academic_year_label: string
          last_sequence: number | null
          school_id: string
          school_short_code: string
        }
        Insert: {
          academic_year_label: string
          last_sequence?: number | null
          school_id: string
          school_short_code: string
        }
        Update: {
          academic_year_label?: string
          last_sequence?: number | null
          school_id?: string
          school_short_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_sequence_counters_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          jti: string
          revoked_at: string | null
          school_id: string | null
          user_id: string
          user_role: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          jti: string
          revoked_at?: string | null
          school_id?: string | null
          user_id: string
          user_role: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          jti?: string
          revoked_at?: string | null
          school_id?: string | null
          user_id?: string
          user_role?: string
        }
        Relationships: []
      }
      salary_structures: {
        Row: {
          account_holder_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          basic: number
          created_at: string | null
          da_type: string | null
          da_value: number | null
          effective_from: string
          effective_to: string | null
          esi_applicable: boolean | null
          gross_monthly: number | null
          hra_type: string | null
          hra_value: number | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          pf_applicable: boolean | null
          pt_applicable: boolean | null
          school_id: string
          special_allowance: number | null
          teacher_id: string
          transport_allowance: number | null
        }
        Insert: {
          account_holder_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          basic: number
          created_at?: string | null
          da_type?: string | null
          da_value?: number | null
          effective_from: string
          effective_to?: string | null
          esi_applicable?: boolean | null
          gross_monthly?: number | null
          hra_type?: string | null
          hra_value?: number | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          pf_applicable?: boolean | null
          pt_applicable?: boolean | null
          school_id: string
          special_allowance?: number | null
          teacher_id: string
          transport_allowance?: number | null
        }
        Update: {
          account_holder_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          basic?: number
          created_at?: string | null
          da_type?: string | null
          da_value?: number | null
          effective_from?: string
          effective_to?: string | null
          esi_applicable?: boolean | null
          gross_monthly?: number | null
          hra_type?: string | null
          hra_value?: number | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          pf_applicable?: boolean | null
          pt_applicable?: boolean | null
          school_id?: string
          special_allowance?: number | null
          teacher_id?: string
          transport_allowance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_structures_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      school_analytics_narratives: {
        Row: {
          generated_at: string
          id: string
          key_insights: string[]
          month_year: string
          narrative_text: string
          neura_id: string | null
          refresh_count: number
          school_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          key_insights?: string[]
          month_year: string
          narrative_text: string
          neura_id?: string | null
          refresh_count?: number
          school_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          key_insights?: string[]
          month_year?: string
          narrative_text?: string
          neura_id?: string | null
          refresh_count?: number
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_analytics_narratives_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "school_analytics_narratives_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assembly_config: {
        Row: {
          academic_year_id: string
          day_of_week: string | null
          duration_minutes: number | null
          id: string
          include_in_schedule: boolean | null
          position: string | null
          school_id: string
        }
        Insert: {
          academic_year_id: string
          day_of_week?: string | null
          duration_minutes?: number | null
          id?: string
          include_in_schedule?: boolean | null
          position?: string | null
          school_id: string
        }
        Update: {
          academic_year_id?: string
          day_of_week?: string | null
          duration_minutes?: number | null
          id?: string
          include_in_schedule?: boolean | null
          position?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_assembly_config_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assembly_config_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_enrollments: {
        Row: {
          admission_number: string | null
          created_at: string | null
          enrolled_at: string
          exit_reason: Database["public"]["Enums"]["transfer_reason"] | null
          exited_at: string | null
          id: string
          neura_id: string
          school_id: string
          status: string | null
        }
        Insert: {
          admission_number?: string | null
          created_at?: string | null
          enrolled_at: string
          exit_reason?: Database["public"]["Enums"]["transfer_reason"] | null
          exited_at?: string | null
          id?: string
          neura_id: string
          school_id: string
          status?: string | null
        }
        Update: {
          admission_number?: string | null
          created_at?: string | null
          enrolled_at?: string
          exit_reason?: Database["public"]["Enums"]["transfer_reason"] | null
          exited_at?: string | null
          id?: string
          neura_id?: string
          school_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_enrollments_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "school_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_group_memberships: {
        Row: {
          added_at: string
          group_id: string
          id: string
          school_id: string
        }
        Insert: {
          added_at?: string
          group_id: string
          id?: string
          school_id: string
        }
        Update: {
          added_at?: string
          group_id?: string
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "school_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_group_memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
        }
        Relationships: []
      }
      school_health_scores: {
        Row: {
          at_risk_resolution: number | null
          attendance_score: number | null
          band: string
          computed_date: string
          created_at: string
          driver_negatives: string[]
          driver_positives: string[]
          engagement_score: number | null
          id: string
          mastery_score: number | null
          operational_score: number | null
          overall_score: number
          school_id: string
          score_delta_30d: number | null
        }
        Insert: {
          at_risk_resolution?: number | null
          attendance_score?: number | null
          band: string
          computed_date: string
          created_at?: string
          driver_negatives?: string[]
          driver_positives?: string[]
          engagement_score?: number | null
          id?: string
          mastery_score?: number | null
          operational_score?: number | null
          overall_score: number
          school_id: string
          score_delta_30d?: number | null
        }
        Update: {
          at_risk_resolution?: number | null
          attendance_score?: number | null
          band?: string
          computed_date?: string
          created_at?: string
          driver_negatives?: string[]
          driver_positives?: string[]
          engagement_score?: number | null
          id?: string
          mastery_score?: number | null
          operational_score?: number | null
          overall_score?: number
          school_id?: string
          score_delta_30d?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "school_health_scores_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_holidays: {
        Row: {
          academic_year_id: string
          holiday_date: string
          holiday_name: string
          holiday_type: string | null
          id: string
          school_id: string
        }
        Insert: {
          academic_year_id: string
          holiday_date: string
          holiday_name: string
          holiday_type?: string | null
          id?: string
          school_id: string
        }
        Update: {
          academic_year_id?: string
          holiday_date?: string
          holiday_name?: string
          holiday_type?: string | null
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_holidays_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_holidays_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_period_config: {
        Row: {
          academic_year_id: string
          day_of_week: string
          id: string
          is_working_day: boolean | null
          lunch_after_period: number | null
          lunch_duration_minutes: number | null
          period_duration_minutes: number | null
          school_end_time: string | null
          school_id: string
          school_start_time: string | null
          short_break_after_periods: number[] | null
          short_break_duration_min: number | null
        }
        Insert: {
          academic_year_id: string
          day_of_week: string
          id?: string
          is_working_day?: boolean | null
          lunch_after_period?: number | null
          lunch_duration_minutes?: number | null
          period_duration_minutes?: number | null
          school_end_time?: string | null
          school_id: string
          school_start_time?: string | null
          short_break_after_periods?: number[] | null
          short_break_duration_min?: number | null
        }
        Update: {
          academic_year_id?: string
          day_of_week?: string
          id?: string
          is_working_day?: boolean | null
          lunch_after_period?: number | null
          lunch_duration_minutes?: number | null
          period_duration_minutes?: number | null
          school_end_time?: string | null
          school_id?: string
          school_start_time?: string | null
          short_break_after_periods?: number[] | null
          short_break_duration_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "school_period_config_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_period_config_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_sequences: {
        Row: {
          enrollment_year: number
          last_sequence: number | null
          state_code: string
        }
        Insert: {
          enrollment_year: number
          last_sequence?: number | null
          state_code: string
        }
        Update: {
          enrollment_year?: number
          last_sequence?: number | null
          state_code?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          affiliation_number: string | null
          board: Database["public"]["Enums"]["board_type"]
          contract_reference: string | null
          created_at: string | null
          deleted_at: string | null
          district: string
          establishment_year: number | null
          exam_pattern: string | null
          full_address: string
          gps_lat: number | null
          gps_lng: number | null
          grading_system: string | null
          id: string
          leave_year_start_month: number | null
          mandal: string | null
          medium: Database["public"]["Enums"]["medium_type"]
          name: string
          onboarding_complete: boolean | null
          onboarding_step: number | null
          pincode: string | null
          principal_email: string | null
          principal_mobile: string
          principal_name: string
          recognition_status: string | null
          salary_cycle: string | null
          salary_pay_day: number | null
          school_email: string | null
          school_end_time: string | null
          school_phone: string | null
          school_start_time: string | null
          school_type: Database["public"]["Enums"]["school_type"]
          shifts: number | null
          state: string
          status: string | null
          subscription_end: string | null
          subscription_start: string | null
          subscription_tier: string | null
          udise_code: string | null
          updated_at: string | null
          working_days: Database["public"]["Enums"]["day_of_week"][] | null
        }
        Insert: {
          affiliation_number?: string | null
          board: Database["public"]["Enums"]["board_type"]
          contract_reference?: string | null
          created_at?: string | null
          deleted_at?: string | null
          district: string
          establishment_year?: number | null
          exam_pattern?: string | null
          full_address: string
          gps_lat?: number | null
          gps_lng?: number | null
          grading_system?: string | null
          id: string
          leave_year_start_month?: number | null
          mandal?: string | null
          medium: Database["public"]["Enums"]["medium_type"]
          name: string
          onboarding_complete?: boolean | null
          onboarding_step?: number | null
          pincode?: string | null
          principal_email?: string | null
          principal_mobile: string
          principal_name: string
          recognition_status?: string | null
          salary_cycle?: string | null
          salary_pay_day?: number | null
          school_email?: string | null
          school_end_time?: string | null
          school_phone?: string | null
          school_start_time?: string | null
          school_type?: Database["public"]["Enums"]["school_type"]
          shifts?: number | null
          state?: string
          status?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_tier?: string | null
          udise_code?: string | null
          updated_at?: string | null
          working_days?: Database["public"]["Enums"]["day_of_week"][] | null
        }
        Update: {
          affiliation_number?: string | null
          board?: Database["public"]["Enums"]["board_type"]
          contract_reference?: string | null
          created_at?: string | null
          deleted_at?: string | null
          district?: string
          establishment_year?: number | null
          exam_pattern?: string | null
          full_address?: string
          gps_lat?: number | null
          gps_lng?: number | null
          grading_system?: string | null
          id?: string
          leave_year_start_month?: number | null
          mandal?: string | null
          medium?: Database["public"]["Enums"]["medium_type"]
          name?: string
          onboarding_complete?: boolean | null
          onboarding_step?: number | null
          pincode?: string | null
          principal_email?: string | null
          principal_mobile?: string
          principal_name?: string
          recognition_status?: string | null
          salary_cycle?: string | null
          salary_pay_day?: number | null
          school_email?: string | null
          school_end_time?: string | null
          school_phone?: string | null
          school_start_time?: string | null
          school_type?: Database["public"]["Enums"]["school_type"]
          shifts?: number | null
          state?: string
          status?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_tier?: string | null
          udise_code?: string | null
          updated_at?: string | null
          working_days?: Database["public"]["Enums"]["day_of_week"][] | null
        }
        Relationships: []
      }
      section_history: {
        Row: {
          academic_year_id: string
          changed_at: string
          changed_by: string | null
          class_year: number
          created_at: string | null
          from_section: string
          id: string
          neura_id: string
          reason: string | null
          school_id: string
          to_section: string
        }
        Insert: {
          academic_year_id: string
          changed_at: string
          changed_by?: string | null
          class_year: number
          created_at?: string | null
          from_section: string
          id?: string
          neura_id: string
          reason?: string | null
          school_id: string
          to_section: string
        }
        Update: {
          academic_year_id?: string
          changed_at?: string
          changed_by?: string | null
          class_year?: number
          created_at?: string | null
          from_section?: string
          id?: string
          neura_id?: string
          reason?: string | null
          school_id?: string
          to_section?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_history_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_history_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "section_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      smartpad_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          device_id: string
          id: string
          is_active: boolean | null
          message: string
          neura_id: string | null
          notification_channel: string | null
          notification_sent_at: string | null
          resolved_at: string | null
          school_id: string
          severity: string
          triggered_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          device_id: string
          id?: string
          is_active?: boolean | null
          message: string
          neura_id?: string | null
          notification_channel?: string | null
          notification_sent_at?: string | null
          resolved_at?: string | null
          school_id: string
          severity: string
          triggered_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          device_id?: string
          id?: string
          is_active?: boolean | null
          message?: string
          neura_id?: string | null
          notification_channel?: string | null
          notification_sent_at?: string | null
          resolved_at?: string | null
          school_id?: string
          severity?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smartpad_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smartpad_alerts_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "smartpad_alerts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      smartpad_assignment_history: {
        Row: {
          academic_year_id: string | null
          assigned_at: string
          condition_at_return: string | null
          created_at: string | null
          damage_description: string | null
          damage_photo_url: string | null
          id: string
          neura_id: string
          notes: string | null
          recorded_by: string | null
          repair_completed_at: string | null
          repair_cost_estimate: number | null
          repair_required: boolean | null
          repair_status: string | null
          return_condition: string | null
          returned_at: string | null
          school_id: string
          smartpad_id: string
        }
        Insert: {
          academic_year_id?: string | null
          assigned_at: string
          condition_at_return?: string | null
          created_at?: string | null
          damage_description?: string | null
          damage_photo_url?: string | null
          id?: string
          neura_id: string
          notes?: string | null
          recorded_by?: string | null
          repair_completed_at?: string | null
          repair_cost_estimate?: number | null
          repair_required?: boolean | null
          repair_status?: string | null
          return_condition?: string | null
          returned_at?: string | null
          school_id: string
          smartpad_id: string
        }
        Update: {
          academic_year_id?: string | null
          assigned_at?: string
          condition_at_return?: string | null
          created_at?: string | null
          damage_description?: string | null
          damage_photo_url?: string | null
          id?: string
          neura_id?: string
          notes?: string | null
          recorded_by?: string | null
          repair_completed_at?: string | null
          repair_cost_estimate?: number | null
          repair_required?: boolean | null
          repair_status?: string | null
          return_condition?: string | null
          returned_at?: string | null
          school_id?: string
          smartpad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smartpad_assignment_history_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smartpad_assignment_history_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "smartpad_assignment_history_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smartpad_assignment_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smartpad_assignment_history_smartpad_id_fkey"
            columns: ["smartpad_id"]
            isOneToOne: false
            referencedRelation: "smartpad_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      smartpad_devices: {
        Row: {
          academic_year_id: string | null
          assigned_at: string | null
          assigned_neura_id: string | null
          battery_pct: number | null
          breakage_deposit_paid: number | null
          created_at: string | null
          exam_lock_active: boolean | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          is_charging: boolean | null
          kiosk_app_version: string | null
          last_gps_at: string | null
          last_seen_at: string | null
          last_sync_at: string | null
          locked: boolean | null
          loss_reported: boolean | null
          loss_reported_at: string | null
          lost_reported_by: string | null
          model: string | null
          model_versions: Json | null
          os_version: string | null
          pending_firmware_version: string | null
          school_id: string
          serial_number: string
          status: Database["public"]["Enums"]["device_status"] | null
          storage_total_mb: number | null
          storage_used_mb: number | null
          total_repair_cost: number | null
          total_sessions: number | null
          total_usage_hours: number | null
        }
        Insert: {
          academic_year_id?: string | null
          assigned_at?: string | null
          assigned_neura_id?: string | null
          battery_pct?: number | null
          breakage_deposit_paid?: number | null
          created_at?: string | null
          exam_lock_active?: boolean | null
          gps_lat?: number | null
          gps_lng?: number | null
          id: string
          is_charging?: boolean | null
          kiosk_app_version?: string | null
          last_gps_at?: string | null
          last_seen_at?: string | null
          last_sync_at?: string | null
          locked?: boolean | null
          loss_reported?: boolean | null
          loss_reported_at?: string | null
          lost_reported_by?: string | null
          model?: string | null
          model_versions?: Json | null
          os_version?: string | null
          pending_firmware_version?: string | null
          school_id: string
          serial_number: string
          status?: Database["public"]["Enums"]["device_status"] | null
          storage_total_mb?: number | null
          storage_used_mb?: number | null
          total_repair_cost?: number | null
          total_sessions?: number | null
          total_usage_hours?: number | null
        }
        Update: {
          academic_year_id?: string | null
          assigned_at?: string | null
          assigned_neura_id?: string | null
          battery_pct?: number | null
          breakage_deposit_paid?: number | null
          created_at?: string | null
          exam_lock_active?: boolean | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          is_charging?: boolean | null
          kiosk_app_version?: string | null
          last_gps_at?: string | null
          last_seen_at?: string | null
          last_sync_at?: string | null
          locked?: boolean | null
          loss_reported?: boolean | null
          loss_reported_at?: string | null
          lost_reported_by?: string | null
          model?: string | null
          model_versions?: Json | null
          os_version?: string | null
          pending_firmware_version?: string | null
          school_id?: string
          serial_number?: string
          status?: Database["public"]["Enums"]["device_status"] | null
          storage_total_mb?: number | null
          storage_used_mb?: number | null
          total_repair_cost?: number | null
          total_sessions?: number | null
          total_usage_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "smartpad_devices_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smartpad_devices_assigned_neura_id_fkey"
            columns: ["assigned_neura_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "smartpad_devices_lost_reported_by_fkey"
            columns: ["lost_reported_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smartpad_devices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      smartpad_health_snapshots: {
        Row: {
          battery_level: number | null
          device_id: string
          firmware_version: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          school_id: string
          sessions_count: number | null
          snapshot_at: string
          storage_used_mb: number | null
          sync_type: string | null
          usage_minutes: number | null
        }
        Insert: {
          battery_level?: number | null
          device_id: string
          firmware_version?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          school_id: string
          sessions_count?: number | null
          snapshot_at: string
          storage_used_mb?: number | null
          sync_type?: string | null
          usage_minutes?: number | null
        }
        Update: {
          battery_level?: number | null
          device_id?: string
          firmware_version?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          school_id?: string
          sessions_count?: number | null
          snapshot_at?: string
          storage_used_mb?: number | null
          sync_type?: string | null
          usage_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "smartpad_health_snapshots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      smartpad_ota_campaigns: {
        Row: {
          completed_at: string | null
          failed_count: number | null
          id: string
          launched_at: string
          launched_by: string | null
          school_id: string
          status: string | null
          target_device_ids: string[]
          target_firmware: string
          updated_count: number | null
        }
        Insert: {
          completed_at?: string | null
          failed_count?: number | null
          id?: string
          launched_at?: string
          launched_by?: string | null
          school_id: string
          status?: string | null
          target_device_ids: string[]
          target_firmware: string
          updated_count?: number | null
        }
        Update: {
          completed_at?: string | null
          failed_count?: number | null
          id?: string
          launched_at?: string
          launched_by?: string | null
          school_id?: string
          status?: string | null
          target_device_ids?: string[]
          target_firmware?: string
          updated_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "smartpad_ota_campaigns_launched_by_fkey"
            columns: ["launched_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smartpad_ota_campaigns_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_bus_assignments: {
        Row: {
          academic_year_id: string
          created_at: string | null
          direction: string | null
          id: string
          monthly_fee: number | null
          neura_id: string
          route_id: string
          school_id: string
          status: string | null
          stop_id: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string | null
          direction?: string | null
          id?: string
          monthly_fee?: number | null
          neura_id: string
          route_id: string
          school_id: string
          status?: string | null
          stop_id: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string | null
          direction?: string | null
          id?: string
          monthly_fee?: number | null
          neura_id?: string
          route_id?: string
          school_id?: string
          status?: string | null
          stop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_bus_assignments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bus_assignments_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "student_bus_assignments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bus_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bus_assignments_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "bus_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      student_connections: {
        Row: {
          connection_type: string | null
          id: string
          parent_notified: boolean | null
          requested_at: string | null
          requester_neura_id: string
          responded_at: string | null
          status: string | null
          target_neura_id: string
        }
        Insert: {
          connection_type?: string | null
          id?: string
          parent_notified?: boolean | null
          requested_at?: string | null
          requester_neura_id: string
          responded_at?: string | null
          status?: string | null
          target_neura_id: string
        }
        Update: {
          connection_type?: string | null
          id?: string
          parent_notified?: boolean | null
          requested_at?: string | null
          requester_neura_id?: string
          responded_at?: string | null
          status?: string | null
          target_neura_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_connections_requester_neura_id_fkey"
            columns: ["requester_neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "student_connections_target_neura_id_fkey"
            columns: ["target_neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      student_documents: {
        Row: {
          document_name: string
          id: string
          neura_id: string
          notes: string | null
          received_date: string | null
          school_id: string
          status: string | null
          tc_number: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          document_name: string
          id?: string
          neura_id: string
          notes?: string | null
          received_date?: string | null
          school_id: string
          status?: string | null
          tc_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          document_name?: string
          id?: string
          neura_id?: string
          notes?: string | null
          received_date?: string | null
          school_id?: string
          status?: string | null
          tc_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "student_documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_insights: {
        Row: {
          action_items: string[] | null
          claude_model_version: string | null
          conversation_starter: string | null
          created_at: string | null
          generated_date: string
          id: string
          insight_type: string
          language: Database["public"]["Enums"]["medium_type"]
          neura_id: string
          notification_pending: boolean | null
          school_id: string
          sent_to_parent: boolean | null
          sent_to_teacher: boolean | null
          severity: string | null
          subject: string | null
          summary_text: string
        }
        Insert: {
          action_items?: string[] | null
          claude_model_version?: string | null
          conversation_starter?: string | null
          created_at?: string | null
          generated_date: string
          id?: string
          insight_type: string
          language: Database["public"]["Enums"]["medium_type"]
          neura_id: string
          notification_pending?: boolean | null
          school_id: string
          sent_to_parent?: boolean | null
          sent_to_teacher?: boolean | null
          severity?: string | null
          subject?: string | null
          summary_text: string
        }
        Update: {
          action_items?: string[] | null
          claude_model_version?: string | null
          conversation_starter?: string | null
          created_at?: string | null
          generated_date?: string
          id?: string
          insight_type?: string
          language?: Database["public"]["Enums"]["medium_type"]
          neura_id?: string
          notification_pending?: boolean | null
          school_id?: string
          sent_to_parent?: boolean | null
          sent_to_teacher?: boolean | null
          severity?: string | null
          subject?: string | null
          summary_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_insights_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      student_pins: {
        Row: {
          neura_id: string
          pin_hash: string
          updated_at: string | null
        }
        Insert: {
          neura_id: string
          pin_hash: string
          updated_at?: string | null
        }
        Update: {
          neura_id?: string
          pin_hash?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_pins_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      student_sessions: {
        Row: {
          authenticity_weight: number | null
          content_ref: string | null
          copying_score: number | null
          ended_at: string | null
          gaming_score: number | null
          gap_model_version: string | null
          hint_requests: number | null
          hint_was_helpful: boolean | null
          hwr_model_version: string | null
          id: string
          neura_id: string
          school_id: string
          session_date: string
          smartpad_id: string
          started_at: string
          subject: string | null
          synced_at: string | null
          total_words_written: number | null
        }
        Insert: {
          authenticity_weight?: number | null
          content_ref?: string | null
          copying_score?: number | null
          ended_at?: string | null
          gaming_score?: number | null
          gap_model_version?: string | null
          hint_requests?: number | null
          hint_was_helpful?: boolean | null
          hwr_model_version?: string | null
          id?: string
          neura_id: string
          school_id: string
          session_date: string
          smartpad_id: string
          started_at: string
          subject?: string | null
          synced_at?: string | null
          total_words_written?: number | null
        }
        Update: {
          authenticity_weight?: number | null
          content_ref?: string | null
          copying_score?: number | null
          ended_at?: string | null
          gaming_score?: number | null
          gap_model_version?: string | null
          hint_requests?: number | null
          hint_was_helpful?: boolean | null
          hwr_model_version?: string | null
          id?: string
          neura_id?: string
          school_id?: string
          session_date?: string
          smartpad_id?: string
          started_at?: string
          subject?: string | null
          synced_at?: string | null
          total_words_written?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_sessions_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      student_yearly_progress: {
        Row: {
          academic_year_id: string
          academic_year_label: string
          admission_category: string | null
          board: Database["public"]["Enums"]["board_type"]
          class_year: number
          created_at: string | null
          id: string
          is_rte_student: boolean
          medium: Database["public"]["Enums"]["medium_type"]
          neura_id: string
          preferred_content_medium:
            | Database["public"]["Enums"]["medium_type"]
            | null
          promoted_at: string | null
          promoted_by: string | null
          promoted_to_class: number | null
          promotion_status: string | null
          school_id: string
          section: string
          smartpad_id: string | null
        }
        Insert: {
          academic_year_id: string
          academic_year_label: string
          admission_category?: string | null
          board: Database["public"]["Enums"]["board_type"]
          class_year: number
          created_at?: string | null
          id?: string
          is_rte_student?: boolean
          medium: Database["public"]["Enums"]["medium_type"]
          neura_id: string
          preferred_content_medium?:
            | Database["public"]["Enums"]["medium_type"]
            | null
          promoted_at?: string | null
          promoted_by?: string | null
          promoted_to_class?: number | null
          promotion_status?: string | null
          school_id: string
          section: string
          smartpad_id?: string | null
        }
        Update: {
          academic_year_id?: string
          academic_year_label?: string
          admission_category?: string | null
          board?: Database["public"]["Enums"]["board_type"]
          class_year?: number
          created_at?: string | null
          id?: string
          is_rte_student?: boolean
          medium?: Database["public"]["Enums"]["medium_type"]
          neura_id?: string
          preferred_content_medium?:
            | Database["public"]["Enums"]["medium_type"]
            | null
          promoted_at?: string | null
          promoted_by?: string | null
          promoted_to_class?: number | null
          promotion_status?: string | null
          school_id?: string
          section?: string
          smartpad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_yearly_progress_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_yearly_progress_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "student_yearly_progress_promoted_by_fkey"
            columns: ["promoted_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_yearly_progress_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          aadhaar_hash: string | null
          apaar_id: string | null
          band: Database["public"]["Enums"]["age_band"] | null
          blood_group: string | null
          caste_category: Database["public"]["Enums"]["fee_category"] | null
          consent_version: string | null
          created_at: string | null
          data_consent_given: boolean | null
          data_retain_on_exit: boolean | null
          date_of_birth: string
          deleted_at: string | null
          full_name: string
          gender: string | null
          nationality: string | null
          neura_id: string
          neuracoin_balance: number
          religion: string | null
          status: Database["public"]["Enums"]["student_status"] | null
          updated_at: string | null
        }
        Insert: {
          aadhaar_hash?: string | null
          apaar_id?: string | null
          band?: Database["public"]["Enums"]["age_band"] | null
          blood_group?: string | null
          caste_category?: Database["public"]["Enums"]["fee_category"] | null
          consent_version?: string | null
          created_at?: string | null
          data_consent_given?: boolean | null
          data_retain_on_exit?: boolean | null
          date_of_birth: string
          deleted_at?: string | null
          full_name: string
          gender?: string | null
          nationality?: string | null
          neura_id: string
          neuracoin_balance?: number
          religion?: string | null
          status?: Database["public"]["Enums"]["student_status"] | null
          updated_at?: string | null
        }
        Update: {
          aadhaar_hash?: string | null
          apaar_id?: string | null
          band?: Database["public"]["Enums"]["age_band"] | null
          blood_group?: string | null
          caste_category?: Database["public"]["Enums"]["fee_category"] | null
          consent_version?: string | null
          created_at?: string | null
          data_consent_given?: boolean | null
          data_retain_on_exit?: boolean | null
          date_of_birth?: string
          deleted_at?: string | null
          full_name?: string
          gender?: string | null
          nationality?: string | null
          neura_id?: string
          neuracoin_balance?: number
          religion?: string | null
          status?: Database["public"]["Enums"]["student_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      study_habit_records: {
        Row: {
          distraction_flags: string[] | null
          focus_score: number | null
          habit_trend: string | null
          id: string
          neura_id: string
          pause_count: number | null
          record_date: string
          school_id: string
          session_duration_minutes: number | null
          session_start_time: string | null
          she_model_version: string | null
          start_time_consistency: number | null
          synced_at: string | null
        }
        Insert: {
          distraction_flags?: string[] | null
          focus_score?: number | null
          habit_trend?: string | null
          id?: string
          neura_id: string
          pause_count?: number | null
          record_date: string
          school_id: string
          session_duration_minutes?: number | null
          session_start_time?: string | null
          she_model_version?: string | null
          start_time_consistency?: number | null
          synced_at?: string | null
        }
        Update: {
          distraction_flags?: string[] | null
          focus_score?: number | null
          habit_trend?: string | null
          id?: string
          neura_id?: string
          pause_count?: number | null
          record_date?: string
          school_id?: string
          session_duration_minutes?: number | null
          session_start_time?: string | null
          she_model_version?: string | null
          start_time_consistency?: number | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_habit_records_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      teacher_documents: {
        Row: {
          document_name: string
          id: string
          notes: string | null
          received_date: string | null
          school_id: string
          status: string | null
          teacher_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          document_name: string
          id?: string
          notes?: string | null
          received_date?: string | null
          school_id: string
          status?: string | null
          teacher_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          document_name?: string
          id?: string
          notes?: string | null
          received_date?: string | null
          school_id?: string
          status?: string | null
          teacher_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_documents_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_performance_snapshots: {
        Row: {
          ai_insight: string | null
          at_risk_count: number
          avg_mastery_score: number | null
          classes_taught: string[]
          computed_at: string
          context_flags: string[]
          engagement_rate: number | null
          id: string
          intervention_rate: number | null
          mastery_velocity: number | null
          school_id: string
          snapshot_month: string
          student_count: number
          subject: string
          teacher_id: string
          vs_school_avg: number | null
        }
        Insert: {
          ai_insight?: string | null
          at_risk_count?: number
          avg_mastery_score?: number | null
          classes_taught?: string[]
          computed_at?: string
          context_flags?: string[]
          engagement_rate?: number | null
          id?: string
          intervention_rate?: number | null
          mastery_velocity?: number | null
          school_id: string
          snapshot_month: string
          student_count?: number
          subject: string
          teacher_id: string
          vs_school_avg?: number | null
        }
        Update: {
          ai_insight?: string | null
          at_risk_count?: number
          avg_mastery_score?: number | null
          classes_taught?: string[]
          computed_at?: string
          context_flags?: string[]
          engagement_rate?: number | null
          id?: string
          intervention_rate?: number | null
          mastery_velocity?: number | null
          school_id?: string
          snapshot_month?: string
          student_count?: number
          subject?: string
          teacher_id?: string
          vs_school_avg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_performance_snapshots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_performance_snapshots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_school_assignments: {
        Row: {
          academic_year_id: string
          created_at: string | null
          designation: string
          employee_id: string | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          exit_date: string | null
          exit_reason: string | null
          id: string
          joining_date: string
          probation_end_date: string | null
          reporting_to: string | null
          school_id: string
          status: string | null
          teacher_id: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string | null
          designation: string
          employee_id?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          exit_date?: string | null
          exit_reason?: string | null
          id?: string
          joining_date: string
          probation_end_date?: string | null
          reporting_to?: string | null
          school_id: string
          status?: string | null
          teacher_id: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string | null
          designation?: string
          employee_id?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          exit_date?: string | null
          exit_reason?: string | null
          id?: string
          joining_date?: string
          probation_end_date?: string | null
          reporting_to?: string | null
          school_id?: string
          status?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_school_assignments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_school_assignments_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_school_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_school_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_subject_assignments: {
        Row: {
          academic_year_id: string
          assignment_id: string
          class_year: number
          created_at: string | null
          id: string
          is_class_teacher: boolean | null
          school_id: string
          section: string
          subject: string
        }
        Insert: {
          academic_year_id: string
          assignment_id: string
          class_year: number
          created_at?: string | null
          id?: string
          is_class_teacher?: boolean | null
          school_id: string
          section: string
          subject: string
        }
        Update: {
          academic_year_id?: string
          assignment_id?: string
          class_year?: number
          created_at?: string | null
          id?: string
          is_class_teacher?: boolean | null
          school_id?: string
          section?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subject_assignments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subject_assignments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "teacher_school_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subject_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          aadhaar_hash: string | null
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          mobile: string
          pan_number: string | null
          qualifications: Json | null
          status: string | null
          teaching_qualification: string | null
          updated_at: string | null
        }
        Insert: {
          aadhaar_hash?: string | null
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          mobile: string
          pan_number?: string | null
          qualifications?: Json | null
          status?: string | null
          teaching_qualification?: string | null
          updated_at?: string | null
        }
        Update: {
          aadhaar_hash?: string | null
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          mobile?: string
          pan_number?: string | null
          qualifications?: Json | null
          status?: string | null
          teaching_qualification?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      timetable_exceptions: {
        Row: {
          class_year: number
          created_at: string | null
          created_by: string | null
          exception_date: string
          exception_type: string
          id: string
          original_teacher_id: string | null
          period_number: number
          reason: string | null
          school_id: string
          section: string
          subject: string | null
          substitute_teacher_id: string | null
        }
        Insert: {
          class_year: number
          created_at?: string | null
          created_by?: string | null
          exception_date: string
          exception_type: string
          id?: string
          original_teacher_id?: string | null
          period_number: number
          reason?: string | null
          school_id: string
          section: string
          subject?: string | null
          substitute_teacher_id?: string | null
        }
        Update: {
          class_year?: number
          created_at?: string | null
          created_by?: string | null
          exception_date?: string
          exception_type?: string
          id?: string
          original_teacher_id?: string | null
          period_number?: number
          reason?: string | null
          school_id?: string
          section?: string
          subject?: string | null
          substitute_teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_exceptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_exceptions_original_teacher_id_fkey"
            columns: ["original_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_exceptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_exceptions_substitute_teacher_id_fkey"
            columns: ["substitute_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_generations: {
        Row: {
          academic_year_id: string
          conflict_count: number | null
          generated_at: string | null
          generated_by: string | null
          generation_seed: string | null
          id: string
          school_id: string
          status: string | null
          total_entries: number | null
        }
        Insert: {
          academic_year_id: string
          conflict_count?: number | null
          generated_at?: string | null
          generated_by?: string | null
          generation_seed?: string | null
          id?: string
          school_id: string
          status?: string | null
          total_entries?: number | null
        }
        Update: {
          academic_year_id?: string
          conflict_count?: number | null
          generated_at?: string | null
          generated_by?: string | null
          generation_seed?: string | null
          id?: string
          school_id?: string
          status?: string | null
          total_entries?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_generations_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_generations_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_generations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_requirements: {
        Row: {
          academic_year_id: string
          class_year: number
          color_hex: string | null
          display_name: string | null
          double_period_count: number | null
          eca_category: string | null
          id: string
          needs_double_period: boolean | null
          periods_per_week: number
          preferred_position: string | null
          school_id: string
          subject: string
          subject_type: string
          teacher_id: string | null
        }
        Insert: {
          academic_year_id: string
          class_year: number
          color_hex?: string | null
          display_name?: string | null
          double_period_count?: number | null
          eca_category?: string | null
          id?: string
          needs_double_period?: boolean | null
          periods_per_week?: number
          preferred_position?: string | null
          school_id: string
          subject: string
          subject_type?: string
          teacher_id?: string | null
        }
        Update: {
          academic_year_id?: string
          class_year?: number
          color_hex?: string | null
          display_name?: string | null
          double_period_count?: number | null
          eca_category?: string | null
          id?: string
          needs_double_period?: boolean | null
          periods_per_week?: number
          preferred_position?: string | null
          school_id?: string
          subject?: string
          subject_type?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_requirements_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_requirements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_requirements_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          academic_year_id: string
          class_year: number
          created_at: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          double_period_end_time: string | null
          end_time: string
          id: string
          is_double_period: boolean | null
          period_number: number
          period_type: string | null
          room_number: string | null
          school_id: string
          section: string
          start_time: string
          subject: string
          subject_type: string | null
          teacher_id: string | null
        }
        Insert: {
          academic_year_id: string
          class_year: number
          created_at?: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          double_period_end_time?: string | null
          end_time: string
          id?: string
          is_double_period?: boolean | null
          period_number: number
          period_type?: string | null
          room_number?: string | null
          school_id: string
          section: string
          start_time: string
          subject: string
          subject_type?: string | null
          teacher_id?: string | null
        }
        Update: {
          academic_year_id?: string
          class_year?: number
          created_at?: string | null
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          double_period_end_time?: string | null
          end_time?: string
          id?: string
          is_double_period?: boolean | null
          period_number?: number
          period_type?: string | null
          room_number?: string | null
          school_id?: string
          section?: string
          start_time?: string
          subject?: string
          subject_type?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_tokens: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string
          from_school_id: string
          id: string
          neura_id: string
          token_hash: string
          used_at: string | null
          used_by_school_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          from_school_id: string
          id?: string
          neura_id: string
          token_hash: string
          used_at?: string | null
          used_by_school_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          from_school_id?: string
          id?: string
          neura_id?: string
          token_hash?: string
          used_at?: string | null
          used_by_school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_tokens_from_school_id_fkey"
            columns: ["from_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_tokens_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
          {
            foreignKeyName: "transfer_tokens_used_by_school_id_fkey"
            columns: ["used_by_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bookmarks: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          school_id: string
          sort_order: number
          teacher_id: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          school_id: string
          sort_order?: number
          teacher_id: string
          title: string
          url: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          school_id?: string
          sort_order?: number
          teacher_id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmarks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmarks_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_skill_snapshots: {
        Row: {
          active_writing_days: number | null
          clarity_score_avg: number | null
          id: string
          month_label: string
          neura_id: string
          school_id: string
          sentence_formation: string | null
          spelling_accuracy_pct: number | null
          synced_at: string | null
          total_session_minutes: number | null
          writing_speed_wpm_avg: number | null
          wss_model_version: string | null
        }
        Insert: {
          active_writing_days?: number | null
          clarity_score_avg?: number | null
          id?: string
          month_label: string
          neura_id: string
          school_id: string
          sentence_formation?: string | null
          spelling_accuracy_pct?: number | null
          synced_at?: string | null
          total_session_minutes?: number | null
          writing_speed_wpm_avg?: number | null
          wss_model_version?: string | null
        }
        Update: {
          active_writing_days?: number | null
          clarity_score_avg?: number | null
          id?: string
          month_label?: string
          neura_id?: string
          school_id?: string
          sentence_formation?: string | null
          spelling_accuracy_pct?: number | null
          synced_at?: string | null
          total_session_minutes?: number | null
          writing_speed_wpm_avg?: number | null
          wss_model_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "writing_skill_snapshots_neura_id_fkey"
            columns: ["neura_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["neura_id"]
          },
        ]
      }
      youtube_refs: {
        Row: {
          channel_name: string
          created_at: string | null
          curated_by: string
          duration_seconds: number | null
          id: string
          is_approved: boolean | null
          medium: Database["public"]["Enums"]["medium_type"]
          ref_type: string | null
          start_time_seconds: number | null
          topic_id: string
          video_title: string
          youtube_url: string
        }
        Insert: {
          channel_name: string
          created_at?: string | null
          curated_by: string
          duration_seconds?: number | null
          id?: string
          is_approved?: boolean | null
          medium: Database["public"]["Enums"]["medium_type"]
          ref_type?: string | null
          start_time_seconds?: number | null
          topic_id: string
          video_title: string
          youtube_url: string
        }
        Update: {
          channel_name?: string
          created_at?: string | null
          curated_by?: string
          duration_seconds?: number | null
          id?: string
          is_approved?: boolean | null
          medium?: Database["public"]["Enums"]["medium_type"]
          ref_type?: string | null
          start_time_seconds?: number | null
          topic_id?: string
          video_title?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_refs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "content_topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_linked_neura_ids: { Args: never; Returns: string[] }
      auth_neura_id: { Args: never; Returns: string }
      auth_role: { Args: never; Returns: string }
      auth_school_id: { Args: never; Returns: string }
      generate_receipt_number: {
        Args: { p_school_id: string; p_year_label: string }
        Returns: string
      }
      increment_neuracoin_balance: {
        Args: { p_amount: number; p_neura_id: string }
        Returns: undefined
      }
      increment_school_sequence: {
        Args: { p_state_code: string; p_year: number }
        Returns: number
      }
      is_my_child: { Args: { check_neura_id: string }; Returns: boolean }
      is_my_school: { Args: { school_id: string }; Returns: boolean }
      is_school_admin: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      age_band: "FOUNDATION" | "ELEMENTARY" | "MIDDLE" | "SECONDARY"
      ai_score: "SAFE" | "REVIEW" | "REMOVE"
      attendance_status:
        | "PRESENT"
        | "ABSENT"
        | "LATE"
        | "APPROVED_LEAVE"
        | "HOLIDAY"
      author_type: "STUDENT" | "PRINCIPAL" | "TEACHER" | "SYSTEM"
      behaviour_category:
        | "POSITIVE_RECOGNITION"
        | "DISRUPTION"
        | "BULLYING"
        | "PROPERTY_DAMAGE"
        | "ATTENDANCE_ISSUE"
        | "ACADEMIC_CONCERN"
        | "OTHER"
      board_type: "SCERT_AP" | "SCERT_TS" | "CBSE" | "ICSE"
      concession_type:
        | "MERIT_SCHOLARSHIP"
        | "SC_ST_WAIVER"
        | "SIBLING_DISCOUNT"
        | "STAFF_WARD"
        | "MANAGEMENT_QUOTA"
        | "OTHER"
        | "ALUMNI_CHILD"
        | "OBC_CONCESSION"
        | "EWS_CONCESSION"
        | "INCOME_BPL"
        | "DISABILITY"
        | "SINGLE_PARENT"
        | "SIBLING_SECOND"
        | "SIBLING_THIRD_PLUS"
      day_of_week: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN"
      device_status:
        | "ACTIVE"
        | "LOCKED"
        | "LOST"
        | "MAINTENANCE"
        | "DECOMMISSIONED"
      employment_type: "REGULAR" | "CONTRACT" | "PART_TIME" | "VISITING"
      exam_status:
        | "DRAFT"
        | "SCHEDULED"
        | "IN_PROGRESS"
        | "MARKS_PENDING"
        | "PUBLISHED"
        | "ARCHIVED"
      exam_type:
        | "FA1"
        | "FA2"
        | "FA3"
        | "FA4"
        | "SA1"
        | "SA2"
        | "UNIT_TEST"
        | "PTM"
      fee_category: "GENERAL" | "SC_ST" | "OBC" | "EWS" | "FREE"
      fee_head:
        | "ADMISSION"
        | "DEVELOPMENT"
        | "TUITION"
        | "EXAM"
        | "TRANSPORT"
        | "NEURALIFE_SUBSCRIPTION"
        | "SMARTPAD"
        | "SMARTPAD_EMI"
        | "LATE_FEE"
        | "OTHER"
        | "BUS_FEE"
        | "SPORTS_FEE"
        | "LAB_FEE"
        | "LIBRARY_FEE"
        | "HOSTEL_FEE"
        | "ACTIVITY_FEE"
        | "UNIFORM_FEE"
        | "COMPUTER_LAB"
        | "MEAL_FEE"
        | "MEDICAL_FEE"
        | "CUSTOM"
      fee_status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "WAIVED"
      leave_status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
      leave_type:
        | "CL"
        | "SL"
        | "EL"
        | "MATERNITY"
        | "PATERNITY"
        | "LOP"
        | "OTHER"
      mastery_classification: "MASTERED" | "GOOD" | "DEVELOPING" | "AT_RISK"
      medium_type: "ENGLISH" | "TELUGU" | "BOTH"
      moderation_status:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "HUMAN_REVIEW"
        | "REMOVED_BY_AI"
        | "REMOVED_BY_PRINCIPAL"
      neuracoin_transaction_type:
        | "EXAM_REWARD"
        | "ATTENDANCE_REWARD"
        | "HOMEWORK_REWARD"
        | "SUBJECT_TOPPER_BONUS"
        | "MANUAL_CREDIT"
        | "MANUAL_DEDUCTION"
        | "REDEMPTION"
      notification_channel: "FCM" | "SMS" | "EMAIL" | "IN_APP"
      notification_severity: "S1" | "S2" | "S3" | "S4"
      notification_status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED"
      pattern_type: "CURRICULUM_GAP" | "TEACHING_PATTERN" | "MIXED_SIGNAL"
      payment_mode: "CASH" | "UPI" | "CHEQUE" | "NEFT" | "ONLINE"
      post_category:
        | "GENERAL"
        | "STUDY_TIP"
        | "ACHIEVEMENT"
        | "ANNOUNCEMENT"
        | "QUESTION"
        | "PROJECT"
      post_type: "ACHIEVEMENT" | "MANUAL" | "DOUBT" | "CONTEXTUAL"
      school_type: "GOVERNMENT" | "PRIVATE" | "AIDED"
      student_status: "ACTIVE" | "ALUMNI" | "TRANSFERRING" | "DEACTIVATED"
      sync_status: "PENDING" | "SYNCED" | "FAILED"
      transfer_reason:
        | "TRANSFER"
        | "GRADUATION"
        | "DROPOUT"
        | "EXPULSION"
        | "OTHER"
      user_role:
        | "SUPER_ADMIN"
        | "PRINCIPAL"
        | "SCHOOL_ADMIN"
        | "TEACHER"
        | "PARENT"
        | "STUDENT"
        | "SYSTEM"
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
      age_band: ["FOUNDATION", "ELEMENTARY", "MIDDLE", "SECONDARY"],
      ai_score: ["SAFE", "REVIEW", "REMOVE"],
      attendance_status: [
        "PRESENT",
        "ABSENT",
        "LATE",
        "APPROVED_LEAVE",
        "HOLIDAY",
      ],
      author_type: ["STUDENT", "PRINCIPAL", "TEACHER", "SYSTEM"],
      behaviour_category: [
        "POSITIVE_RECOGNITION",
        "DISRUPTION",
        "BULLYING",
        "PROPERTY_DAMAGE",
        "ATTENDANCE_ISSUE",
        "ACADEMIC_CONCERN",
        "OTHER",
      ],
      board_type: ["SCERT_AP", "SCERT_TS", "CBSE", "ICSE"],
      concession_type: [
        "MERIT_SCHOLARSHIP",
        "SC_ST_WAIVER",
        "SIBLING_DISCOUNT",
        "STAFF_WARD",
        "MANAGEMENT_QUOTA",
        "OTHER",
        "ALUMNI_CHILD",
        "OBC_CONCESSION",
        "EWS_CONCESSION",
        "INCOME_BPL",
        "DISABILITY",
        "SINGLE_PARENT",
        "SIBLING_SECOND",
        "SIBLING_THIRD_PLUS",
      ],
      day_of_week: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      device_status: [
        "ACTIVE",
        "LOCKED",
        "LOST",
        "MAINTENANCE",
        "DECOMMISSIONED",
      ],
      employment_type: ["REGULAR", "CONTRACT", "PART_TIME", "VISITING"],
      exam_status: [
        "DRAFT",
        "SCHEDULED",
        "IN_PROGRESS",
        "MARKS_PENDING",
        "PUBLISHED",
        "ARCHIVED",
      ],
      exam_type: ["FA1", "FA2", "FA3", "FA4", "SA1", "SA2", "UNIT_TEST", "PTM"],
      fee_category: ["GENERAL", "SC_ST", "OBC", "EWS", "FREE"],
      fee_head: [
        "ADMISSION",
        "DEVELOPMENT",
        "TUITION",
        "EXAM",
        "TRANSPORT",
        "NEURALIFE_SUBSCRIPTION",
        "SMARTPAD",
        "SMARTPAD_EMI",
        "LATE_FEE",
        "OTHER",
        "BUS_FEE",
        "SPORTS_FEE",
        "LAB_FEE",
        "LIBRARY_FEE",
        "HOSTEL_FEE",
        "ACTIVITY_FEE",
        "UNIFORM_FEE",
        "COMPUTER_LAB",
        "MEAL_FEE",
        "MEDICAL_FEE",
        "CUSTOM",
      ],
      fee_status: ["PENDING", "PARTIAL", "PAID", "OVERDUE", "WAIVED"],
      leave_status: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      leave_type: ["CL", "SL", "EL", "MATERNITY", "PATERNITY", "LOP", "OTHER"],
      mastery_classification: ["MASTERED", "GOOD", "DEVELOPING", "AT_RISK"],
      medium_type: ["ENGLISH", "TELUGU", "BOTH"],
      moderation_status: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "HUMAN_REVIEW",
        "REMOVED_BY_AI",
        "REMOVED_BY_PRINCIPAL",
      ],
      neuracoin_transaction_type: [
        "EXAM_REWARD",
        "ATTENDANCE_REWARD",
        "HOMEWORK_REWARD",
        "SUBJECT_TOPPER_BONUS",
        "MANUAL_CREDIT",
        "MANUAL_DEDUCTION",
        "REDEMPTION",
      ],
      notification_channel: ["FCM", "SMS", "EMAIL", "IN_APP"],
      notification_severity: ["S1", "S2", "S3", "S4"],
      notification_status: ["PENDING", "SENT", "DELIVERED", "READ", "FAILED"],
      pattern_type: ["CURRICULUM_GAP", "TEACHING_PATTERN", "MIXED_SIGNAL"],
      payment_mode: ["CASH", "UPI", "CHEQUE", "NEFT", "ONLINE"],
      post_category: [
        "GENERAL",
        "STUDY_TIP",
        "ACHIEVEMENT",
        "ANNOUNCEMENT",
        "QUESTION",
        "PROJECT",
      ],
      post_type: ["ACHIEVEMENT", "MANUAL", "DOUBT", "CONTEXTUAL"],
      school_type: ["GOVERNMENT", "PRIVATE", "AIDED"],
      student_status: ["ACTIVE", "ALUMNI", "TRANSFERRING", "DEACTIVATED"],
      sync_status: ["PENDING", "SYNCED", "FAILED"],
      transfer_reason: [
        "TRANSFER",
        "GRADUATION",
        "DROPOUT",
        "EXPULSION",
        "OTHER",
      ],
      user_role: [
        "SUPER_ADMIN",
        "PRINCIPAL",
        "SCHOOL_ADMIN",
        "TEACHER",
        "PARENT",
        "STUDENT",
        "SYSTEM",
      ],
    },
  },
} as const
