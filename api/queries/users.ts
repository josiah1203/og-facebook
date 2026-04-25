import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  const updateValues: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    ...data,
  };

  if (
    values.role === undefined &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "admin";
    updateValues.role = "admin";
  }

  // Check if user exists by unionId
  const existing = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, values.unionId || ""))
    .limit(1);

  if (existing.length > 0) {
    // Update existing user
    await getDb()
      .update(schema.users)
      .set(updateValues)
      .where(eq(schema.users.unionId, values.unionId || ""));
  } else {
    // Insert new user
    await getDb()
      .insert(schema.users)
      .values(values);
  }
}
