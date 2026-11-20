"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PASS_COOKIE, PASS_MAX_AGE, passToken, safeEqual } from "@/server/passcode";

const Input = z.object({ code: z.string().trim().min(1).max(200) });

export async function unlock(formData: FormData): Promise<void> {
  const code = process.env.APP_PASSCODE;
  if (!code) redirect("/");
  const parsed = Input.safeParse({ code: formData.get("code") });
  if (!parsed.success || !safeEqual(passToken(parsed.data.code), passToken(code))) redirect("/unlock?error=1");
  (await cookies()).set(PASS_COOKIE, passToken(code), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PASS_MAX_AGE,
  });
  redirect("/");
}

export async function lock(): Promise<void> {
  (await cookies()).delete(PASS_COOKIE);
  redirect("/unlock");
}
