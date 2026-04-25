import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, ne, desc, inArray, sql, isNull, lt } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import * as schema from "@db/schema";
import { createNotification } from "../lib/notify";

export const groupRouter = createRouter({
  create: authedQuery
    .input(
      z.object({
        name: z.string().min(3).max(100),
        description: z.string().max(500).optional(),
        privacy: z.enum(["public", "private"]).default("public"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const result = await getDb().insert(schema.groups).values({
        name: input.name,
        description: input.description || null,
        creatorId: userId,
        privacy: input.privacy,
      });

      const groupId = Number(result[0].insertId);

      // Creator becomes admin member automatically
      await getDb().insert(schema.groupMembers).values({
        groupId,
        userId,
        role: "admin",
      });

      return { id: groupId };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const group = await getDb()
        .select()
        .from(schema.groups)
        .where(eq(schema.groups.id, input.id))
        .limit(1);

      if (!group.length) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });

      const [memberCount] = await getDb()
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.groupMembers)
        .where(eq(schema.groupMembers.groupId, input.id));

      const membership = await getDb()
        .select()
        .from(schema.groupMembers)
        .where(and(eq(schema.groupMembers.groupId, input.id), eq(schema.groupMembers.userId, userId)))
        .limit(1);

      return {
        ...group[0],
        memberCount: memberCount.count,
        isMember: membership.length > 0,
        memberRole: membership[0]?.role ?? null,
      };
    }),

  // Groups the current user has joined
  listMine: authedQuery.query(async ({ ctx }) => {
    const userId = ctx.user!.id;

    const memberships = await getDb()
      .select({ groupId: schema.groupMembers.groupId })
      .from(schema.groupMembers)
      .where(eq(schema.groupMembers.userId, userId));

    if (!memberships.length) return [];

    const groupIds = memberships.map((m) => m.groupId);
    const myGroups = await getDb()
      .select()
      .from(schema.groups)
      .where(inArray(schema.groups.id, groupIds))
      .orderBy(desc(schema.groups.createdAt));

    const counts = await getDb()
      .select({ groupId: schema.groupMembers.groupId, count: sql<number>`count(*)`.as("count") })
      .from(schema.groupMembers)
      .where(inArray(schema.groupMembers.groupId, groupIds))
      .groupBy(schema.groupMembers.groupId);

    const countMap = new Map(counts.map((c) => [c.groupId, c.count]));
    return myGroups.map((g) => ({ ...g, memberCount: countMap.get(g.id) ?? 0 }));
  }),

  // Public groups the user has NOT joined
  discover: authedQuery
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id;
      const limit = input?.limit ?? 20;

      const memberships = await getDb()
        .select({ groupId: schema.groupMembers.groupId })
        .from(schema.groupMembers)
        .where(eq(schema.groupMembers.userId, userId));

      const joinedIds = memberships.map((m) => m.groupId);

      const allPublic = await getDb()
        .select()
        .from(schema.groups)
        .where(eq(schema.groups.privacy, "public"))
        .orderBy(desc(schema.groups.createdAt))
        .limit(limit + joinedIds.length); // over-fetch to compensate for filtering

      const filtered = allPublic.filter((g) => !joinedIds.includes(g.id)).slice(0, limit);

      if (!filtered.length) return [];

      const filteredIds = filtered.map((g) => g.id);
      const counts = await getDb()
        .select({ groupId: schema.groupMembers.groupId, count: sql<number>`count(*)`.as("count") })
        .from(schema.groupMembers)
        .where(inArray(schema.groupMembers.groupId, filteredIds))
        .groupBy(schema.groupMembers.groupId);

      const countMap = new Map(counts.map((c) => [c.groupId, c.count]));
      return filtered.map((g) => ({ ...g, memberCount: countMap.get(g.id) ?? 0 }));
    }),

  join: authedQuery
    .input(z.object({ groupId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const group = await getDb()
        .select()
        .from(schema.groups)
        .where(eq(schema.groups.id, input.groupId))
        .limit(1);

      if (!group.length) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });

      const existing = await getDb()
        .select()
        .from(schema.groupMembers)
        .where(and(eq(schema.groupMembers.groupId, input.groupId), eq(schema.groupMembers.userId, userId)))
        .limit(1);

      if (existing.length) throw new TRPCError({ code: "CONFLICT", message: "Already a member" });

      await getDb().insert(schema.groupMembers).values({ groupId: input.groupId, userId, role: "member" });

      // Notify group creator
      if (group[0].creatorId !== userId) {
        await createNotification({ userId: group[0].creatorId, actorId: userId, type: "group_invite", entityId: input.groupId });
      }

      return { success: true };
    }),

  leave: authedQuery
    .input(z.object({ groupId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;
      await getDb()
        .delete(schema.groupMembers)
        .where(and(eq(schema.groupMembers.groupId, input.groupId), eq(schema.groupMembers.userId, userId)));
      return { success: true };
    }),

  listMembers: authedQuery
    .input(z.object({ groupId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const members = await getDb()
        .select()
        .from(schema.groupMembers)
        .where(eq(schema.groupMembers.groupId, input.groupId))
        .orderBy(schema.groupMembers.joinedAt)
        .limit(50);

      if (!members.length) return [];

      const userIds = members.map((m) => m.userId);
      const users = await getDb()
        .select()
        .from(schema.users)
        .where(inArray(schema.users.id, userIds));

      const userMap = new Map(users.map((u) => [u.id, u]));
      return members.map((m) => {
        const user = userMap.get(m.userId);
        const { passwordHash, ...safeUser } = user || ({} as any);
        return { ...m, user: safeUser };
      });
    }),

  createPost: authedQuery
    .input(z.object({ groupId: z.number().int().positive(), content: z.string().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const membership = await getDb()
        .select()
        .from(schema.groupMembers)
        .where(and(eq(schema.groupMembers.groupId, input.groupId), eq(schema.groupMembers.userId, userId)))
        .limit(1);

      if (!membership.length) throw new TRPCError({ code: "FORBIDDEN", message: "You must be a member to post" });

      const result = await getDb().insert(schema.posts).values({
        userId,
        groupId: input.groupId,
        content: input.content,
      });

      return { id: Number(result[0].insertId) };
    }),

  listPosts: authedQuery
    .input(z.object({ groupId: z.number().int().positive(), cursor: z.number().optional(), limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user!.id;
      const conditions: any[] = [eq(schema.posts.groupId, input.groupId)];
      if (input.cursor) conditions.push(lt(schema.posts.id, input.cursor));

      const posts = await getDb()
        .select()
        .from(schema.posts)
        .where(and(...conditions))
        .orderBy(desc(schema.posts.createdAt))
        .limit(input.limit + 1);

      let nextCursor: number | undefined;
      if (posts.length > input.limit) {
        posts.pop();
        nextCursor = posts[posts.length - 1].id;
      }

      const authorIds = [...new Set(posts.map((p) => p.userId))];
      const authors = authorIds.length
        ? await getDb().select().from(schema.users).where(inArray(schema.users.id, authorIds))
        : [];
      const authorMap = new Map(authors.map((a) => [a.id, a]));

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

      const userLikes = postIds.length
        ? await getDb()
            .select({ postId: schema.likes.postId })
            .from(schema.likes)
            .where(and(eq(schema.likes.userId, userId), inArray(schema.likes.postId, postIds)))
        : [];
      const userLikedSet = new Set(userLikes.map((l) => l.postId));

      const postsWithData = posts.map((post) => {
        const author = authorMap.get(post.userId);
        const { passwordHash, ...safeAuthor } = author || ({} as any);
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
});
