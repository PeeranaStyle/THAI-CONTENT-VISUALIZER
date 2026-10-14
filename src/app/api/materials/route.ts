import { z } from "zod";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/security";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const createSchema = z.object({ title: z.string().trim().min(2).max(140), text: z.string().trim().min(40).max(150_000), description: z.string().trim().max(500).default("") });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบเพื่อดูบทเรียน", 401, "UNAUTHENTICATED");
  const { data, error } = await getSupabaseAdmin().from("learning_materials")
    .select("id,title,description,source_type,processing_status,created_at,updated_at")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return jsonError("โหลดบทเรียนไม่สำเร็จ", 503, "MATERIALS_UNAVAILABLE");
  return jsonOk({ materials: data ?? [] });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("คำขอนี้ไม่ปลอดภัย", 403, "ORIGIN_REJECTED");
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบก่อนเพิ่มบทเรียน", 401, "UNAUTHENTICATED");
  const input = createSchema.safeParse(await readJson(request));
  if (!input.success) return jsonError("บทเรียนต้องมีชื่อและเนื้อหาอย่างน้อย 40 ตัวอักษร", 400, "INVALID_MATERIAL");
  const supabase = getSupabaseAdmin();
  const { data: material, error } = await supabase.from("learning_materials").insert({
    user_id: user.id,
    title: input.data.title,
    description: input.data.description,
    source_type: "pasted_text",
    original_text: input.data.text,
    extracted_text: input.data.text,
    processing_status: "ready",
  }).select("id,title,created_at").single();
  if (error || !material) return jsonError("บันทึกบทเรียนไม่สำเร็จ", 503, "MATERIAL_SAVE_FAILED");
  const { error: activityError } = await supabase.from("learning_activity").insert({ user_id: user.id, activity_type: "material_created", reference_id: material.id, metadata: { sourceType: "pasted_text" } });
  if (activityError) await supabase.from("learning_materials").delete().eq("id", material.id).eq("user_id", user.id);
  if (activityError) return jsonError("บันทึกกิจกรรมไม่สำเร็จ กรุณาลองอีกครั้ง", 503, "MATERIAL_SAVE_FAILED");
  return jsonOk({ material }, 201);
}
