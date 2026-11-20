import { BookOpen, LogOut } from "lucide-react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { requireUserId } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUserId();
  const session = await auth();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" lang="en">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BookOpen className="size-4" />
            </span>
            Wordbook
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm" className="h-9 text-muted-foreground">
              <span className="max-w-32 truncate">{session?.user?.name ?? "ออกจากระบบ"}</span>
              <LogOut />
              <span className="sr-only">ออกจากระบบ</span>
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
