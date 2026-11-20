import { BookOpen, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { lock } from "@/server/actions/passcode";
import { passcodeRequired } from "@/server/passcode";
import { requireUserId } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUserId();
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
          {passcodeRequired() ? (
            <form action={lock}>
              <Button type="submit" variant="ghost" size="sm" className="h-9 text-muted-foreground">
                <Lock />
                ล็อกเครื่องนี้
              </Button>
            </form>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
