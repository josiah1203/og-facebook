import { authRouter } from "./auth-router";
import { ogAuthRouter } from "./routers/og-auth";
import { userRouter } from "./routers/user";
import { postRouter } from "./routers/post";
import { friendshipRouter } from "./routers/friendship";
import { likeRouter } from "./routers/like";
import { commentRouter } from "./routers/comment";
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
});

export type AppRouter = typeof appRouter;
