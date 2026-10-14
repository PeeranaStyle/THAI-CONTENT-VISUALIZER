import type { Metadata } from "next";
import { listMaterials } from "@/lib/materials";
import { getCurrentUser } from "@/lib/auth/session";
import { QuizCreateForm } from "@/components/quiz-create-form";

export const metadata: Metadata = { title: "สร้างแบบทดสอบ" };
type Props = { searchParams: Promise<{ materialId?: string; graphNodeId?: string; coverage?: string }> };

export default async function CreateQuizPage({ searchParams }: Props) {
  const [user, search] = await Promise.all([getCurrentUser(), searchParams]);
  const materials = user ? await listMaterials(user.id) : [];
  return <div className="mx-auto max-w-[1120px]">
    <div className="mb-5"><p className="eyebrow">TURN LEARNING INTO PRACTICE</p><h2 className="page-title mt-1">สร้างแบบทดสอบ</h2><p className="mt-1 text-[12px] text-[var(--text-soft)]">เลือกบทเรียน แล้วกำหนดรูปแบบการทบทวนตามจังหวะของคุณ</p></div>
    <QuizCreateForm materials={materials} initialMaterialId={search.materialId} initialNodeId={search.graphNodeId} initialCoverage={search.coverage} />
  </div>;
}
