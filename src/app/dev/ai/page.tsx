import { notFound } from "next/navigation";
import { DevAiWorkbench } from "@/components/dev-ai-workbench";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DevAiPage() {
  if (process.env.NODE_ENV === "production" && (await getCurrentUser())?.role !== "admin") notFound();
  return <DevAiWorkbench />;
}
