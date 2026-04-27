"use client";

/**
 * Sign out: posts to /auth/signout (clears session, redirects to /).
 * Plain HTML form for a POST + redirect — no JS state needed.
 */
export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="text-meta lg:text-meta-lg text-fg-muted hover:text-fg underline-offset-4 hover:underline transition-colors"
      >
        退出登录
      </button>
    </form>
  );
}
