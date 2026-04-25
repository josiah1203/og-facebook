import * as jose from "jose";
import { env } from "./env";
import { getSessionCookieOptions } from "./cookies";

export { getSessionCookieOptions };

const JWT_ALG = "HS256";
const OG_SESSION_COOKIE = "og_session";

export interface OGSessionPayload {
  userId: number;
  email: string;
}

export async function signOGSessionToken(payload: OGSessionPayload): Promise<string> {
  const secret = new TextEncoder().encode(env.appSecret + "_og");
  return new jose.SignJWT({ ...payload, type: "og" })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyOGSessionToken(token: string): Promise<OGSessionPayload | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(env.appSecret + "_og");
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
      clockTolerance: 60,
    });
    const userId = payload.userId as number;
    const email = payload.email as string;
    if (!userId || !email) return null;
    return { userId, email };
  } catch {
    return null;
  }
}

export { OG_SESSION_COOKIE };
