import {
  sqliteTable,
  integer,
  text,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// OG Users table — supports both OAuth (unionId) and custom email/password auth
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unionId: text("unionId").unique(), // Nullable for custom auth users
  email: text("email").unique(), // Optional for OAuth users
  passwordHash: text("passwordHash"), // For custom auth
  name: text("name"),
  college: text("college"), // Extracted from .edu domain
  major: text("major"),
  gradYear: integer("gradYear"),
  hometown: text("hometown"),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  emailVerified: integer("emailVerified", { mode: "boolean" }).default(false).notNull(),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
  lastSignInAt: integer("lastSignInAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Email verification codes for .edu signup
export const emailVerifications = sqliteTable("email_verifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  code: text("code").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export type EmailVerification = typeof emailVerifications.$inferSelect;

// Posts — chronological text-only content
export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  content: text("content").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// Friendships — mutual connection graph
export const friendships = sqliteTable("friendships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requesterId: integer("requesterId").notNull(),
  addresseeId: integer("addresseeId").notNull(),
  status: text("status", { enum: ["pending", "accepted"] }).default("pending").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("friendship_pair_idx").on(table.requesterId, table.addresseeId),
]);

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = typeof friendships.$inferInsert;

// Likes — simple engagement
export const likes = sqliteTable("likes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  postId: integer("postId").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("like_unique_idx").on(table.userId, table.postId),
]);

export type Like = typeof likes.$inferSelect;

// Comments — threaded discussion on posts
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  postId: integer("postId").notNull(),
  content: text("content").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;