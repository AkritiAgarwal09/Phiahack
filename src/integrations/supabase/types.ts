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
      activity_feed: {
        Row: {
          action_type: string
          created_at: string
          id: string
          is_public: boolean
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          is_public?: boolean
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          is_public?: boolean
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      concierge_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      concierge_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          role: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "concierge_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_board_items: {
        Row: {
          board_id: string
          created_at: string
          id: string
          notes: string | null
          position: number
          product_image: string | null
          product_name: string
          product_url: string | null
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          product_image?: string | null
          product_name: string
          product_url?: string | null
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          product_image?: string | null
          product_name?: string
          product_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mood_board_items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "mood_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_board_views: {
        Row: {
          board_id: string
          first_viewed_at: string
          id: string
          last_viewed_at: string
          viewer_id: string
        }
        Insert: {
          board_id: string
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          viewer_id: string
        }
        Update: {
          board_id?: string
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_board_views_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "mood_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_boards: {
        Row: {
          cover_image: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          currency: string
          id: string
          order_id: string
          product_id: string
          product_image: string | null
          product_title: string
          quantity: number
          selected_options: Json
          unit_price: number
          variant_id: string
          variant_title: string | null
          vendor: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          product_id: string
          product_image?: string | null
          product_title: string
          quantity: number
          selected_options?: Json
          unit_price: number
          variant_id: string
          variant_title?: string | null
          vendor?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          product_id?: string
          product_image?: string | null
          product_title?: string
          quantity?: number
          selected_options?: Json
          unit_price?: number
          variant_id?: string
          variant_title?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          applied_voucher_id: string | null
          created_at: string
          currency: string
          discount: number
          id: string
          points_awarded_to_board_creator: number
          points_awarded_to_sharer: number
          points_discount: number
          points_redeemed: number
          shared_cart_id: string | null
          shared_mood_board_id: string | null
          subtotal: number
          total: number
          user_id: string
        }
        Insert: {
          applied_voucher_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          points_awarded_to_board_creator?: number
          points_awarded_to_sharer?: number
          points_discount?: number
          points_redeemed?: number
          shared_cart_id?: string | null
          shared_mood_board_id?: string | null
          subtotal: number
          total: number
          user_id: string
        }
        Update: {
          applied_voucher_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          points_awarded_to_board_creator?: number
          points_awarded_to_sharer?: number
          points_discount?: number
          points_redeemed?: number
          shared_cart_id?: string | null
          shared_mood_board_id?: string | null
          subtotal?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_applied_voucher_id_fkey"
            columns: ["applied_voucher_id"]
            isOneToOne: false
            referencedRelation: "user_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shared_cart_id_fkey"
            columns: ["shared_cart_id"]
            isOneToOne: false
            referencedRelation: "shared_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shared_mood_board_id_fkey"
            columns: ["shared_mood_board_id"]
            isOneToOne: false
            referencedRelation: "mood_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      point_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          currency: string
          id: string
          price: number
          product_id: string
          product_title: string | null
          recorded_at: string
          vendor: string | null
        }
        Insert: {
          currency?: string
          id?: string
          price: number
          product_id: string
          product_title?: string | null
          recorded_at?: string
          vendor?: string | null
        }
        Update: {
          currency?: string
          id?: string
          price?: number
          product_id?: string
          product_title?: string | null
          recorded_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      product_engagements: {
        Row: {
          action: string
          category: string | null
          created_at: string
          id: string
          price: number | null
          product_id: string
          product_title: string | null
          tags: string[] | null
          user_id: string
          vendor: string | null
          weight: number
        }
        Insert: {
          action: string
          category?: string | null
          created_at?: string
          id?: string
          price?: number | null
          product_id: string
          product_title?: string | null
          tags?: string[] | null
          user_id: string
          vendor?: string | null
          weight?: number
        }
        Update: {
          action?: string
          category?: string | null
          created_at?: string
          id?: string
          price?: number | null
          product_id?: string
          product_title?: string | null
          tags?: string[] | null
          user_id?: string
          vendor?: string | null
          weight?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birthday: string | null
          created_at: string
          display_name: string | null
          id: string
          lifetime_points: number
          points: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          lifetime_points?: number
          points?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          lifetime_points?: number
          points?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          invite_code: string
          points_awarded: number
          referred_user_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          invite_code: string
          points_awarded?: number
          referred_user_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          points_awarded?: number
          referred_user_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      shared_cart_items: {
        Row: {
          created_at: string
          currency: string
          id: string
          product_id: string
          product_image: string | null
          product_title: string
          quantity: number
          selected_options: Json
          shared_cart_id: string
          unit_price: number
          variant_id: string
          variant_title: string | null
          vendor: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          product_id: string
          product_image?: string | null
          product_title: string
          quantity?: number
          selected_options?: Json
          shared_cart_id: string
          unit_price: number
          variant_id: string
          variant_title?: string | null
          vendor?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          product_id?: string
          product_image?: string | null
          product_title?: string
          quantity?: number
          selected_options?: Json
          shared_cart_id?: string
          unit_price?: number
          variant_id?: string
          variant_title?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_cart_items_shared_cart_id_fkey"
            columns: ["shared_cart_id"]
            isOneToOne: false
            referencedRelation: "shared_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_cart_views: {
        Row: {
          first_opened_at: string
          id: string
          last_opened_at: string
          shared_cart_id: string
          viewer_id: string
        }
        Insert: {
          first_opened_at?: string
          id?: string
          last_opened_at?: string
          shared_cart_id: string
          viewer_id: string
        }
        Update: {
          first_opened_at?: string
          id?: string
          last_opened_at?: string
          shared_cart_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_cart_views_shared_cart_id_fkey"
            columns: ["shared_cart_id"]
            isOneToOne: false
            referencedRelation: "shared_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_carts: {
        Row: {
          created_at: string
          id: string
          last_opened_at: string | null
          message: string | null
          recipient_email: string | null
          recipient_user_id: string | null
          revoked_at: string | null
          sharer_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_opened_at?: string | null
          message?: string | null
          recipient_email?: string | null
          recipient_user_id?: string | null
          revoked_at?: string | null
          sharer_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_opened_at?: string | null
          message?: string | null
          recipient_email?: string | null
          recipient_user_id?: string | null
          revoked_at?: string | null
          sharer_id?: string
          title?: string | null
        }
        Relationships: []
      }
      social_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      style_profiles: {
        Row: {
          aesthetic_clusters: string[] | null
          ai_summary: string | null
          bold_minimal_score: number | null
          brand_affinity: string[] | null
          casual_formal_score: number | null
          color_palette: string[] | null
          created_at: string
          id: string
          onboarding_completed_at: string | null
          price_tolerance: string | null
          top_categories: string[] | null
          total_swipes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aesthetic_clusters?: string[] | null
          ai_summary?: string | null
          bold_minimal_score?: number | null
          brand_affinity?: string[] | null
          casual_formal_score?: number | null
          color_palette?: string[] | null
          created_at?: string
          id?: string
          onboarding_completed_at?: string | null
          price_tolerance?: string | null
          top_categories?: string[] | null
          total_swipes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aesthetic_clusters?: string[] | null
          ai_summary?: string | null
          bold_minimal_score?: number | null
          brand_affinity?: string[] | null
          casual_formal_score?: number | null
          color_palette?: string[] | null
          created_at?: string
          id?: string
          onboarding_completed_at?: string | null
          price_tolerance?: string | null
          top_categories?: string[] | null
          total_swipes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      swipe_events: {
        Row: {
          category: string | null
          context: string | null
          created_at: string
          direction: string
          dwell_ms: number | null
          id: string
          price: number | null
          reason: string | null
          tags: string[] | null
          target_id: string
          target_image: string | null
          target_title: string | null
          target_type: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          category?: string | null
          context?: string | null
          created_at?: string
          direction: string
          dwell_ms?: number | null
          id?: string
          price?: number | null
          reason?: string | null
          tags?: string[] | null
          target_id: string
          target_image?: string | null
          target_title?: string | null
          target_type: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          category?: string | null
          context?: string | null
          created_at?: string
          direction?: string
          dwell_ms?: number | null
          id?: string
          price?: number | null
          reason?: string | null
          tags?: string[] | null
          target_id?: string
          target_image?: string | null
          target_title?: string | null
          target_type?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: []
      }
      upcoming_events: {
        Row: {
          budget_hint: string | null
          created_at: string
          event_date: string
          event_type: string
          id: string
          location: string | null
          notes: string | null
          title: string
          updated_at: string
          user_id: string
          vibe: string | null
        }
        Insert: {
          budget_hint?: string | null
          created_at?: string
          event_date: string
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
          vibe?: string | null
        }
        Update: {
          budget_hint?: string | null
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          vibe?: string | null
        }
        Relationships: []
      }
      user_vouchers: {
        Row: {
          cost_points: number
          expires_at: string | null
          id: string
          redeemed_at: string
          reward_type: string
          reward_value: number
          status: string
          used_at: string | null
          used_order_id: string | null
          user_id: string
          voucher_id: string
        }
        Insert: {
          cost_points: number
          expires_at?: string | null
          id?: string
          redeemed_at?: string
          reward_type: string
          reward_value?: number
          status?: string
          used_at?: string | null
          used_order_id?: string | null
          user_id: string
          voucher_id: string
        }
        Update: {
          cost_points?: number
          expires_at?: string | null
          id?: string
          redeemed_at?: string
          reward_type?: string
          reward_value?: number
          status?: string
          used_at?: string | null
          used_order_id?: string | null
          user_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vouchers_used_order_id_fkey"
            columns: ["used_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_vouchers_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          active: boolean
          code: string
          cost_points: number
          created_at: string
          description: string | null
          icon: string | null
          id: string
          min_subtotal: number
          required_tier: string | null
          reward_type: string
          reward_value: number
          title: string
        }
        Insert: {
          active?: boolean
          code: string
          cost_points: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          min_subtotal?: number
          required_tier?: string | null
          reward_type: string
          reward_value?: number
          title: string
        }
        Update: {
          active?: boolean
          code?: string
          cost_points?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          min_subtotal?: number
          required_tier?: string | null
          reward_type?: string
          reward_value?: number
          title?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          alert_enabled: boolean
          created_at: string
          current_price: number | null
          id: string
          product_image: string | null
          product_name: string
          product_url: string
          target_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_enabled?: boolean
          created_at?: string
          current_price?: number | null
          id?: string
          product_image?: string | null
          product_name: string
          product_url: string
          target_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_enabled?: boolean
          created_at?: string
          current_price?: number | null
          id?: string
          product_image?: string | null
          product_name?: string
          product_url?: string
          target_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invite_code: { Args: never; Returns: string }
      get_followed_user_engagements: {
        Args: { days_back?: number; max_items?: number }
        Returns: {
          category: string
          product_id: string
          product_title: string
          tags: string[]
          total_score: number
          unique_users: number
          vendor: string
        }[]
      }
      get_mood_board_purchase_stats: {
        Args: { _board_id: string }
        Returns: {
          purchase_count: number
          total_points_earned: number
          total_revenue: number
        }[]
      }
      get_mood_board_view_count: {
        Args: { _board_id: string }
        Returns: number
      }
      get_public_mood_boards: {
        Args: { max_items?: number; search_query?: string }
        Returns: {
          cover_image: string
          created_at: string
          creator_avatar: string
          creator_name: string
          description: string
          id: string
          item_count: number
          name: string
          preview_images: string[]
          top_caption: string
          top_caption_pin_id: string
          user_id: string
          view_count: number
        }[]
      }
      get_style_cluster_trending: {
        Args: { days_back?: number; max_items?: number }
        Returns: {
          category: string
          love_count: number
          price: number
          tags: string[]
          target_id: string
          target_image: string
          target_title: string
          unique_users: number
          vendor: string
        }[]
      }
      get_trending_products: {
        Args: { days_back?: number; max_items?: number }
        Returns: {
          category: string
          product_id: string
          product_title: string
          tags: string[]
          total_score: number
          unique_users: number
          vendor: string
        }[]
      }
      get_viral_product: {
        Args: { days_back?: number }
        Returns: {
          category: string
          growth_pct: number
          product_id: string
          product_title: string
          sparkline: Json
          tags: string[]
          total_score: number
          unique_users: number
          vendor: string
        }[]
      }
      mark_onboarding_completed: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
