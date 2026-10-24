/** A player's tags are stored in one text column, separated by "|". */
export const TAG_MAX = 30;
export const TAGS_MAX = 8;
export function tagList(raw: string | null | undefined): string[] {
  return (raw ?? "").split("|").map((t) => t.trim()).filter(Boolean);
}
export function joinTags(tags: string[]): string {
  const clean: string[] = [];
  for (const t of tags.map((x) => x.replace(/\|/g, " ").trim().slice(0, TAG_MAX))) if (t && !clean.includes(t)) clean.push(t);
  return clean.slice(0, TAGS_MAX).join("|");
}
