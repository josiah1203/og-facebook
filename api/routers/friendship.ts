import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, or, inArray } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { createNotification } from "../lib/notify";
import * as schema from "@db/schema";

export const friendshipRouter = createRouter({
  request: authedQuery
    .input(z.object({ addresseeId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const requesterId = ctx.user!.id;
      if (requesterId === input.addresseeId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot friend yourself" });
      }

      // Check if already exists
      const existing = await getDb()
        .select()
        .from(schema.friendships)
        .where(
          or(
            and(
              eq(schema.friendships.requesterId, requesterId),
              eq(schema.friendships.addresseeId, input.addresseeId),
            ),
            and(
              eq(schema.friendships.requesterId, input.addresseeId),
              eq(schema.friendships.addresseeId, requesterId),
            ),
          ),
        )
        .limit(1);

      if (existing.length) {
        throw new TRPCError({ code: "CONFLICT", message: "Friend request already exists" });
      }

      await getDb().insert(schema.friendships).values({
        requesterId,
        addresseeId: input.addresseeId,
        status: "pending",
      });

      await createNotification({ userId: input.addresseeId, actorId: requesterId, type: "friend_request" });

      return { success: true };
    }),

  accept: authedQuery
    .input(z.object({ requesterId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const addresseeId = ctx.user!.id;

      await getDb()
        .update(schema.friendships)
        .set({ status: "accepted" })
        .where(
          and(
            eq(schema.friendships.requesterId, input.requesterId),
            eq(schema.friendships.addresseeId, addresseeId),
            eq(schema.friendships.status, "pending"),
          ),
        );

      await createNotification({ userId: input.requesterId, actorId: addresseeId, type: "friend_accepted" });

      return { success: true };
    }),

  reject: authedQuery
    .input(z.object({ requesterId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const addresseeId = ctx.user!.id;

      await getDb()
        .delete(schema.friendships)
        .where(
          and(
            eq(schema.friendships.requesterId, input.requesterId),
            eq(schema.friendships.addresseeId, addresseeId),
            eq(schema.friendships.status, "pending"),
          ),
        );

      return { success: true };
    }),

  remove: authedQuery
    .input(z.object({ friendId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      await getDb()
        .delete(schema.friendships)
        .where(
          or(
            and(
              eq(schema.friendships.requesterId, userId),
              eq(schema.friendships.addresseeId, input.friendId),
              eq(schema.friendships.status, "accepted"),
            ),
            and(
              eq(schema.friendships.requesterId, input.friendId),
              eq(schema.friendships.addresseeId, userId),
              eq(schema.friendships.status, "accepted"),
            ),
          ),
        );

      return { success: true };
    }),

  listFriends: authedQuery
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input }) => {
      // Get all accepted friendships where user is either requester or addressee
      const rows1 = await getDb()
        .select({ friendId: schema.friendships.addresseeId })
        .from(schema.friendships)
        .where(
          and(
            eq(schema.friendships.requesterId, input.userId),
            eq(schema.friendships.status, "accepted"),
          ),
        );

      const rows2 = await getDb()
        .select({ friendId: schema.friendships.requesterId })
        .from(schema.friendships)
        .where(
          and(
            eq(schema.friendships.addresseeId, input.userId),
            eq(schema.friendships.status, "accepted"),
          ),
        );

      const friendIds = [
        ...rows1.map((r) => r.friendId),
        ...rows2.map((r) => r.friendId),
      ];

      if (!friendIds.length) return [];

      const friends = await getDb()
        .select()
        .from(schema.users)
        .where(inArray(schema.users.id, friendIds));

      return friends.map((f) => {
        const { passwordHash, ...safe } = f;
        return safe;
      });
    }),

  listRequests: authedQuery.query(async ({ ctx }) => {
    const userId = ctx.user!.id;

    const rows = await getDb()
      .select()
      .from(schema.friendships)
      .where(
        and(
          eq(schema.friendships.addresseeId, userId),
          eq(schema.friendships.status, "pending"),
        ),
      );

    if (!rows.length) return [];

    const requesterIds = rows.map((r) => r.requesterId);
    const users = await getDb()
      .select()
      .from(schema.users)
      .where(inArray(schema.users.id, requesterIds));

    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => {
      const u = userMap.get(r.requesterId);
      const { passwordHash, ...safe } = u || {} as any;
      return { ...r, requester: safe };
    });
  }),

  listPending: authedQuery.query(async ({ ctx }) => {
    const userId = ctx.user!.id;

    const rows = await getDb()
      .select()
      .from(schema.friendships)
      .where(
        and(
          eq(schema.friendships.requesterId, userId),
          eq(schema.friendships.status, "pending"),
        ),
      );

    if (!rows.length) return [];

    const addresseeIds = rows.map((r) => r.addresseeId);
    const users = await getDb()
      .select()
      .from(schema.users)
      .where(inArray(schema.users.id, addresseeIds));

    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => {
      const u = userMap.get(r.addresseeId);
      const { passwordHash, ...safe } = u || {} as any;
      return { ...r, addressee: safe };
    });
  }),

  isFriend: authedQuery
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const currentId = ctx.user!.id;

      const rows = await getDb()
        .select()
        .from(schema.friendships)
        .where(
          or(
            and(
              eq(schema.friendships.requesterId, currentId),
              eq(schema.friendships.addresseeId, input.userId),
            ),
            and(
              eq(schema.friendships.requesterId, input.userId),
              eq(schema.friendships.addresseeId, currentId),
            ),
          ),
        )
        .limit(1);

      if (!rows.length) return { status: "none" as const };

      const row = rows[0];
      if (row.status === "accepted") return { status: "accepted" as const };
      if (row.requesterId === currentId) return { status: "pending_sent" as const };
      return { status: "pending_received" as const };
    }),

  listMutualFriends: authedQuery
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const currentId = ctx.user!.id;

      // Get current user's friends
      const currentFriends1 = await getDb()
        .select({ friendId: schema.friendships.addresseeId })
        .from(schema.friendships)
        .where(
          and(
            eq(schema.friendships.requesterId, currentId),
            eq(schema.friendships.status, "accepted"),
          ),
        );
      const currentFriends2 = await getDb()
        .select({ friendId: schema.friendships.requesterId })
        .from(schema.friendships)
        .where(
          and(
            eq(schema.friendships.addresseeId, currentId),
            eq(schema.friendships.status, "accepted"),
          ),
        );
      const currentFriendIds = new Set([
        ...currentFriends1.map((r) => r.friendId),
        ...currentFriends2.map((r) => r.friendId),
      ]);

      // Get target user's friends
      const targetFriends1 = await getDb()
        .select({ friendId: schema.friendships.addresseeId })
        .from(schema.friendships)
        .where(
          and(
            eq(schema.friendships.requesterId, input.userId),
            eq(schema.friendships.status, "accepted"),
          ),
        );
      const targetFriends2 = await getDb()
        .select({ friendId: schema.friendships.requesterId })
        .from(schema.friendships)
        .where(
          and(
            eq(schema.friendships.addresseeId, input.userId),
            eq(schema.friendships.status, "accepted"),
          ),
        );
      const targetFriendIds = new Set([
        ...targetFriends1.map((r) => r.friendId),
        ...targetFriends2.map((r) => r.friendId),
      ]);

      // Intersection
      const mutualIds = [...currentFriendIds].filter((id) => targetFriendIds.has(id));

      if (!mutualIds.length) return [];

      const friends = await getDb()
        .select()
        .from(schema.users)
        .where(inArray(schema.users.id, mutualIds));

      return friends.map((f) => {
        const { passwordHash, ...safe } = f;
        return safe;
      });
    }),
});
