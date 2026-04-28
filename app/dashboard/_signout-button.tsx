import { signOut } from "@/app/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-meta lg:text-meta-lg text-fg-muted hover:text-fg underline-offset-4 hover:underline transition-colors"
      >
        退出登录
      </button>
    </form>
  );
}
