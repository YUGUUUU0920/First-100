import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderWeeklyPoster } from "@/lib/poster";
import { getStreakWeeks, getWeeklyStats } from "@/lib/weekly-stats";

const POSTERS_BUCKET = "posters";
const SIGNED_URL_TTL_SEC = 30 * 24 * 3600; // 30 days

/**
 * POST /api/poster/generate
 * Body: { product_id: uuid }
 *
 * Renders this week's poster (1080×1350 PNG) for the authenticated user,
 * uploads to Supabase Storage, returns a signed URL valid for 30 days.
 *
 * Idempotent: overwrites <user_id>/<iso-week>.png so the user can refresh
 * the poster after each new sent/replied/converted event.
 */
export async function POST(request: Request) {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  let body: { product_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine — fall through to "use most recent product"
  }

  const admin = createAdminClient();

  // Find the product (preferred from body, else most recent for this user).
  const productQuery = admin.from("products").select("id, display_name").eq("user_id", user.id);
  const { data: product, error: productErr } =
    typeof body.product_id === "string"
      ? await productQuery.eq("id", body.product_id).single()
      : await productQuery.order("created_at", { ascending: false }).limit(1).single();
  if (productErr || !product) {
    return NextResponse.json(
      { error: { code: "product_not_found", message: "找不到产品" } },
      { status: 404 }
    );
  }

  const stats = await getWeeklyStats(admin, user.id);
  const streak = await getStreakWeeks(admin, user.id);
  const weekIndex = Math.max(1, streak);

  const response = await renderWeeklyPoster({
    productDisplayName: product.display_name,
    stats,
    weekIndex,
  });
  const buffer = await response.arrayBuffer();

  const storagePath = `${user.id}/${stats.iso_week}.png`;
  const { error: uploadErr } = await admin.storage
    .from(POSTERS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "image/png",
      upsert: true,
    });
  if (uploadErr) {
    return NextResponse.json(
      { error: { code: "storage_error", message: uploadErr.message } },
      { status: 500 }
    );
  }

  const { data: signed, error: signedErr } = await admin.storage
    .from(POSTERS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
  if (signedErr || !signed) {
    return NextResponse.json(
      { error: { code: "storage_error", message: signedErr?.message ?? "sign failed" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    iso_week: stats.iso_week,
    signed_url: signed.signedUrl,
    stats,
  });
}

