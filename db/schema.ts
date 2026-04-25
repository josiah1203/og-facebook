import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  int,
  bigint,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// OG Users table — supports both OAuth (unionId) and custom email/password auth
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).unique(),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: varchar("name", { length: 100 }),
  college: varchar("college", { length: 100 }),
  major: varchar("major", { length: 100 }),
  gradYear: int("gradYear"),
  hometown: varchar("hometown", { length: 100 }),
  bio: varchar("bio", { length: 200 }),
  avatarUrl: text("avatarUrl"),
  coverUrl: text("coverUrl"),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Email verification codes for .edu signup
export const emailVerifications = mysqlTable("email_verifications", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailVerification = typeof emailVerifications.$inferSelect;

// Posts — chronological text-only content
// groupId is null for wall posts, set for group posts
export const posts = mysqlTable("posts", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  groupId: bigint("groupId", { mode: "number", unsigned: true }),
  content: text("content").notNull(),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// Friendships — mutual connection graph
export const friendships = mysqlTable("friendships", {
  id: serial("id").primaryKey(),
  requesterId: bigint("requesterId", { mode: "number", unsigned: true }).notNull(),
  addresseeId: bigint("addresseeId", { mode: "number", unsigned: true }).notNull(),
  status: mysqlEnum("status", ["pending", "accepted"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("friendship_pair_idx").on(table.requesterId, table.addresseeId),
]);

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = typeof friendships.$inferInsert;

// Likes — simple engagement
export const likes = mysqlTable("likes", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("like_unique_idx").on(table.userId, table.postId),
]);

export type Like = typeof likes.$inferSelect;

// Comments — threaded discussion on posts
export const comments = mysqlTable("comments", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// Stories — 24-hour ephemeral posts
export const stories = mysqlTable("stories", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  content: varchar("content", { length: 200 }),
  imageUrl: text("imageUrl"),
  bgColor: varchar("bgColor", { length: 20 }).default("#3B5998"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Story = typeof stories.$inferSelect;
export type InsertStory = typeof stories.$inferInsert;

// Groups — campus interest groups
export const groups = mysqlTable("groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  coverUrl: text("coverUrl"),
  creatorId: bigint("creatorId", { mode: "number", unsigned: true }).notNull(),
  privacy: mysqlEnum("privacy", ["public", "private"]).default("public").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;

// Group members
export const groupMembers = mysqlTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: bigint("groupId", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  role: mysqlEnum("role", ["member", "admin"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("group_member_unique_idx").on(table.groupId, table.userId),
]);

export type GroupMember = typeof groupMembers.$inferSelect;

// Notifications
export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  actorId: bigint("actorId", { mode: "number", unsigned: true }),
  type: mysqlEnum("type", ["friend_request", "friend_accepted", "post_like", "post_comment", "group_invite"]).notNull(),
  entityId: bigint("entityId", { mode: "number", unsigned: true }),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
