import { getDb } from "../queries/connection";
import * as schema from "@db/schema";

type NotificationType = "friend_request" | "friend_accepted" | "post_like" | "post_comment" | "group_invite";

export async function createNotification({
  userId,
  actorId,
  type,
  entityId,
}: {
  userId: number;
  actorId: number;
  type: NotificationType;
  entityId?: number;
}) {
  if (userId === actorId) return; // never notify yourself
  try {
    await getDb().insert(schema.notifications).values({
      userId,
      actorId,
      type,
      entityId: entityId ?? null,
    });
  } catch {
    // Notifications are non-critical — don't let a failure break the main operation
  }
}
