// Quick-reply shortcuts: type "ok" alone in the admin message box and it becomes the saved reply.

export type ShortcutMap = Record<string, string>;

export const normalizeShortcut = (s: string) => s.trim().toLowerCase();

/** The saved text for what is typed in the box, or null when it is not a shortcut. Only a box holding nothing but the shortcut expands. */
export function expandShortcut(typed: string, map: ShortcutMap): string | null {
  const key = normalizeShortcut(typed);
  if (!key || /\s/.test(key)) return null;
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
}

export function buildMap(replies: { shortcut?: string | null; body: string }[]): ShortcutMap {
  const map: ShortcutMap = Object.create(null);
  for (const r of replies) {
    const k = normalizeShortcut(r.shortcut ?? "");
    if (k && !/\s/.test(k)) map[k] = r.body;
  }
  return map;
}
