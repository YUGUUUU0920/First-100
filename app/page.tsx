import { Nav } from "@/components/ui/Nav";
import { Hero } from "./_hero";

/**
 * Landing page — variant B direction per DESIGN.md §4.
 * Hero is a client component (motion). Nav is static.
 */
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <Nav />
      <Hero />
    </main>
  );
}
