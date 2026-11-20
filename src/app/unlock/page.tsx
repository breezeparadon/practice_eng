import { BookOpen } from "lucide-react";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { unlock } from "@/server/actions/passcode";
import { passcodeOk, passcodeRequired } from "@/server/passcode";

export default async function UnlockPage({ searchParams }: PageProps<"/unlock">) {
  if (!passcodeRequired() || (await passcodeOk())) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="size-5" />
          </span>
          <CardTitle className="text-xl font-semibold" lang="en">
            Wordbook
          </CardTitle>
          <CardDescription lang="th">ใส่รหัสครั้งเดียว เครื่องนี้จะจำไว้หนึ่งปี</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={unlock} className="flex flex-col gap-3">
            <label htmlFor="code" className="sr-only">
              รหัส
            </label>
            <input
              id="code"
              name="code"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              className="h-11 rounded-lg border bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="รหัส"
            />
            {error ? (
              <Alert variant="destructive">
                <AlertDescription lang="th">รหัสไม่ถูกต้อง</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" size="lg" className="h-11">
              เข้าใช้งาน
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
