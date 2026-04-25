import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import * as schema from "@db/schema";

export const notificationRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const userId = ctx.user!.id;

    const rows = await getDb()
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(50);

    if (!rows.length) return [];

    const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean) as number[])];
    const actors = actorIds.length
      ? await getDb().select().from(schema.users).where(inArray(schema.users.id, actorIds))
      : [];

    const actorMap = new Map(actors.map((a) => [a.id, a]));

    return rows.map((n) => {
      const actor = n.actorId ? actorMap.get(n.actorId) : null;
      const { passwordHash, ...safeActor } = actor || ({} as any);
      return { ...n, actor: actor ? safeActor : null };
    });
  }),

  unreadCount: authedQuery.query(async ({ ctx }) => {
    const { sql } = await import("drizzle-orm");
    const result = await getDb()
      .select({ count: sql<number>`count(*)`.as("count") })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, ctx.user!.id), eq(schema.notifications.read, false)));

    return { count: result[0]?.count ?? 0 };
  }),

  markRead: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await getDb()
        .update(schema.notifications)
        .set({ read: true })
        .where(and(eq(schema.notifications.id, input.id), eq(schema.notifications.userId, ctx.user!.id)));
      return { success: true };
    }),

  markAllRead: authedQuery.mutation(async ({ ctx }) => {
    await getDb()
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.userId, ctx.user!.id));
    return { success: true };
  }),
});
