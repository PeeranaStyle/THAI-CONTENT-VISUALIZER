import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบ", 401, "UNAUTHENTICATED");
  const { id } = await params;
  const db = getSupabaseAdmin();
  const { data: graph, error } = await db.from("knowledge_graphs").select("id,title,material_id,created_at,learning_materials(title)").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) return jsonError("โหลดแผนภาพไม่สำเร็จ", 503, "GRAPH_UNAVAILABLE");
  if (!graph) return jsonError("ไม่พบแผนภาพนี้", 404, "GRAPH_NOT_FOUND");
  const [{ data: nodes, error: ne }, { data: edges, error: ee }] = await Promise.all([
    db.from("graph_nodes").select("id,concept_key,title,description,node_type,source_references").eq("graph_id", id),
    db.from("graph_edges").select("id,source_node_id,target_node_id,relationship").eq("graph_id", id),
  ]);
  if (ne || ee) return jsonError("โหลดแนวคิดไม่สำเร็จ", 503, "GRAPH_CONTENT_UNAVAILABLE");
  return jsonOk({ graph, nodes: nodes ?? [], edges: edges ?? [] });
}
