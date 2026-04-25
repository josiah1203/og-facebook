import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import * as cookie from "cookie";
import { createRouter, publicQuery, authedQuery } from "../middleware";
import { signOGSessionToken, OG_SESSION_COOKIE, getSessionCookieOptions } from "../lib/og-auth";
import { findUserByEmail, createUser, updateUser } from "../queries/og-users";
import { getDb } from "../queries/connection";
import { eq, and, gt } from "drizzle-orm";
import * as schema from "@db/schema";

const eduEmailSchema = z.string().email().refine(
  (v) => v.endsWith(".edu"),
  { message: "OG is exclusively for college students. Please use your .edu email." }
);

const signupSchema = z.object({
  email: eduEmailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100),
  college: z.string().min(1, "College is required"),
  major: z.string().optional(),
  gradYear: z.number().int().min(2000).max(2035).optional(),
  hometown: z.string().max(100).optional(),
  bio: z.string().max(200).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits"),
});

const sendCodeSchema = z.object({
  email: eduEmailSchema,
});

function extractCollegeFromEmail(email: string): string {
  const domain = email.split("@")[1];
  if (!domain) return "Unknown";
  const parts = domain.split(".");
  const collegeName = parts[0];
  return collegeName.charAt(0).toUpperCase() + collegeName.slice(1);
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function setOGSessionCookie(resHeaders: Headers, userId: number, email: string, reqHeaders: Headers) {
  const token = await signOGSessionToken({ userId, email });
  const opts = getSessionCookieOptions(reqHeaders);
  resHeaders.append(
    "set-cookie",
    cookie.serialize(OG_SESSION_COOKIE, token, {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: (typeof opts.sameSite === "string" ? opts.sameSite.toLowerCase() : opts.sameSite) as "lax" | "none" | "strict",
      secure: opts.secure,
      maxAge: 7 * 24 * 60 * 60,
    }),
  );
}

export const ogAuthRouter = createRouter({
  me: publicQuery.query(({ ctx }) => {
    if (!ctx.user) return null;
    const { passwordHash, ...safeUser } = ctx.user;
    return safeUser;
  }),

  signup: publicQuery
    .input(signupSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await findUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists.",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const college = input.college || extractCollegeFromEmail(input.email);

      const userId = await createUser({
        email: input.email,
        passwordHash,
        name: input.name,
        college,
        major: input.major || null,
        gradYear: input.gradYear || null,
        hometown: input.hometown || null,
        bio: input.bio || null,
        emailVerified: true,
        avatarUrl: null,
        role: "user",
      });

      await setOGSessionCookie(ctx.resHeaders, userId, input.email, ctx.req.headers);

      return { success: true, userId };
    }),

  login: publicQuery
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await findUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      await updateUser(user.id, { lastSignInAt: new Date() });
      await setOGSessionCookie(ctx.resHeaders, user.id, user.email!, ctx.req.headers);

      const { passwordHash, ...safeUser } = user;
      return { success: true, user: safeUser };
    }),

  logout: authedQuery.mutation(({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(OG_SESSION_COOKIE, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: (typeof opts.sameSite === "string" ? opts.sameSite.toLowerCase() : opts.sameSite) as "lax" | "none" | "strict",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),

  sendVerificationCode: publicQuery
    .input(sendCodeSchema)
    .mutation(async ({ input }) => {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Check if verification record exists
      const existing = await getDb()
        .select()
        .from(schema.emailVerifications)
        .where(eq(schema.emailVerifications.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        // Update existing verification
        await getDb()
          .update(schema.emailVerifications)
          .set({ code, expiresAt, createdAt: new Date() })
          .where(eq(schema.emailVerifications.email, input.email));
      } else {
        // Insert new verification
        await getDb()
          .insert(schema.emailVerifications)
          .values({ email: input.email, code, expiresAt });
      }

      // TODO: send code via SMTP — add nodemailer/sendgrid and call sendVerificationEmail(input.email, code)
      return { success: true, message: "Verification code sent to your .edu email." };
    }),

  verifyEmail: publicQuery
    .input(verifyCodeSchema)
    .mutation(async ({ input }) => {
      const rows = await getDb()
        .select()
        .from(schema.emailVerifications)
        .where(
          and(
            eq(schema.emailVerifications.email, input.email),
            eq(schema.emailVerifications.code, input.code),
            gt(schema.emailVerifications.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!rows.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification code.",
        });
      }

      // Consume the code so it cannot be reused
      await getDb()
        .delete(schema.emailVerifications)
        .where(eq(schema.emailVerifications.email, input.email));

      return { success: true };
    }),
});
