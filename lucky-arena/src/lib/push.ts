import webpush from "web-push";
import { and, eq, gt, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { pushSubscriptions, users } from "@/db/schema";

// Phone notifications (Web Push). Switched on by setting VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (see README);
// without them everything here quietly does nothing.
let ready: boolean | null = null;
export function pushConfigured(): boolean {
  if (ready === null) {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    ready = !!pub && !!priv;
    if (ready) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", pub!, priv!);
  }
  return ready;
}

export interface PushMessage { title: string; body: string; url: string }

/** Sends to every phone of these players. Dead subscriptions are removed. Never throws: a failed push must not break chat. */
export async function notifyUsers(db: Db, userIds: number[], msg: PushMessage, opts: { skipActiveWithinMs?: number } = {}) {
  try {
    if (!pushConfigured() || userIds.length === 0) return;
    let ids = userIds;
    if (opts.skipActiveWithinMs) {
      // Someone looking at the site right now already sees the message: do not buzz their phone as well.
      const active = await db.select({ id: users.id }).from(users).where(and(inArray(users.id, userIds), gt(users.lastSeenAt, new Date(Date.now() - opts.skipActiveWithinMs))));
      const skip = new Set(active.map((a) => a.id));
      ids = userIds.filter((i) => !skip.has(i));
    }
    if (ids.length === 0) return;
    const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, ids));
    const payload = JSON.stringify(msg);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
        }
      }),
    );
  } catch {
    /* ignore: notifications are best effort */
  }
}

export async function adminIds(db: Db): Promise<number[]> {
  return (await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"))).map((u) => u.id);
}
