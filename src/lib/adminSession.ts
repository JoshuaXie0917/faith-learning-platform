import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE_NAME = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function getAdminPassword() {
  const adminPassword = process.env.ADMIN_PASSWORD;

  return adminPassword ? adminPassword : null;
}

function signPayload(payload: string, adminPassword: string) {
  return createHmac("sha256", adminPassword).update(payload).digest("hex");
}

export function createAdminSessionToken() {
  const adminPassword = getAdminPassword();

  if (!adminPassword) {
    return null;
  }

  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS;
  const payload = String(expiresAt);
  const signature = signPayload(payload, adminPassword);

  return `${payload}.${signature}`;
}

export function getAdminSessionCookieOptions(maxAge = ADMIN_SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

export function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const prefix = `${name}=`;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return cookie ? cookie.slice(prefix.length) : null;
}

export function verifyAdminSessionToken(token: string | null) {
  const adminPassword = getAdminPassword();

  if (!adminPassword || !token) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [payload, signature] = parts;

  if (!/^\d+$/.test(payload) || !/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expiresAt = Number(payload);

  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = signPayload(payload, adminPassword);
  const providedSignatureBuffer = Buffer.from(signature, "hex");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "hex");

  return timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer);
}

export function verifyAdminSessionCookie(cookieHeader: string | null) {
  const token = getCookieValue(cookieHeader, ADMIN_SESSION_COOKIE_NAME);

  return verifyAdminSessionToken(token);
}
