import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";
import { verifyOGSessionToken, OG_SESSION_COOKIE } from "./lib/og-auth";
import * as cookie from "cookie";
import { findUserById } from "./queries/og-users";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  // Try OAuth first
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
    if (ctx.user) return ctx;
  } catch {
    // OAuth auth failed, try custom auth
  }

  // Try custom OG auth
  try {
    const cookies = cookie.parse(opts.req.headers.get("cookie") || "");
    const token = cookies[OG_SESSION_COOKIE];
    if (token) {
      const claim = await verifyOGSessionToken(token);
      if (claim) {
        const user = await findUserById(claim.userId);
        if (user) {
          ctx.user = user;
        }
      }
    }
  } catch {
    // Custom auth failed
  }

  return ctx;
}
