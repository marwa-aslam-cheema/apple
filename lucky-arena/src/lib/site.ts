import { inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { settings } from "@/db/schema";

export const DEFAULT_SITE_NAME = "Lucky Arena";
const NAME_KEY = "site_name";
const LOGO_KEY = "site_logo";

/** The site's name and logo, both editable by the admin. */
export async function getSite(db: Db): Promise<{ name: string; logo: string }> {
  const rows = await db.select().from(settings).where(inArray(settings.key, [NAME_KEY, LOGO_KEY]));
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
  return { name: get(NAME_KEY) || DEFAULT_SITE_NAME, logo: get(LOGO_KEY) };
}

export async function saveSite(db: Db, site: { name: string; logo: string }) {
  for (const [key, value] of [[NAME_KEY, site.name.trim() || DEFAULT_SITE_NAME], [LOGO_KEY, site.logo]] as const) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}

export const DEFAULT_SHARE_CAPTION = "Join me on {site} and get FREE SPINS! 🎰✨ Spin the welcome wheel and play with friends. Use my code {code}:";
const SHARE_KEYS = {
  caption: "share_caption", image: "share_image", bonus: "share_bonus_code",
  title: "share_title", intro: "share_intro", codeLabel: "share_code_label", linkBase: "share_link_base",
} as const;

export const DEFAULT_SHARE_PAGE = {
  title: "Invite friends",
  intro: "You and each friend who joins with your link both receive {credits} credits.",
  codeLabel: "Your code",
};

export interface Share { caption: string; image: string; bonus: string; title: string; intro: string; codeLabel: string; linkBase: string }

/**
 * The invite page players use: the post (words {site}, {code} = the player's own code, {bonus} = the free-chips code, a picture, a bonus code),
 * the page's own wording, and the address the invite link starts with (empty = this site).
 */
export async function getShare(db: Db): Promise<Share> {
  const rows = await db.select().from(settings).where(inArray(settings.key, Object.values(SHARE_KEYS)));
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
  return {
    caption: get(SHARE_KEYS.caption) || DEFAULT_SHARE_CAPTION,
    image: get(SHARE_KEYS.image),
    bonus: get(SHARE_KEYS.bonus),
    title: get(SHARE_KEYS.title) || DEFAULT_SHARE_PAGE.title,
    intro: get(SHARE_KEYS.intro) || DEFAULT_SHARE_PAGE.intro,
    codeLabel: get(SHARE_KEYS.codeLabel) || DEFAULT_SHARE_PAGE.codeLabel,
    linkBase: get(SHARE_KEYS.linkBase),
  };
}

export async function saveShare(db: Db, s: Share) {
  const pairs: [string, string][] = [
    [SHARE_KEYS.caption, s.caption.trim() || DEFAULT_SHARE_CAPTION],
    [SHARE_KEYS.image, s.image],
    [SHARE_KEYS.bonus, s.bonus.trim()],
    [SHARE_KEYS.title, s.title.trim() || DEFAULT_SHARE_PAGE.title],
    [SHARE_KEYS.intro, s.intro.trim() || DEFAULT_SHARE_PAGE.intro],
    [SHARE_KEYS.codeLabel, s.codeLabel.trim() || DEFAULT_SHARE_PAGE.codeLabel],
    [SHARE_KEYS.linkBase, s.linkBase.trim().replace(/\/+$/, "")],
  ];
  for (const [key, value] of pairs) await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

/** Fills in the placeholders for one player. */
export function fillCaption(template: string, v: { site: string; code: string; bonus: string }): string {
  return template.replaceAll("{site}", v.site).replaceAll("{code}", v.code).replaceAll("{bonus}", v.bonus);
}
