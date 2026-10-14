import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { KnowledgeGraph } from "@/components/knowledge-graph";
import { relationOne } from "@/lib/relations";

export default async function GraphDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); const { id } = await params; const db = getSupabaseAdmin();
  const { data: graph } = await db.from("knowledge_graphs").select("id,title,material_id,learning_materials(title)").eq("id", id).eq("user_id", user!.id).maybeSingle();
  if (!graph) notFound();
  const [{ data: nodes, error: ne }, { data: edges, error: ee }] = await Promise.all([db.from("graph_nodes").select("id,title,description,node_type,source_references").eq("graph_id", id), db.from("graph_edges").select("id,source_node_id,target_node_id,relationship").eq("graph_id", id)]);
  if (ne || ee) throw new Error("Could not load graph concepts.");
  return <div className="mx-auto max-w-[1320px]"><Link href="/graphs" className="inline-flex items-center gap-2 text-sm text-[var(--text-soft)] hover:text-[var(--ink)]"><ArrowLeft className="size-4"/>แผนภาพทั้งหมด</Link><p className="eyebrow mt-5">{relationOne(graph.learning_materials)?.title}</p><h2 className="page-title mt-1">{graph.title}</h2><p className="mt-1 mb-5 text-sm text-[var(--text-soft)]">เลือกแนวคิดเพื่ออ่านคำอธิบายและข้อความอ้างอิง แล้วสร้างแบบทดสอบเฉพาะเรื่องได้</p><KnowledgeGraph graph={graph} nodes={nodes ?? []} edges={edges ?? []}/></div>;
}
