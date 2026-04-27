import { Nav } from "@/components/ui/Nav";

export default function Blog() {
  return (
    <main className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 flex items-center justify-center px-24 py-96 text-center">
        <div>
          <h1 className="text-h1 lg:text-h1-lg font-bold text-fg">博客</h1>
          <p className="mt-24 text-body text-fg-muted">冷启动笔记、产品复盘、outreach 教学。即将上线。</p>
        </div>
      </section>
    </main>
  );
}
