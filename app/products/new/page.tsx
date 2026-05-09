import { Nav } from "@/components/ui/Nav";
import { NewProductForm } from "./_form";

export default function NewProduct() {
  return (
    <main id="main" className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 max-w-app mx-auto w-full px-24 lg:px-32 py-64 lg:py-96">
        <NewProductForm />
      </section>
    </main>
  );
}
