import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, inArray } from "drizzle-orm";
import { createRouter, authedQuery, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import * as schema from "@db/schema";

export const commentRouter = createRouter({
  create: authedQuery
    .input(
      z.object({
        postId: z.number().int().positive(),
        content: z.string().min(1).max(1000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const result = await getDb().insert(schema.comments).values({
        userId,
        postId: input.postId,
        content: input.content,
      });

      const commentId = Number(result[0].insertId);

      // Fetch the created comment with author
      const comment = await getDb()
        .select()
        .from(schema.comments)
        .where(eq(schema.comments.id, commentId))
        .limit(1);

      const author = await getDb()
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      const { passwordHash, ...safeAuthor } = author[0] || {} as any;

      return {
        ...comment[0],
        author: safeAuthor,
      };
    }),

  listByPost: publicQuery
    .input(z.object({ postId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const comments = await getDb()
        .select()
        .from(schema.comments)
        .where(eq(schema.comments.postId, input.postId))
        .orderBy(desc(schema.comments.createdAt));

      if (!comments.length) return [];

      const userIds = [...new Set(comments.map((c) => c.userId))];

      const allAuthors = userIds.length
        ? await getDb()
            .select()
            .from(schema.users)
            .where(inArray(schema.users.id, userIds))
        : [];

      const authorMap = new Map(allAuthors.map((a) => [a.id, a]));

      return comments.map((c) => {
        const author = authorMap.get(c.userId);
        const { passwordHash, ...safeAuthor } = author || {} as any;
        return { ...c, author: safeAuthor };
      });
    }),

  delete: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const comment = await getDb()
        .select()
        .from(schema.comments)
        .where(eq(schema.comments.id, input.id))
        .limit(1);

      if (!comment.length || comment[0].userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete this comment" });
      }

      await getDb().delete(schema.comments).where(eq(schema.comments.id, input.id));
      return { success: true };
    }),
});
