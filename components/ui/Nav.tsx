import Link from "next/link";

/**
 * Top bar per DESIGN.md §4 Landing Hero layout.
 * Fixed-height 48px bar, logo left + 3 text links right. Not sticky.
 */
export function Nav() {
  return (
    <nav className="w-full h-48 flex items-center justify-between px-24 lg:px-32">
      <Link
        href="/"
        className="text-body font-semibold tracking-tight text-fg"
      >
        First 100
      </Link>
      <div className="flex items-center gap-24 lg:gap-32 text-meta lg:text-meta-lg text-fg-muted">
        <Link href="/pricing" className="hover:text-fg transition-colors">
          定价
        </Link>
        <Link href="/blog" className="hover:text-fg transition-colors">
          博客
        </Link>
        <Link href="/login" className="hover:text-fg transition-colors">
          登录
        </Link>
      </div>
    </nav>
  );
}
