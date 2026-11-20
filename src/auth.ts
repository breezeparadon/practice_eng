import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";

/**
 * Single-owner app: only emails in ALLOWED_EMAILS may sign in.
 * DEV_LOGIN adds a password-less button for local development only; it is
 * ignored unless NODE_ENV is "development".
 */
const devLoginEnabled = process.env.NODE_ENV === "development" && process.env.DEV_LOGIN === "true";
const devEmail = process.env.DEV_LOGIN_EMAIL ?? "dev@localhost";

function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  if (devLoginEnabled && email === devEmail) return true;
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

const providers: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: {},
      authorize: async () => ({ id: devEmail, email: devEmail, name: "Dev" }),
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    signIn: ({ user }) => isAllowed(user.email),
    async jwt({ token, user }) {
      if (user?.email) {
        const row = await db.user.upsert({
          where: { email: user.email },
          update: { name: user.name ?? undefined, image: user.image ?? undefined },
          create: { email: user.email, name: user.name, image: user.image },
        });
        token.uid = row.id;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});

export const authProviders = {
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  dev: devLoginEnabled,
};
