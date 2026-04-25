import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, inArray, sql, lt } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import * as schema from "@db/schema";

export const postRouter = createRouter({
  create: authedQuery
    .input(z.object({ content: z.string().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user!;
      const result = await getDb().insert(schema.posts).values({
        userId: user.id,
        content: input.content,
      });
      const postId = Number(result[0].insertId);
      return { id: postId, content: input.content, userId: user.id, createdAt: new Date() };
    }),

  listFeed: authedQuery
    .input(
      z.object({
        cursor: z.number().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user!;
      const limit = input?.limit ?? 20;
      const cursor = input?.cursor;

      // Get friend IDs
      const friendRows1 = await getDb()
        .select({ friendId: schema.friendships.addresseeId })
        .from(schema.friendships)
        .where(
          and(
            eq(schema.friendships.requesterId, user.id),
            eq(schema.friendships.status, "accepted"),
          ),
        );

      const friendRows2 = await getDb()
        .select({ friendId: schema.friendships.requesterId })
        .from(schema.friendships)
        .where(
          and(
            eq(schema.friendships.addresseeId, user.id),
            eq(schema.friendships.status, "accepted"),
          ),
        );

      const friendIds = [
        user.id,
        ...friendRows1.map((r) => r.friendId),
        ...friendRows2.map((r) => r.friendId),
      ];

      const conditions = [inArray(schema.posts.userId, friendIds)];
      if (cursor) {
        conditions.push(lt(schema.posts.id, cursor));
      }

      const posts = await getDb()
        .select()
        .from(schema.posts)
        .where(and(...conditions))
        .orderBy(desc(schema.posts.createdAt))
        .limit(limit + 1);

      let nextCursor: number | undefined;
      if (posts.length > limit) {
        posts.pop();
        nextCursor = posts[posts.length - 1].id;
      }

      // Get authors
      const authorIds = [...new Set(posts.map((p) => p.userId))];
      const authors = authorIds.length
        ? await getDb()
            .select()
            .from(schema.users)
            .where(inArray(schema.users.id, authorIds))
        : [];

      const authorMap = new Map(authors.map((a) => [a.id, a]));

      // Get like counts
      const postIds = posts.map((p) => p.id);
      const likeCounts = postIds.length
        ? await getDb()
            .select({
              postId: schema.likes.postId,
              count: sql<number>`count(*)`.as("count"),
            })
            .from(schema.likes)
            .where(inArray(schema.likes.postId, postIds))
            .groupBy(schema.likes.postId)
        : [];

      const likeCountMap = new Map(likeCounts.map((l) => [l.postId, l.count]));

      // Get comment counts
      const commentCounts = postIds.length
        ? await getDb()
            .select({
              postId: schema.comments.postId,
              count: sql<number>`count(*)`.as("count"),
            })
            .from(schema.comments)
            .where(inArray(schema.comments.postId, postIds))
            .groupBy(schema.comments.postId)
        : [];

      const commentCountMap = new Map(commentCounts.map((c) => [c.postId, c.count]));

      // Check if user liked each post
      const userLikes = postIds.length
        ? await getDb()
            .select({ postId: schema.likes.postId })
            .from(schema.likes)
            .where(
              and(
                eq(schema.likes.userId, user.id),
                inArray(schema.likes.postId, postIds),
              ),
            )
        : [];

      const userLikedSet = new Set(userLikes.map((l) => l.postId));

      const postsWithData = posts.map((post) => {
        const author = authorMap.get(post.userId);
        const { passwordHash, ...safeAuthor } = author || {} as any;
        return {
          ...post,
          author: safeAuthor,
          likeCount: likeCountMap.get(post.id) || 0,
          commentCount: commentCountMap.get(post.id) || 0,
          hasLiked: userLikedSet.has(post.id),
        };
      });

      return { posts: postsWithData, nextCursor };
    }),

  listByUser: authedQuery
    .input(
      z.object({
        userId: z.number().int().positive(),
        cursor: z.number().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input }) => {
      const limit = input.limit;
      const conditions = [eq(schema.posts.userId, input.userId)];
      if (input.cursor) {
        conditions.push(lt(schema.posts.id, input.cursor));
      }

      const posts = await getDb()
        .select()
        .from(schema.posts)
        .where(and(...conditions))
        .orderBy(desc(schema.posts.createdAt))
        .limit(limit + 1);

      let nextCursor: number | undefined;
      if (posts.length > limit) {
        posts.pop();
        nextCursor = posts[posts.length - 1].id;
      }

      // Get author
      const author = await getDb()
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, input.userId))
        .limit(1);

      const { passwordHash, ...safeAuthor } = author[0] || {} as any;

      // Get like counts and comments for these posts
      const postIds = posts.map((p) => p.id);
      const likeCounts = postIds.length
        ? await getDb()
            .select({ postId: schema.likes.postId, count: sql<number>`count(*)`.as("count") })
            .from(schema.likes)
            .where(inArray(schema.likes.postId, postIds))
            .groupBy(schema.likes.postId)
        : [];
      const likeCountMap = new Map(likeCounts.map((l) => [l.postId, l.count]));

      const commentCounts = postIds.length
        ? await getDb()
            .select({ postId: schema.comments.postId, count: sql<number>`count(*)`.as("count") })
            .from(schema.comments)
            .where(inArray(schema.comments.postId, postIds))
            .groupBy(schema.comments.postId)
        : [];
      const commentCountMap = new Map(commentCounts.map((c) => [c.postId, c.count]));

      const postsWithData = posts.map((post) => ({
        ...post,
        author: safeAuthor,
        likeCount: likeCountMap.get(post.id) || 0,
        commentCount: commentCountMap.get(post.id) || 0,
        hasLiked: false,
      }));

      return { posts: postsWithData, nextCursor };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user!;
      const post = await getDb()
        .select()
        .from(schema.posts)
        .where(eq(schema.posts.id, input.id))
        .limit(1);

      if (!post.length || post[0].userId !== user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete this post" });
      }

      await getDb().delete(schema.posts).where(eq(schema.posts.id, input.id));
      return { success: true };
    }),
});
