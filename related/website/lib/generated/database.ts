
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_events": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity_id": string,"entity_type": string,"id": string,"summary": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity_id": string,"entity_type": string,"id"?: string,"summary"?: NonNullable<Json>
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"id"?: string,"summary"?: NonNullable<Json>
                  }
                  Relationships: [

                  ]
                },"catalog_offerings": {
                  Row: {
                    "confirmed": boolean,"currency": string | null,"enabled": boolean,"id": string,"name": string,"product_id": string,"unit_minor": number | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed"?: boolean,"currency"?: string | null,"enabled"?: boolean,"id"?: string,"name": string,"product_id": string,"unit_minor"?: number | null,"version"?: number
                  }
                  Update: {
                    "confirmed"?: boolean,"currency"?: string | null,"enabled"?: boolean,"id"?: string,"name"?: string,"product_id"?: string,"unit_minor"?: number | null,"version"?: number
                  }
                  Relationships: [

                  ]
                },"commerce_settings": {
                  Row: {
                    "approved_terms_fingerprint": string | null,"approved_terms_release_id": string | null,"orders_enabled": boolean,"singleton": boolean,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_terms_fingerprint"?: string | null,"approved_terms_release_id"?: string | null,"orders_enabled"?: boolean,"singleton"?: boolean,"version"?: number
                  }
                  Update: {
                    "approved_terms_fingerprint"?: string | null,"approved_terms_release_id"?: string | null,"orders_enabled"?: boolean,"singleton"?: boolean,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "commerce_settings_approved_terms_release_id_fkey"
      columns: ["approved_terms_release_id"]
isOneToOne: false
      referencedRelation: "content_releases"
      referencedColumns: ["id"]
    }
                  ]
                },"content_drafts": {
                  Row: {
                    "base_release_id": string | null,"created_at": string,"created_by": string,"id": string,"snapshot": NonNullable<Json>,"status": string,"updated_at": string,"updated_by": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "base_release_id"?: string | null,"created_at"?: string,"created_by": string,"id": string,"snapshot": NonNullable<Json>,"status"?: string,"updated_at"?: string,"updated_by": string,"version": number
                  }
                  Update: {
                    "base_release_id"?: string | null,"created_at"?: string,"created_by"?: string,"id"?: string,"snapshot"?: NonNullable<Json>,"status"?: string,"updated_at"?: string,"updated_by"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_drafts_base_release_id_fkey"
      columns: ["base_release_id"]
isOneToOne: false
      referencedRelation: "content_releases"
      referencedColumns: ["id"]
    }
                  ]
                },"content_publication": {
                  Row: {
                    "release_id": string | null,"singleton": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "release_id"?: string | null,"singleton"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "release_id"?: string | null,"singleton"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_publication_release_id_fkey"
      columns: ["release_id"]
isOneToOne: false
      referencedRelation: "content_releases"
      referencedColumns: ["id"]
    }
                  ]
                },"content_releases": {
                  Row: {
                    "created_at": string,"created_by": string,"draft_id": string | null,"draft_version": number | null,"id": string,"rollback_of": string | null,"snapshot": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"draft_id"?: string | null,"draft_version"?: number | null,"id"?: string,"rollback_of"?: string | null,"snapshot": NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"draft_id"?: string | null,"draft_version"?: number | null,"id"?: string,"rollback_of"?: string | null,"snapshot"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_releases_draft_id_fkey"
      columns: ["draft_id"]
isOneToOne: false
      referencedRelation: "content_drafts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_releases_rollback_of_fkey"
      columns: ["rollback_of"]
isOneToOne: false
      referencedRelation: "content_releases"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_notes": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"note": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"note": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"note"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_notes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"customer_orders": {
                  Row: {
                    "created_at": string,"currency": string,"fulfillment_status": string,"id": string,"idempotency_key": string,"items_minor": number,"payable_minor": number | null,"payment_status": string,"request_digest": string,"shipping_address": NonNullable<Json>,"shipping_minor": number | null,"status": string,"tax_minor": number | null,"terms_release_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency": string,"fulfillment_status"?: string,"id"?: string,"idempotency_key": string,"items_minor": number,"payable_minor"?: number | null,"payment_status"?: string,"request_digest": string,"shipping_address": NonNullable<Json>,"shipping_minor"?: number | null,"status"?: string,"tax_minor"?: number | null,"terms_release_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"fulfillment_status"?: string,"id"?: string,"idempotency_key"?: string,"items_minor"?: number,"payable_minor"?: number | null,"payment_status"?: string,"request_digest"?: string,"shipping_address"?: NonNullable<Json>,"shipping_minor"?: number | null,"status"?: string,"tax_minor"?: number | null,"terms_release_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_orders_terms_release_id_fkey"
      columns: ["terms_release_id"]
isOneToOne: false
      referencedRelation: "content_releases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customer_orders_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"customer_privacy_jobs": {
                  Row: {
                    "acting_admin": string | null,"attempts": number,"auth_banned": boolean,"auth_cleared": boolean,"completed_at": string | null,"created_at": string,"failure_step": string | null,"id": string,"initiated_by": string,"lease_token": string | null,"lease_until": string | null,"policy_revision": string,"reason": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acting_admin"?: string | null,"attempts"?: number,"auth_banned"?: boolean,"auth_cleared"?: boolean,"completed_at"?: string | null,"created_at"?: string,"failure_step"?: string | null,"id"?: string,"initiated_by": string,"lease_token"?: string | null,"lease_until"?: string | null,"policy_revision": string,"reason": string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "acting_admin"?: string | null,"attempts"?: number,"auth_banned"?: boolean,"auth_cleared"?: boolean,"completed_at"?: string | null,"created_at"?: string,"failure_step"?: string | null,"id"?: string,"initiated_by"?: string,"lease_token"?: string | null,"lease_until"?: string | null,"policy_revision"?: string,"reason"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_privacy_jobs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"media_assets": {
                  Row: {
                    "advertised_size": number,"created_at": string,"created_by": string,"file_name": string,"id": string,"metadata": Json | null,"mime": string,"original_path": string,"release_path": string | null,"status": string,"usage_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "advertised_size": number,"created_at"?: string,"created_by": string,"file_name": string,"id"?: string,"metadata"?: Json | null,"mime": string,"original_path": string,"release_path"?: string | null,"status"?: string,"usage_key": string
                  }
                  Update: {
                    "advertised_size"?: number,"created_at"?: string,"created_by"?: string,"file_name"?: string,"id"?: string,"metadata"?: Json | null,"mime"?: string,"original_path"?: string,"release_path"?: string | null,"status"?: string,"usage_key"?: string
                  }
                  Relationships: [

                  ]
                },"order_items": {
                  Row: {
                    "name": string,"offering_version": number,"order_id": string,"product_id": string,"quantity": number,"sku_id": string,"unit_minor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "name": string,"offering_version": number,"order_id": string,"product_id": string,"quantity": number,"sku_id": string,"unit_minor": number
                  }
                  Update: {
                    "name"?: string,"offering_version"?: number,"order_id"?: string,"product_id"?: string,"quantity"?: number,"sku_id"?: string,"unit_minor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_sku_id_fkey"
      columns: ["sku_id"]
isOneToOne: false
      referencedRelation: "catalog_offerings"
      referencedColumns: ["id"]
    }
                  ]
                },"order_notes": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"note": string,"order_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"note": string,"order_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string,"order_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_notes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "order_notes_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_attempts": {
                  Row: {
                    "created_at": string,"id": string,"idempotency_key": string,"order_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"idempotency_key": string,"order_id": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"idempotency_key"?: string,"order_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_attempts_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_events": {
                  Row: {
                    "amount_minor": number,"created_at": string,"currency": string,"event_id": string,"id": string,"order_id": string,"provider": string,"status": string,"transaction_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"created_at"?: string,"currency": string,"event_id": string,"id"?: string,"order_id": string,"provider": string,"status"?: string,"transaction_id": string
                  }
                  Update: {
                    "amount_minor"?: number,"created_at"?: string,"currency"?: string,"event_id"?: string,"id"?: string,"order_id"?: string,"provider"?: string,"status"?: string,"transaction_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_events_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_refunds": {
                  Row: {
                    "amount_minor": number,"created_at": string,"id": string,"idempotency_key": string,"order_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"created_at"?: string,"id"?: string,"idempotency_key": string,"order_id": string,"status"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"created_at"?: string,"id"?: string,"idempotency_key"?: string,"order_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_refunds_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "access_state": string,"display_name": string,"locale": string,"shipping_address": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_state"?: string,"display_name"?: string,"locale"?: string,"shipping_address"?: NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "access_state"?: string,"display_name"?: string,"locale"?: string,"shipping_address"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"staff_invites": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"created_by": string,"delivered_at": string | null,"email": string,"expires_at": string,"id": string,"revoked_at": string | null,"role": string,"token_digest": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"created_by": string,"delivered_at"?: string | null,"email": string,"expires_at"?: string,"id"?: string,"revoked_at"?: string | null,"role": string,"token_digest": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"created_by"?: string,"delivered_at"?: string | null,"email"?: string,"expires_at"?: string,"id"?: string,"revoked_at"?: string | null,"role"?: string,"token_digest"?: string
                  }
                  Relationships: [

                  ]
                },"staff_memberships": {
                  Row: {
                    "active": boolean,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"role": string,"user_id": string
                  }
                  Update: {
                    "active"?: boolean,"role"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"waitlist_operations": {
                  Row: {
                    "note": string,"signup_id": string,"status": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "note"?: string,"signup_id": string,"status"?: string,"version"?: number
                  }
                  Update: {
                    "note"?: string,"signup_id"?: string,"status"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "waitlist_operations_signup_id_fkey"
      columns: ["signup_id"]
isOneToOne: true
      referencedRelation: "waitlist_signups"
      referencedColumns: ["id"]
    }
                  ]
                },"waitlist_signups": {
                  Row: {
                    "consent_version": string,"created_at": string,"email": string,"id": string,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_version"?: string,"created_at"?: string,"email": string,"id"?: string,"source"?: string
                  }
                  Update: {
                    "consent_version"?: string,"created_at"?: string,"email"?: string,"id"?: string,"source"?: string
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_staff_invite":
{ Args: { "invite_id": string,"token_digest": string }; Returns: undefined
                           },
"add_customer_note":
{ Args: { "note": string,"user_id": string }; Returns: undefined
                           },
"add_order_note":
{ Args: { "note": string,"order_id": string }; Returns: undefined
                           },
"anonymize_customer_data":
{ Args: { "job_id": string,"token": string }; Returns: Json
                           },
"archive_media_asset":
{ Args: { "asset_id": string }; Returns: undefined
                           },
"attest_content_snapshot":
{ Args: { "actor_id": string,"expected_version": number,"id": string,"normalized_snapshot": Json,"policy_version": string,"purpose": string }; Returns: undefined
                           },
"bootstrap_staff_admin":
{ Args: { "email": string }; Returns: string
                           },
"cancel_customer_order":
{ Args: { "order_id": string }; Returns: Json
                           },
"change_staff_membership":
{ Args: { "active": boolean,"role": string,"user_id": string }; Returns: undefined
                           },
"checkpoint_customer_privacy_auth":
{ Args: { "job_id": string,"step": string,"token": string }; Returns: undefined
                           },
"claim_customer_privacy_job":
{ Args: { "actor_id": string,"job_id": string }; Returns: Json
                           },
"complete_media_asset":
{ Args: { "actor_id": string,"asset_id": string,"metadata": Json }; Returns: undefined
                           },
"consume_request_limit":
{ Args: { "scope": string,"subject_hash": string }; Returns: {
              "allowed": boolean,"retry_after_seconds": number
            }[]
                           },
"create_customer_order":
{ Args: { "request": Json }; Returns: Json
                           },
"create_media_upload":
{ Args: { "advertised_size": number,"file_name": string,"mime": string,"usage_key": string }; Returns: Json
                           },
"create_staff_invite":
{ Args: { "email": string,"role": string,"token_digest": string }; Returns: string
                           },
"export_waitlist_operations":
{ Args: { "search"?: string,"status"?: string }; Returns: Json
                           },
"fail_customer_privacy_job":
{ Args: { "failure_step": string,"job_id": string,"token": string }; Returns: Json
                           },
"get_admin_dashboard":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_catalog_workspace":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_content_draft":
{ Args: { "id": string }; Returns: Json
                           },
"get_content_release":
{ Args: { "id": string }; Returns: Json
                           },
"get_content_workspace":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_customer_order":
{ Args: { "order_id": string }; Returns: Json
                           },
"get_customer_privacy_workspace":
{ Args: { "page"?: number,"page_size"?: number,"search"?: string }; Returns: Json
                           },
"get_media_assets":
{ Args: { "asset_id"?: string }; Returns: Json
                           },
"get_ordering_catalog":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_public_asset":
{ Args: { "asset_id": string }; Returns: Json
                           },
"get_published_content":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_staff_order":
{ Args: { "order_id": string }; Returns: Json
                           },
"get_staff_order_detail":
{ Args: { "order_id": string }; Returns: Json
                           },
"list_customer_notes":
{ Args: { "user_id": string }; Returns: Json
                           },
"list_customer_operations":
{ Args: { "page"?: number,"page_size"?: number,"search"?: string }; Returns: Json
                           },
"list_customer_orders":
{ Args: { "page"?: number,"page_size"?: number }; Returns: Json
                           },
"list_media_library":
{ Args: { "asset_status"?: string,"page"?: number,"reference_state"?: string,"search"?: string,"usage_key"?: string }; Returns: Json
                           },
"list_media_options":
{ Args: { "after_created_at"?: string,"after_id"?: string,"search"?: string,"usage_key": string }; Returns: Json
                           },
"list_staff":
{ Args: Record<PropertyKey, never>; Returns: {
              "active": boolean,"email": string,"role": string,"user_id": string
            }[]
                           },
"list_staff_orders":
{ Args: { "page"?: number,"page_size"?: number,"search"?: string,"status"?: string }; Returns: Json
                           },
"list_waitlist_operations":
{ Args: { "page"?: number,"page_size"?: number,"search"?: string,"status"?: string }; Returns: Json
                           },
"mark_media_copy":
{ Args: { "actor_id": string,"asset_id": string }; Returns: undefined
                           },
"mark_staff_invite_delivery":
{ Args: { "delivered": boolean,"invite_id": string }; Returns: undefined
                           },
"publish_content_draft":
{ Args: { "expected_version": number,"id": string }; Returns: string
                           },
"request_customer_anonymization":
{ Args: { "reason": string,"user_id": string }; Returns: Json
                           },
"rollback_content_release":
{ Args: { "release_id": string }; Returns: string
                           },
"save_content_draft":
{ Args: { "expected_version": number,"id": string,"snapshot": Json }; Returns: Json
                           },
"set_catalog_offering":
{ Args: { "confirmed": boolean,"currency": string,"enabled": boolean,"expected_version": number,"sku_id": string,"unit_minor": number }; Returns: undefined
                           },
"submit_content_draft":
{ Args: { "expected_version": number,"id": string }; Returns: Json
                           },
"update_commerce_settings":
{ Args: { "expected_version": number,"orders_enabled": boolean,"terms_release_id": string }; Returns: undefined
                           },
"update_waitlist_operations":
{ Args: { "expected_version": number,"id": string,"note": string,"status": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {

          }
        },"public": {
          Enums: {

          }
        }
} as const
