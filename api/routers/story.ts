import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, gt, inArray } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import * as schema from "@db/schema";

export const storyRouter = createRouter({
  // Active stories from friends + self, grouped by user
  list: authedQuery.query(async ({ ctx }) => {
    const userId = ctx.user!.id;
    const now = new Date();

    const friendRows1 = await getDb()
      .select({ friendId: schema.friendships.addresseeId })
      .from(schema.friendships)
      .where(and(eq(schema.friendships.requesterId, userId), eq(schema.friendships.status, "accepted")));

    const friendRows2 = await getDb()
      .select({ friendId: schema.friendships.requesterId })
      .from(schema.friendships)
      .where(and(eq(schema.friendships.addresseeId, userId), eq(schema.friendships.status, "accepted")));

    const friendIds = [userId, ...friendRows1.map((r) => r.friendId), ...friendRows2.map((r) => r.friendId)];

    const activeStories = await getDb()
      .select()
      .from(schema.stories)
      .where(and(inArray(schema.stories.userId, friendIds), gt(schema.stories.expiresAt, now)))
      .orderBy(schema.stories.createdAt);

    if (!activeStories.length) return [];

    const authorIds = [...new Set(activeStories.map((s) => s.userId))];
    const authors = await getDb()
      .select()
      .from(schema.users)
      .where(inArray(schema.users.id, authorIds));

    const authorMap = new Map(authors.map((a) => [a.id, a]));

    // Group by user; own stories always first
    const grouped = new Map<number, { user: any; stories: typeof activeStories }>();
    for (const story of activeStories) {
      const author = authorMap.get(story.userId);
      if (!author) continue;
      const { passwordHash, ...safeAuthor } = author;
      if (!grouped.has(story.userId)) {
        grouped.set(story.userId, { user: safeAuthor, stories: [] });
      }
      grouped.get(story.userId)!.stories.push(story);
    }

    const result = [];
    if (grouped.has(userId)) {
      result.push(grouped.get(userId)!);
      grouped.delete(userId);
    }
    result.push(...grouped.values());
    return result;
  }),

  create: authedQuery
    .input(
      z.object({
        content: z.string().max(200).optional(),
        imageUrl: z.string().url().optional(),
        bgColor: z.string().max(20).default("#3B5998"),
      }).refine((d) => d.content || d.imageUrl, {
        message: "Provide either content or an image URL",
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = await getDb().insert(schema.stories).values({
        userId,
        content: input.content || null,
        imageUrl: input.imageUrl || null,
        bgColor: input.bgColor,
        expiresAt,
      });

      return { id: Number(result[0].insertId), expiresAt };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;
      const story = await getDb()
        .select()
        .from(schema.stories)
        .where(eq(schema.stories.id, input.id))
        .limit(1);

      if (!story.length || story[0].userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete this story" });
      }

      await getDb().delete(schema.stories).where(eq(schema.stories.id, input.id));
      return { success: true };
    }),
});
