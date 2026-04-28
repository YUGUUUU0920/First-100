import { Suspense } from "react";
import { Nav } from "@/components/ui/Nav";
import { LoginForm } from "./_form";

export default function Login() {
  return (
    <main className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 flex items-center justify-center px-24 py-96">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
