"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Only enforce caps that prevent paying for runaway AI calls. No min lengths,
// no "好像太短了 AI 看不懂" gating — let the founder type whatever and ship.
const productSchema = z.object({
  display_name: z.string().trim().min(1, "产品名不能为空").max(80),
  description: z.string().trim().min(1, "描述不能为空").max(2000),
  target_persona: z.string().trim().max(500),
});

export type CreateProductState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: keyof z.infer<typeof productSchema> }
  | { status: "ok"; productId: string };

export async function createProduct(
  _prev: CreateProductState,
  formData: FormData
): Promise<CreateProductState> {
  const raw = {
    display_name: formData.get("display_name"),
    description: formData.get("description"),
    target_persona: formData.get("target_persona") ?? "",
  };
  if (
    typeof raw.display_name !== "string" ||
    typeof raw.description !== "string" ||
    typeof raw.target_persona !== "string"
  ) {
    return { status: "error", message: "提交格式不对" };
  }

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      status: "error",
      message: issue?.message ?? "字段不通过校验",
      field: issue?.path[0] as keyof z.infer<typeof productSchema> | undefined,
    };
  }

  // Derive user_id from cookies (publishable client). Trustworthy.
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    redirect("/login?next=/products/new");
  }

  // Write via admin client — bypasses RLS.  See lib/supabase/admin.ts for rationale.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .insert({
      user_id: user.id,
      display_name: parsed.data.display_name,
      description: parsed.data.description,
      target_persona: parsed.data.target_persona,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      status: "error",
      message: `保存失败：${error?.message ?? "未知错误"}`,
    };
  }

  redirect(`/dashboard?product=${data.id}`);
}
