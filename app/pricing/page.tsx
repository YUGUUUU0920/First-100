import { Nav } from "@/components/ui/Nav";

export default function Pricing() {
  return (
    <main className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 flex items-center justify-center px-24 py-96 text-center">
        <div>
          <h1 className="text-h1 lg:text-h1-lg font-bold text-fg">定价</h1>
          <p className="mt-24 text-body text-fg-muted">v0 免费内测中，前 100 位用户终身 50% 折扣。</p>
        </div>
      </section>
    </main>
  );
}
