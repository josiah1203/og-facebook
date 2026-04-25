import { authRouter } from "./auth-router";
import { ogAuthRouter } from "./routers/og-auth";
import { userRouter } from "./routers/user";
import { postRouter } from "./routers/post";
import { friendshipRouter } from "./routers/friendship";
import { likeRouter } from "./routers/like";
import { commentRouter } from "./routers/comment";
import { storyRouter } from "./routers/story";
import { notificationRouter } from "./routers/notification";
import { groupRouter } from "./routers/group";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  ogAuth: ogAuthRouter,
  user: userRouter,
  post: postRouter,
  friendship: friendshipRouter,
  like: likeRouter,
  comment: commentRouter,
  story: storyRouter,
  notification: notificationRouter,
  group: groupRouter,
});

export type AppRouter = typeof appRouter;
