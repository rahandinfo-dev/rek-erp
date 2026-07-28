import { SignJWT, jwtVerify } from "jose";

function getSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set (min 16 chars) in production.");
    }
    // Dev fallback — never use in production
    return new TextEncoder().encode("rek-dev-only-secret-change-me");
  }
  return new TextEncoder().encode(raw);
}

export type TokenPayload = {
  id: string;
  companyId: string;
  email: string;
};

export async function generateToken(payload: TokenPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
