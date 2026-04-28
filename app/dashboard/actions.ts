"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClaude } from "@/lib/claude";
import { generateOutreachWithCritique } from "@/lib/claude/generate";
import type { OutreachStatus } from "@/lib/supabase/types";

export type MarkResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Insert one outreach_event row when the user marks an outreach as
 * sent / replied / converted / skipped.
 *
 * v0 keeps the JSONB `features` blob minimal — just a few flags.  Once we
 * have real data flow we'll add prospect feature vector capture for the
 * ranking model (CEO plan §data flywheel).
 */
export async function markOutreach(
  outreachId: string,
  status: OutreachStatus
): Promise<MarkResult> {
  if (typeof outreachId !== "string" || outreachId.length === 0) {
    return { ok: false, error: "missing outreach id" };
  }

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return { ok: false, error: "unauthorized" };
  }

  const admin = createAdminClient();

  // Verify the outreach belongs to this user.
  const { data: o, error: oErr } = await admin
    .from("outreaches")
    .select("id, user_id, prospect_id, status")
    .eq("id", outreachId)
    .single();
  if (oErr || !o || o.user_id !== user.id) {
    return { ok: false, error: "outreach not found" };
  }

  const { error: insertErr } = await admin.from("outreach_events").insert({
    outreach_id: outreachId,
    user_id: user.id,
    status,
    features: {
      // Minimal v0 capture. Expand to full feature vector when ranking model lands.
      source: "dashboard_button",
    },
  });
  if (insertErr) {
    return { ok: false, error: insertErr.message };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// 即刻 paste — user long-presses a Jike post and pastes body + author + URL.
// We trust the user's submission (no relevance filter; if they typed it in,
// it's relevant), and immediately generate outreach.
// ─────────────────────────────────────────────────────────────────────────

const pasteSchema = z.object({
  product_id: z.string().uuid(),
  body: z.string().trim().min(10, "正文太短，至少 10 字").max(2000, "正文过长"),
  author_handle: z.string().trim().min(1, "作者昵称不能空").max(80),
  source_url: z
    .string()
    .trim()
    .max(300)
    .refine(
      (s) => s.length === 0 || /^https?:\/\//.test(s),
      "链接必须以 http:// 或 https:// 开头"
    )
    .optional()
    .default(""),
});

export type PasteResult =
  | { ok: true; prospect_id: string; outreach_status: "ok" | "ai_failed" }
  | { ok: false; error: string; field?: keyof z.infer<typeof pasteSchema> };

const JIKE_SCAN_REUSE_WINDOW_HOURS = 24;

export async function pasteJikeProspect(
  _prev: PasteResult | null,
  formData: FormData
): Promise<PasteResult> {
  const raw = {
    product_id: formData.get("product_id"),
    body: formData.get("body"),
    author_handle: formData.get("author_handle"),
    source_url: formData.get("source_url") ?? "",
  };
  if (
    typeof raw.product_id !== "string" ||
    typeof raw.body !== "string" ||
    typeof raw.author_handle !== "string" ||
    typeof raw.source_url !== "string"
  ) {
    return { ok: false, error: "提交格式不对" };
  }
  const parsed = pasteSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "参数不对",
      field: issue?.path[0] as keyof z.infer<typeof pasteSchema> | undefined,
    };
  }
  const { product_id, body, author_handle, source_url } = parsed.data;

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const admin = createAdminClient();

  const { data: product, error: productErr } = await admin
    .from("products")
    .select("id, user_id, display_name, description, target_persona")
    .eq("id", product_id)
    .single();
  if (productErr || !product || product.user_id !== user.id) {
    return { ok: false, error: "找不到这个产品" };
  }

  // Reuse the most recent jike-pasted scan for this product if it's < 24h old.
  // Each fresh day = a fresh scan, simplifying the dashboard's "this week" rollup.
  const cutoffISO = new Date(
    Date.now() - JIKE_SCAN_REUSE_WINDOW_HOURS * 3600 * 1000
  ).toISOString();
  const { data: existingScan } = await admin
    .from("scans")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", product_id)
    .eq("platform", "jike-pasted")
    .gte("started_at", cutoffISO)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let scanId = existingScan?.id;
  if (!scanId) {
    const { data: newScan, error: scanErr } = await admin
      .from("scans")
      .insert({
        user_id: user.id,
        product_id,
        platform: "jike-pasted",
        trigger: "user",
      })
      .select("id")
      .single();
    if (scanErr || !newScan) {
      return { ok: false, error: `scan: ${scanErr?.message ?? "insert failed"}` };
    }
    scanId = newScan.id;
  }

  // Insert prospect.
  const { data: prospect, error: prospectErr } = await admin
    .from("prospects")
    .insert({
      scan_id: scanId,
      user_id: user.id,
      source_platform: "jike-pasted",
      source_url: source_url || `jike://pasted/${Date.now()}`,
      author_handle,
      post_title: null,
      post_body: body,
      post_age_days: null,
      post_score: null,
      post_reply_count: null,
      ai_relevance_score: null,
      ai_filter_reason: null,
    })
    .select("id")
    .single();
  if (prospectErr || !prospect) {
    return { ok: false, error: `prospect: ${prospectErr?.message ?? "insert failed"}` };
  }

  // Generate outreach (Sonnet + Haiku critique). Inline; same path as scan.
  const claude = getClaude();
  const outcome = await generateOutreachWithCritique(claude, {
    productDisplayName: product.display_name,
    productDescription: product.description,
    targetPersona: product.target_persona,
    postTitle: null,
    postBody: body,
    authorHandle: author_handle,
  });

  if (!outcome.ok) {
    await admin.from("outreaches").insert({
      prospect_id: prospect.id,
      user_id: user.id,
      draft_v1: "",
      critique_score: null,
      critique_feedback: `[${outcome.generate_version}] ${outcome.reason}: ${outcome.detail}`,
      draft_v2: null,
      final_chosen: null,
      char_count: 0,
      sonnet_tokens: 0,
      haiku_tokens: 0,
      status: "ai_failed",
    });
    revalidatePath("/dashboard");
    return { ok: true, prospect_id: prospect.id, outreach_status: "ai_failed" };
  }

  await admin.from("outreaches").insert({
    prospect_id: prospect.id,
    user_id: user.id,
    draft_v1: outcome.draft_v1,
    critique_score: outcome.critique_score,
    critique_feedback: `[${outcome.generate_version}|${outcome.critique_version}] ${outcome.critique_feedback}`,
    draft_v2: outcome.draft_v2,
    final_chosen: outcome.final_chosen,
    char_count: outcome.final_chosen.length,
    sonnet_tokens: outcome.sonnet_input_tokens + outcome.sonnet_output_tokens,
    haiku_tokens: outcome.haiku_input_tokens + outcome.haiku_output_tokens,
    status: "ok",
  });

  revalidatePath("/dashboard");
  return { ok: true, prospect_id: prospect.id, outreach_status: "ok" };
}

