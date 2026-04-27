import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/ui/Nav";
import { SignOutButton } from "./_signout-button";

/**
 * Dashboard — protected by middleware.ts.
 * v0 stub: shows logged-in email + sign out. Prospect list comes in Lane A.
 */
export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // middleware should have already redirected, but defense-in-depth.
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 max-w-app mx-auto w-full px-24 lg:px-32 py-64 lg:py-96">
        <div className="flex items-baseline justify-between mb-48">
          <div>
            <h1 className="text-h1 lg:text-h1-lg font-bold text-fg">
              欢迎回来
            </h1>
            <p className="mt-12 text-body text-fg-muted">
              登录身份：<span className="text-fg">{user.email}</span>
            </p>
          </div>
          <SignOutButton />
        </div>

        <div className="rule pt-48">
          <h2 className="text-h2 font-semibold text-fg">本周</h2>
          <p className="mt-16 text-body text-fg-muted">
            还没开始。Lane A 上线后这里会显示你的 outreach 战绩 + 本周 prospects。
          </p>
        </div>

        <div className="mt-64 rule pt-48">
          <p className="text-meta text-fg-quiet">
            v0 dev — 登录闭环已通。下一步：Lane A（V2EX scan + 即刻粘贴 + Claude 破冰生成）。
          </p>
        </div>
      </section>
    </main>
  );
}
