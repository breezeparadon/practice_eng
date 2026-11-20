import { BookOpen } from "lucide-react";
import { redirect } from "next/navigation";
import { auth, authProviders, signIn } from "@/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/");

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
          <CardDescription lang="th">ฝึกคำศัพท์ภาษาอังกฤษสำหรับชีวิตประจำวันและการทำงาน ตั้งแต่พื้นฐานถึงระดับสูง</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {authProviders.google ? (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <Button type="submit" size="lg" className="h-11 w-full">
                เข้าสู่ระบบด้วย Google
              </Button>
            </form>
          ) : null}
          {authProviders.dev ? (
            <form
              action={async () => {
                "use server";
                await signIn("dev", { redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="outline" size="lg" className="h-11 w-full">
                เข้าแบบทดลอง (เฉพาะเครื่องนี้)
              </Button>
            </form>
          ) : null}
          {!authProviders.google && !authProviders.dev ? (
            <Alert variant="destructive">
              <AlertDescription lang="th">ยังไม่ได้ตั้งค่า Google login (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET)</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
