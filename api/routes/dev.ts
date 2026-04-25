import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import * as schema from "@db/schema";

// This router is only mounted in development mode.
// It exposes helpers that make manual testing possible without an email server.
const dev = new Hono();

// GET /api/dev/verification-code?email=you@school.edu
// Returns the latest stored verification code for an email address.
// Use this during signup to complete email verification without needing SMTP.
dev.get("/verification-code", async (c) => {
  const email = c.req.query("email");
  if (!email) {
    return c.json({ error: "email query param is required" }, 400);
  }

  const rows = await getDb()
    .select()
    .from(schema.emailVerifications)
    .where(eq(schema.emailVerifications.email, email))
    .limit(1);

  if (!rows.length) {
    return c.json({ error: "No verification code found for this email" }, 404);
  }

  const row = rows[0];
  const expired = new Date(row.expiresAt) < new Date();

  return c.json({
    email: row.email,
    code: row.code,
    expiresAt: row.expiresAt,
    expired,
  });
});

// GET /api/dev/seed-accounts
// Returns the list of demo accounts created by the seed script.
dev.get("/seed-accounts", (c) => {
  return c.json({
    note: "All accounts use the password: password123",
    accounts: [
      { name: "Alex Chen",      email: "alex.chen@harvard.edu",  college: "Harvard",  major: "Computer Science" },
      { name: "Jordan Rivera",  email: "j.rivera@stanford.edu",  college: "Stanford", major: "Biology" },
      { name: "Taylor Park",    email: "t.park@mit.edu",         college: "MIT",      major: "Physics" },
      { name: "Morgan Blake",   email: "m.blake@yale.edu",       college: "Yale",     major: "English Literature" },
      { name: "Casey Kim",      email: "c.kim@berkeley.edu",     college: "Berkeley", major: "Economics" },
      { name: "Riley O'Brien",  email: "r.obrien@harvard.edu",   college: "Harvard",  major: "History" },
      { name: "Sam Patel",      email: "s.patel@stanford.edu",   college: "Stanford", major: "Mechanical Engineering" },
      { name: "Jamie Foster",   email: "j.foster@mit.edu",       college: "MIT",      major: "Mathematics" },
    ],
  });
});

export { dev as devRouter };
