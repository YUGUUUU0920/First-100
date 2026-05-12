/**
 * Database types — v0 skeleton, matches DDL in CEO plan §数据模型.
 * TODO(v0.1): replace with `supabase gen types typescript` output
 * once the Supabase project exists and migrations are applied.
 *
 * Nullability mirrors 0001_initial_schema.sql exactly. user_id is included
 * on every owned row to match RLS column.
 */

export type Platform =
  | "v2ex"
  | "jike-pasted"
  | "xhs-pasted"
  | "juejin"
  | "sspai"
  | "github-cn";
export type ScanTrigger = "user" | "cron";
export type OutreachStatus = "sent" | "replied" | "converted" | "skipped";
export type OutreachDraftStatus = "pending" | "ok" | "ai_failed";

export interface Product {
  id: string;
  user_id: string;
  display_name: string;
  description: string;
  target_persona: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  product_id: string;
  platform: Platform;
  trigger: ScanTrigger;
  started_at: string;
  finished_at: string | null;
  cost_cents: number;
  prospect_count: number;
  error_message: string | null;
}

export interface Prospect {
  id: string;
  scan_id: string;
  user_id: string;
  source_platform: Platform;
  source_url: string;
  author_handle: string;
  post_title: string | null;
  post_body: string;
  post_age_days: number | null;
  post_score: number | null;
  post_reply_count: number | null;
  ai_relevance_score: number | null;
  ai_filter_reason: string | null;
  created_at: string;
}

export interface Outreach {
  id: string;
  prospect_id: string;
  user_id: string;
  draft_v1: string;
  critique_score: number | null;
  critique_feedback: string | null;
  draft_v2: string | null;
  final_chosen: string | null;
  char_count: number;
  sonnet_tokens: number;
  haiku_tokens: number;
  status: OutreachDraftStatus;
  created_at: string;
}

export interface OutreachEvent {
  id: string;
  outreach_id: string;
  user_id: string;
  status: OutreachStatus;
  marked_at: string;
  features: Record<string, unknown>;
}
