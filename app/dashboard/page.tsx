import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/supabase/types";
import { KeyboardNav } from "./_keyboard-nav";
import { PasteForm } from "./_paste-form";
import { ProspectList, type ProspectWithOutreach } from "./_prospect-list";
import {
  ProspectFilterBar,
  countByStatus,
  filterByStatus,
} from "./_prospect-filter";
import { ScanForm } from "./_scan-form";
import { SignOutButton } from "./_signout-button";
import { ThisWeek } from "./_this-week";
import { getStreakWeeks, getWeeklyStats } from "@/lib/weekly-stats";

// Reads cookies + DB on every request — never prerender.
export const dynamic = "force-dynamic";

type StatusFilter =
  | "all"
  | "not_sent"
  | "awaiting_reply"
  | "replied"
  | "converted";

interface DashboardSearchParams {
  searchParams: Promise<{
    product?: string;
    min_score?: string;
    status?: StatusFilter;
  }>;
}

export default async function Dashboard({ searchParams }: DashboardSearchParams) {
  // Auth: trust the user-cookie client (well-tested by Supabase Auth).
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  // Reads via admin client + manual user_id filter — sidesteps the JWT-forwarding
  // RLS gap in @supabase/ssr 0.10. See lib/supabase/admin.ts for context.
  const admin = createAdminClient();

  const { data: products } = await admin
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!products || products.length === 0) {
    return <NoProductsState userEmail={user.email ?? ""} />;
  }

  const sp = await searchParams;
  const requestedId = sp.product;
  const activeProduct =
    (requestedId ? products.find((p) => p.id === requestedId) : null) ?? products[0]!;
  const minScore = sp.min_score ? Number(sp.min_score) : 0;
  const statusFilter: StatusFilter =
    sp.status && ["all", "not_sent", "awaiting_reply", "replied", "converted"].includes(sp.status)
      ? sp.status
      : "all";

  // Pull prospects + outreach (1:1) + outreach_events (many).  Score gate
  // pushed to DB; status filter is JS-side because it depends on the
  // shape of joined outreach_events.
  let prospectsQuery = admin
    .from("prospects")
    .select("*, scans!inner(product_id), outreaches(*, outreach_events(*))")
    .eq("user_id", user.id)
    .eq("scans.product_id", activeProduct.id);
  if (minScore > 0) {
    prospectsQuery = prospectsQuery.gte("ai_relevance_score", minScore);
  }
  const { data: rawProspects, error: prospectsErr } = await prospectsQuery
    .order("ai_relevance_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);

  const prospects = rawProspects ? filterByStatus(rawProspects, statusFilter) : [];

  const filterCounts = rawProspects ? countByStatus(rawProspects) : null;
  const hasAnyProspects = (rawProspects?.length ?? 0) > 0;

  // Weekly stats + streak — feeds the "本周" panel and the poster generator.
  const [weeklyStats, streak] = await Promise.all([
    getWeeklyStats(admin, user.id),
    getStreakWeeks(admin, user.id),
  ]);

  return (
    <main id="main" className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 max-w-app mx-auto w-full px-24 lg:px-32 py-64 lg:py-96">
        <DashboardHeader
          userEmail={user.email ?? ""}
          activeProduct={activeProduct}
          allProducts={products}
          streak={streak}
        />

        {!hasAnyProspects && <OnboardingStrip />}

        <ThisWeek stats={weeklyStats} streak={streak} />

        <ScanForm productId={activeProduct.id} />
        <PasteForm productId={activeProduct.id} platform="jike-pasted" />
        <PasteForm productId={activeProduct.id} platform="xhs-pasted" />

        {prospectsErr ? (
          <p className="mt-32 text-sub text-fg" role="alert">
            读取 prospects 出错：{prospectsErr.message}
          </p>
        ) : (
          <>
            <ProspectFilterBar
              productId={activeProduct.id}
              currentMinScore={minScore}
              currentStatus={statusFilter}
              counts={filterCounts}
            />
            <ProspectList
              prospects={prospects as unknown as ProspectWithOutreach[]}
            />
          </>
        )}
      </section>
      <KeyboardNav />
    </main>
  );
}

