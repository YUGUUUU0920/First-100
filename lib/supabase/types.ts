/**
 * Database types — v0 skeleton, matches DDL in CEO plan §数据模型.
 * TODO(v0.1): replace with `supabase gen types typescript` output
 * once the Supabase project exists and migrations are applied.
 */

export type Platform = "v2ex" | "jike-pasted";
export type OutreachStatus = "sent" | "replied" | "converted" | "skipped";
export type OutreachDraftStatus = "pending" | "ok" | "ai_failed";

export interface Product {
  id: string;
  user_id: string;
  display_name: string;
  description: string;
  target_persona: string;
  created_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  product_id: string;
  platform: Platform;
  started_at: string;
  finished_at: string | null;
  cost_cents: number;
  prospect_count: number;
  trigger: "user" | "cron";
}

export interface Prospect {
  id: string;
  scan_id: string;
  source_platform: Platform;
  source_url: string;
  author_handle: string;
  post_title: string;
  post_body: string;
  post_age_days: number;
  post_score: number;
  post_reply_count: number;
  ai_relevance_score: number;
  ai_filter_reason: string;
  created_at: string;
}

export interface Outreach {
  id: string;
  prospect_id: string;
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
