import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { Button } from "@/components/ui/Button";

/**
 * Branded 404. Per DESIGN.md tone: warm, direct, indie-self-aware.
 * Never the default "page not found" stack-trace look.
 */
export default function NotFound() {
  return (
    <main id="main" className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 flex items-center justify-center px-24 py-96">
        <div className="text-center max-w-prose">
          <p className="text-meta text-fg-quiet uppercase tracking-wider">404</p>
          <h1 className="mt-12 text-h1 lg:text-h1-lg font-bold text-fg">
            这个页面没在
          </h1>
          <p className="mt-24 text-body text-fg-muted">
            链接可能拼错了，或者那个页面我们还没建。
          </p>
          <div className="mt-48 flex justify-center gap-16">
            <Link href="/">
              <Button variant="primary">回首页</Button>
            </Link>
            <Link
              href="/dashboard"
              className="text-meta text-fg-muted hover:text-fg underline-offset-4 hover:underline self-center"
            >
              或去 dashboard →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
