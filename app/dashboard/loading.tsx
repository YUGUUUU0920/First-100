import { Nav } from "@/components/ui/Nav";

/**
 * Suspense boundary for `/dashboard` while the server fetches user, products,
 * prospects, weekly stats, and streak.  Shows skeleton rows in the slots that
 * map 1:1 to the eventual layout — prevents content shift on resolve.
 */
export default function DashboardLoading() {
  return (
    <main id="main" className="min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 max-w-app mx-auto w-full px-24 lg:px-32 py-64 lg:py-96">
        {/* Header */}
        <div className="flex items-baseline justify-between gap-24">
          <div className="flex-1 min-w-0 space-y-12">
            <Skeleton className="h-44 w-[260px] max-w-full" />
            <Skeleton className="h-16 w-[180px]" />
          </div>
          <Skeleton className="h-16 w-[64px]" />
        </div>

        {/* This week */}
        <div className="rule pt-32 mt-48">
          <Skeleton className="h-24 w-[120px]" />
          <Skeleton className="h-20 w-[320px] mt-16" />
        </div>

        {/* Scan form */}
        <div className="rule pt-32 mt-48">
          <Skeleton className="h-24 w-[140px]" />
          <Skeleton className="h-44 w-full max-w-[480px] mt-24" />
        </div>

        {/* Prospects */}
        <div className="rule pt-32 mt-48">
          <Skeleton className="h-24 w-[120px]" />
          <ul className="mt-16">
            {[0, 1, 2].map((i) => (
              <li key={i} className="rule py-24 first:border-t-0 first:pt-0">
                <ProspectSkeleton />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function ProspectSkeleton() {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-16 items-start">
      <Skeleton className="h-44 w-[48px] rounded-md" />
      <div className="min-w-0 space-y-8">
        <Skeleton className="h-20 w-[80%]" />
        <Skeleton className="h-16 w-[40%]" />
        <Skeleton className="h-16 w-full mt-8" />
        <Skeleton className="h-16 w-[90%]" />
      </div>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-rule/60 rounded animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}
