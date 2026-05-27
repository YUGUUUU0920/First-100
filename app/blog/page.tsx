import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { Button } from "@/components/ui/Button";

export default function Blog() {
  return (
    <main id="main" className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 flex items-center justify-center px-24 py-96 text-center">
        <div>
          <h1 className="text-h1 lg:text-h1-lg font-bold text-fg">博客</h1>
          <p className="mt-24 text-body text-fg-muted">冷启动笔记、产品复盘、outreach 教学。即将上线。</p>
          <p className="mt-12 text-sub text-fg-quiet">先去用产品，第一篇就写你的冷启动。</p>
          <div className="mt-48 flex justify-center">
            <Link href="/login" aria-label="开始免费内测">
              <Button variant="primary">免费内测</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
