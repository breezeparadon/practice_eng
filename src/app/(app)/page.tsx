import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { getLevels } from "@/lib/catalog";

export default function Home() {
  return (
    <Suspense>
      <Dashboard levels={getLevels()} />
    </Suspense>
  );
}
