import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบ", 401, "UNAUTHENTICATED");
  const { data, error } = await getSupabaseAdmin().from("knowledge_graphs").select("id,title,material_id,created_at,learning_materials(title),graph_nodes(id)").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return jsonError("โหลดแผนภาพไม่สำเร็จ", 503, "GRAPHS_UNAVAILABLE");
  return jsonOk({ graphs: data ?? [] });
}
