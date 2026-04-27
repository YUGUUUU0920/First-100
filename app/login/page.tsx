import { Nav } from "@/components/ui/Nav";

export default function Login() {
  return (
    <main className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 flex items-center justify-center px-24 py-96 text-center">
        <div>
          <h1 className="text-h1 lg:text-h1-lg font-bold text-fg">登录</h1>
          <p className="mt-24 text-body text-fg-muted">登录页待接入 Supabase Auth + Resend magic link。</p>
        </div>
      </section>
    </main>
  );
}
