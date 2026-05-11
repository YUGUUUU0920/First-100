import { notFound } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFounderEmail } from "@/lib/admin-allowlist";
import {
  getActivationFunnel,
  getEmailDeliverability,
  getPartialFailureRate,
  getRecentPosters,
  getUsageByUser,
} from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

/**
 * Founder-only observability page. Hard 404 for anyone not in
 * FOUNDER_EMAILS env allowlist — pretends the route doesn't exist rather
 * than showing a 403 (defense via obscurity).
 *
 * 5 panels from CEO plan §observability. Each query is independent so we
 * Promise.all them together — typical render ≤ 600ms even at 1k rows.
 */
export default async function Admin() {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user || !isFounderEmail(user.email)) {
    notFound();
  }

  const admin = createAdminClient();
  const [usage, failures, funnel, posters, email] = await Promise.all([
    getUsageByUser(admin),
    getPartialFailureRate(admin),
    getActivationFunnel(admin),
    getRecentPosters(admin),
    getEmailDeliverability(admin),
  ]);

  return (
    <main id="main" className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 max-w-app mx-auto w-full px-24 lg:px-32 py-64 lg:py-96">
        <h1 className="text-h1 lg:text-h1-lg font-bold text-fg">/admin</h1>
        <p className="mt-12 text-meta text-fg-quiet">
          founder-only observability · {user.email}
        </p>

        {/* 1. Usage by user */}
        <Panel
          title="1. Per-user 7d usage"
          subtitle="Scans + cumulative AI cost in the last 7 days. Highest activity first."
        >
          {usage.length === 0 ? (
            <Empty>没数据 — 这周还没人扫过</Empty>
          ) : (
            <table className="mt-12 text-sub w-full">
              <thead className="text-fg-quiet">
                <tr className="text-left">
                  <th className="py-8 font-normal">user_id</th>
                  <th className="py-8 font-normal text-right">scans</th>
                  <th className="py-8 font-normal text-right">cost (USD)</th>
                  <th className="py-8 font-normal">last scan</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u) => (
                  <tr key={u.user_id} className="rule">
                    <td className="py-8 font-mono text-meta text-fg-muted">
                      {u.user_id.slice(0, 8)}…
                    </td>
                    <td className="py-8 text-right tabular-nums">{u.scans_7d}</td>
                    <td className="py-8 text-right tabular-nums">
                      {(u.cost_cents_7d / 100).toFixed(3)}
                    </td>
                    <td className="py-8 text-meta text-fg-muted">
                      {u.last_scan_at
                        ? new Date(u.last_scan_at).toISOString().slice(0, 16) + "Z"
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* 2. Partial failure rate */}
        <Panel
          title="2. Outreach partial-failure rate (7d)"
          subtitle="ai_failed outreaches / total outreaches in the last 7 days."
        >
          <p className="mt-12 text-h2 font-semibold text-fg tabular-nums">
            {(failures.rate * 100).toFixed(1)}%
          </p>
          <p className="mt-4 text-meta text-fg-quiet tabular-nums">
            {failures.ai_failed} ai_failed / {failures.total} total
          </p>
        </Panel>

        {/* 3. Activation funnel */}
        <Panel
          title="3. Activation funnel"
          subtitle="Distinct users who reached each stage (all-time)."
        >
          <ul className="mt-12 space-y-8 text-sub">
            <FunnelStep label="signed up (≈ created product)" n={funnel.signups} />
            <FunnelStep label="ran first scan" n={funnel.ran_first_scan} />
            <FunnelStep label="first sent" n={funnel.first_sent} />
            <FunnelStep label="first replied" n={funnel.first_replied} />
          </ul>
        </Panel>

        {/* 4. Recent posters */}
        <Panel
          title="4. Recent posters in Storage"
          subtitle="Latest posters across the 5 most active users. Cron success proxy."
        >
          {posters.length === 0 ? (
            <Empty>storage 还没东西 — 没人触发过海报生成</Empty>
          ) : (
            <table className="mt-12 text-sub w-full">
              <thead className="text-fg-quiet">
                <tr className="text-left">
                  <th className="py-8 font-normal">user_id</th>
                  <th className="py-8 font-normal">iso_week</th>
                  <th className="py-8 font-normal text-right">size (KB)</th>
                  <th className="py-8 font-normal">created</th>
                </tr>
              </thead>
              <tbody>
                {posters.map((p) => (
                  <tr key={`${p.user_id}/${p.iso_week}`} className="rule">
                    <td className="py-8 font-mono text-meta text-fg-muted">
                      {p.user_id.slice(0, 8)}…
                    </td>
                    <td className="py-8 tabular-nums">{p.iso_week}</td>
                    <td className="py-8 text-right tabular-nums">{p.size_kb}</td>
                    <td className="py-8 text-meta text-fg-muted">
                      {p.created_at?.slice(0, 16) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* 5. Email deliverability — placeholder */}
        <Panel
          title="5. Email deliverability (Resend)"
          subtitle="Magic-link send → delivered → bounce / complaint."
        >
          <p className="mt-12 text-meta text-fg-quiet italic">{email.note}</p>
        </Panel>
      </section>
    </main>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rule pt-32 mt-48">
      <h2 className="text-h2 font-semibold text-fg">{title}</h2>
      <p className="mt-4 text-meta text-fg-quiet">{subtitle}</p>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-12 text-sub text-fg-quiet">{children}</p>;
}

function FunnelStep({ label, n }: { label: string; n: number }) {
  return (
    <li className="flex items-baseline justify-between tabular-nums">
      <span className="text-fg-muted">{label}</span>
      <span className="text-fg font-semibold">{n}</span>
    </li>
  );
}
