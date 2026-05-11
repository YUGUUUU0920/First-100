/**
 * Founder allowlist for /admin. Comma-separated email list in env, or — if
 * unset — fall back to the single user_id stored in `FOUNDER_USER_IDS`.
 *
 * The /admin route ONLY exists in v0 for founder dogfood. Once we have
 * paying users we'll split it into a proper role-based system; until then,
 * this hard allowlist + the explicit `getUser()` check is the security model.
 */
export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.FOUNDER_EMAILS;
  if (!raw) return false;
  const allowlist = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}
