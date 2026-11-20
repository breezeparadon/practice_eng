import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { passcodeOk } from "@/server/passcode";

/** The app has one owner and no sign-in. All progress belongs to this user row. */
const OWNER_EMAIL = "owner@wordbook.local";

const ownerId = cache(async (): Promise<string> => {
  const user = await db.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: { email: OWNER_EMAIL, name: "Owner" },
  });
  return user.id;
});

/** Returns the owner's id, or redirects to /unlock when a passcode is set and not entered. */
export async function requireUserId(): Promise<string> {
  if (!(await passcodeOk())) redirect("/unlock");
  return ownerId();
}
