import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./connection";

export async function findUserById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows.at(0);
}

export async function findUserByEmail(email: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows.at(0);
}

export async function createUser(data: schema.InsertUser) {
  const result = await getDb().insert(schema.users).values(data);
  return Number(result[0].insertId);
}

export async function updateUser(id: number, data: Partial<schema.InsertUser>) {
  await getDb()
    .update(schema.users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.users.id, id));
}
