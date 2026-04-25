import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { createRouter, authedQuery, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { createNotification } from "../lib/notify";
import * as schema from "@db/schema";

export const likeRouter = createRouter({
  toggle: authedQuery
    .input(z.object({ postId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      // Check if already liked
      const existing = await getDb()
        .select()
        .from(schema.likes)
        .where(
          and(
            eq(schema.likes.userId, userId),
            eq(schema.likes.postId, input.postId),
          ),
        )
        .limit(1);

      let liked: boolean;
      if (existing.length) {
        // Unlike
        await getDb()
          .delete(schema.likes)
          .where(eq(schema.likes.id, existing[0].id));
        liked = false;
      } else {
        // Like
        await getDb().insert(schema.likes).values({
          userId,
          postId: input.postId,
        });
        liked = true;

        // Notify the post author
        const post = await getDb()
          .select({ userId: schema.posts.userId })
          .from(schema.posts)
          .where(eq(schema.posts.id, input.postId))
          .limit(1);
        if (post.length) {
          await createNotification({ userId: post[0].userId, actorId: userId, type: "post_like", entityId: input.postId });
        }
      }

      // Get new count
      const countResult = await getDb()
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.likes)
        .where(eq(schema.likes.postId, input.postId));

      return { liked, count: countResult[0]?.count || 0 };
    }),

  listByPost: publicQuery
    .input(z.object({ postId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const countResult = await getDb()
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.likes)
        .where(eq(schema.likes.postId, input.postId));

      const userIds = await getDb()
        .select({ userId: schema.likes.userId })
        .from(schema.likes)
        .where(eq(schema.likes.postId, input.postId));

      let hasLiked = false;
      if (ctx.user) {
        hasLiked = userIds.some((u) => u.userId === ctx.user!.id);
      }

      return {
        count: countResult[0]?.count || 0,
        userIds: userIds.map((u) => u.userId),
        hasLiked,
      };
    }),
});
