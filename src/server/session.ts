import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Returns the signed-in user's id or redirects to /login. Use in every protected page and action. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return id;
}
