import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, ne, like, and, or } from "drizzle-orm";
import * as cookie from "cookie";
import { createRouter, authedQuery, publicQuery } from "../middleware";
import { findUserById } from "../queries/og-users";
import { getDb } from "../queries/connection";
import { OG_SESSION_COOKIE, getSessionCookieOptions } from "../lib/og-auth";
import * as schema from "@db/schema";

export const userRouter = createRouter({
  getById: publicQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const user = await findUserById(input.id);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    }),

  search: authedQuery
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const currentUser = ctx.user!;
      const searchPattern = `%${input.query}%`;

      const rows = await getDb()
        .select()
        .from(schema.users)
        .where(
          and(
            like(schema.users.name, searchPattern),
            ne(schema.users.id, currentUser.id),
          ),
        )
        .limit(input.limit);

      return rows.map((u) => {
        const { passwordHash, ...safe } = u;
        return safe;
      });
    }),

  listByCollege: authedQuery
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.user!;
      const limit = input?.limit ?? 20;

      if (!currentUser.college) return [];

      const rows = await getDb()
        .select()
        .from(schema.users)
        .where(
          and(
            eq(schema.users.college, currentUser.college),
            ne(schema.users.id, currentUser.id),
          ),
        )
        .limit(limit);

      return rows.map((u) => {
        const { passwordHash, ...safe } = u;
        return safe;
      });
    }),

  updateProfile: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        major: z.string().max(100).optional(),
        gradYear: z.number().int().min(2000).max(2035).optional(),
        hometown: z.string().max(100).optional(),
        bio: z.string().max(200).optional(),
        avatarUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const currentUser = ctx.user!;

      await getDb()
        .update(schema.users)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.major !== undefined && { major: input.major || null }),
          ...(input.gradYear && { gradYear: input.gradYear }),
          ...(input.hometown !== undefined && { hometown: input.hometown || null }),
          ...(input.bio !== undefined && { bio: input.bio || null }),
          ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl || null }),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, currentUser.id));

      const updated = await findUserById(currentUser.id);
      const { passwordHash, ...safeUser } = updated!;
      return safeUser;
    }),

  deleteAccount: authedQuery.mutation(async ({ ctx }) => {
    const userId = ctx.user!.id;
    const db = getDb();

    // Delete in FK-safe order: dependents first, user last
    await db.delete(schema.comments).where(eq(schema.comments.userId, userId));
    await db.delete(schema.likes).where(eq(schema.likes.userId, userId));
    await db.delete(schema.friendships).where(
      or(
        eq(schema.friendships.requesterId, userId),
        eq(schema.friendships.addresseeId, userId),
      ),
    );
    await db.delete(schema.posts).where(eq(schema.posts.userId, userId));
    if (ctx.user!.email) {
      await db
        .delete(schema.emailVerifications)
        .where(eq(schema.emailVerifications.email, ctx.user!.email));
    }
    await db.delete(schema.users).where(eq(schema.users.id, userId));

    // Clear the session cookie
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(OG_SESSION_COOKIE, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: (typeof opts.sameSite === "string"
          ? opts.sameSite.toLowerCase()
          : opts.sameSite) as "lax" | "none" | "strict",
        secure: opts.secure,
        maxAge: 0,
      }),
    );

    return { success: true };
  }),
});
