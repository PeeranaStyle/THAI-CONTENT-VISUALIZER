import { notFound } from "next/navigation";
import { DevAiWorkbench } from "@/components/dev-ai-workbench";

export const dynamic = "force-dynamic";

export default function DevAiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevAiWorkbench />;
}
