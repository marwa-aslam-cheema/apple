/** A same-site path to return to after signing in (never another site). */
export function safeNext(v: string | undefined): string | undefined {
  return v && /^\/[A-Za-z0-9/_\-?=&.%]*$/.test(v) && !v.startsWith("//") ? v.slice(0, 200) : undefined;
}
