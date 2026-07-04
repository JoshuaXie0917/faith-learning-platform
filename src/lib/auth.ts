import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import type { UserRole } from "@/types";

const MEMBER_ACCESS_CODE = process.env.MEMBER_ACCESS_CODE;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getRoleByPassword(password: string): UserRole | null {
  if (MEMBER_ACCESS_CODE && password === MEMBER_ACCESS_CODE) {
    return "member";
  }

  if (ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
    return "admin";
  }

  return null;
}

export function getExpectedPasswordByRole(role: string) {
  if (role === "admin" || role === "editor") {
    return ADMIN_PASSWORD ?? null;
  }

  if (role === "member") {
    return MEMBER_ACCESS_CODE ?? null;
  }

  return null;
}

export function createPasswordHash(password: string) {
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = pbkdf2Sync(
    password,
    passwordSalt,
    100000,
    64,
    "sha512"
  ).toString("hex");

  return {
    passwordHash,
    passwordSalt,
  };
}

export function verifyPassword(
  password: string,
  passwordHash?: string | null,
  passwordSalt?: string | null
) {
  if (!passwordHash || !passwordSalt) {
    return false;
  }

  try {
    const calculatedHash = pbkdf2Sync(
      password,
      passwordSalt,
      100000,
      64,
      "sha512"
    ).toString("hex");

    return timingSafeEqual(
      Buffer.from(calculatedHash, "hex"),
      Buffer.from(passwordHash, "hex")
    );
  } catch {
    return false;
  }
}