function DashboardHeader({
  userEmail,
  activeProduct,
  allProducts,
  streak,
}: {
  userEmail: string;
  activeProduct: Product;
  allProducts: Product[];
  streak: number;
}) {
  return (
    <div className="flex flex-col gap-16 sm:flex-row sm:items-start sm:justify-between sm:gap-24">
      <div className="min-w-0">
        <p className="text-meta text-fg-quiet">你正在为这个产品找用户</p>
        <h1 className="mt-4 text-h1 lg:text-h1-lg font-bold text-fg truncate">
          {activeProduct.display_name}
        </h1>
        {streak > 0 && (
          <p className="mt-8 text-meta text-fg-muted">
            🟢 已连续 {streak} 周有人收到你的破冰话术
          </p>
        )}
        {allProducts.length > 1 && (
          <p className="mt-8 text-meta text-fg-quiet">
            切换产品：
            {allProducts.map((p, i) => (
              <span key={p.id}>
                {i > 0 && " · "}
                {p.id === activeProduct.id ? (
                  <span className="text-fg">{p.display_name}</span>
                ) : (
                  <Link
                    href={`/dashboard?product=${p.id}`}
                    className="text-fg-muted hover:text-fg underline-offset-4 hover:underline"
                  >
                    {p.display_name}
                  </Link>
                )}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="flex flex-col items-start sm:items-end gap-8 shrink-0">
        <Link href="/products/new">
          <Button variant="ghost">+ 添加产品</Button>
        </Link>
        <p className="text-meta text-fg-quiet">
          {userEmail}
          <span className="mx-8">·</span>
          按 <kbd className="px-4 py-1 text-meta font-mono border border-rule rounded">?</kbd> 看快捷键
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}

/**
 * First-run onboarding strip — shown when the user has 0 prospects on this
 * product. Lays out the 3-step loop in plain Chinese so first-time users
 * know which form to use first.
 */
function OnboardingStrip() {
  return (
    <div className="mt-32 px-24 py-20 bg-accent/[0.06] border border-accent/30 rounded-md">
      <p className="text-sub text-fg font-semibold">第一次用？三步走</p>
      <ol className="mt-12 space-y-8 text-sub text-fg-muted list-decimal pl-20 marker:text-accent marker:font-semibold">
        <li>
          下面"扫社区找潜在用户" → 选个社区（V2EX / 掘金 / 少数派 / GitHub 中文）→ 点"扫一次"。
          约 15 秒，AI 会找出真的在讨论你产品相关问题的人。
        </li>
        <li>
          往下滚看 AI 找到的潜在用户列表。每个都带一句已经写好的中文破冰话术。
        </li>
        <li>
          点"复制 + 去回帖 ↗" → 在原帖底下回复 → 回来点"已发送"按钮。
          就这样，没了。
        </li>
      </ol>
    </div>
  );
}

function NoProductsState({ userEmail }: { userEmail: string }) {
  return (
    <main id="main" className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 flex items-center justify-center px-24 py-96">
        <div className="text-center max-w-prose">
          <p className="text-meta text-fg-quiet">{userEmail}</p>
          <h1 className="mt-12 text-h1 lg:text-h1-lg font-bold text-fg">
            先告诉我你做的是什么
          </h1>
          <p className="mt-24 text-body text-fg-muted">
            写一段产品描述 + 目标用户画像。
            AI 会用它判断 V2EX / 掘金 / 少数派 / GitHub 中文榜上哪些帖子的作者
            可能是你的潜在用户。
          </p>
          <p className="mt-16 text-sub text-fg-quiet">
            一个账号可以创建多个产品。每个产品独立扫描、独立战绩。
          </p>
          <div className="mt-48 flex justify-center">
            <Link href="/products/new">
              <Button variant="primary">开始 → 创建第一个产品</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
