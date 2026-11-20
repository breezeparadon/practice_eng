import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Optional gate for a single-owner app. When APP_PASSCODE is unset the site is open.
 * When set, each browser enters it once and keeps an httpOnly cookie for a year.
 */
export const PASS_COOKIE = "wb_pass";
export const PASS_MAX_AGE = 60 * 60 * 24 * 365;

export function passcodeRequired(): boolean {
  return Boolean(process.env.APP_PASSCODE);
}

/** Cookie value derived from the passcode, so the passcode itself is never stored in the browser. */
export function passToken(code: string): string {
  return createHmac("sha256", "wordbook-passcode-v1").update(code).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function passcodeOk(): Promise<boolean> {
  const code = process.env.APP_PASSCODE;
  if (!code) return true;
  const got = (await cookies()).get(PASS_COOKIE)?.value ?? "";
  return safeEqual(got, passToken(code));
}
