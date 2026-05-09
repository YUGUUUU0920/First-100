"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/**
 * Root error boundary — catches uncaught client-side render errors anywhere
 * in the app shell.  Never use `window.alert` or expose stack traces.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log so it shows up in browser console; ship to Sentry-equivalent later.
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <main id="main" className="min-h-screen flex items-center justify-center px-24 py-96">
      <div className="text-center max-w-prose">
        <p className="text-meta text-fg-quiet uppercase tracking-wider">
          something broke
        </p>
        <h1 className="mt-12 text-h1 lg:text-h1-lg font-bold text-fg">
          页面挂了
        </h1>
        <p className="mt-24 text-body text-fg-muted">
          {error.message || "未知错误，回来再试一次。"}
        </p>
        {error.digest && (
          <p className="mt-12 text-meta text-fg-quiet font-mono">
            id: {error.digest}
          </p>
        )}
        <div className="mt-48 flex justify-center gap-16 items-center">
          <Button type="button" variant="primary" onClick={() => reset()}>
            再试一次
          </Button>
          <Link
            href="/"
            className="text-meta text-fg-muted hover:text-fg underline-offset-4 hover:underline"
          >
            回首页 →
          </Link>
        </div>
      </div>
    </main>
  );
}
