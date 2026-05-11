import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/supabase/types";
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
    <div className="flex items-baseline justify-between gap-24">
      <div className="min-w-0">
        <h1 className="text-h1 lg:text-h1-lg font-bold text-fg truncate">
          {activeProduct.display_name}
        </h1>
        <p className="mt-12 text-meta text-fg-quiet">
          登录身份：{userEmail}
          {streak > 0 && <> · 🟢 已连续 {streak} 周发出 outreach</>}
        </p>
        {allProducts.length > 1 && (
          <p className="mt-12 text-meta text-fg-quiet">
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
        <p className="mt-8 text-meta text-fg-quiet">
          <Link href="/products/new" className="hover:text-fg underline-offset-4 hover:underline">
            + 加一个产品
          </Link>
        </p>
      </div>
      <SignOutButton />
    </div>
  );
}

function NoProductsState({ userEmail }: { userEmail: string }) {
  return (
    <main id="main" className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 flex items-center justify-center px-24 py-96">
        <div className="text-center max-w-prose">
          <h1 className="text-h1 lg:text-h1-lg font-bold text-fg">
            先告诉我你做的是什么
          </h1>
          <p className="mt-24 text-body text-fg-muted">
            登录身份：{userEmail}
          </p>
          <p className="mt-16 text-body text-fg-muted">
            创建一个产品后，AI 才能知道哪些 V2EX / 即刻帖子的作者可能是你的潜在用户。
          </p>
          <div className="mt-48 flex justify-center">
            <Link href="/products/new">
              <Button variant="primary">创建产品</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
