import { z } from "zod";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/security";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ id: string }> };
const patchSchema = z.object({ title: z.string().trim().min(2).max(140).optional(), description: z.string().trim().max(500).optional() }).refine(value => Object.keys(value).length > 0);

export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบก่อนดูบทเรียน", 401, "UNAUTHENTICATED");
  const { id } = await params;
  const { data, error } = await getSupabaseAdmin().from("learning_materials")
    .select("id,title,description,source_type,original_text,extracted_text,processing_status,created_at,updated_at")
    .eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) return jsonError("โหลดบทเรียนไม่สำเร็จ", 503, "MATERIAL_UNAVAILABLE");
  if (!data) return jsonError("ไม่พบบทเรียนนี้", 404, "MATERIAL_NOT_FOUND");
  return jsonOk({ material: data });
}

export async function PATCH(request: Request, { params }: Context) {
  if (!isSameOrigin(request)) return jsonError("คำขอนี้ไม่ปลอดภัย", 403, "ORIGIN_REJECTED");
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบก่อนแก้ไขบทเรียน", 401, "UNAUTHENTICATED");
  const input = patchSchema.safeParse(await readJson(request));
  if (!input.success) return jsonError("ตรวจสอบข้อมูลที่แก้ไขอีกครั้ง", 400, "INVALID_INPUT");
  const { id } = await params;
  const { data, error } = await getSupabaseAdmin().from("learning_materials").update(input.data)
    .eq("id", id).eq("user_id", user.id).select("id,title,description,source_type,processing_status,updated_at").maybeSingle();
  if (error) return jsonError("แก้ไขบทเรียนไม่สำเร็จ", 503, "MATERIAL_UPDATE_FAILED");
  if (!data) return jsonError("ไม่พบบทเรียนนี้", 404, "MATERIAL_NOT_FOUND");
  return jsonOk({ material: data });
}

export async function DELETE(request: Request, { params }: Context) {
  if (!isSameOrigin(request)) return jsonError("คำขอนี้ไม่ปลอดภัย", 403, "ORIGIN_REJECTED");
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบก่อนลบบทเรียน", 401, "UNAUTHENTICATED");
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: material } = await supabase.from("learning_materials").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!material) return jsonError("ไม่พบบทเรียนนี้", 404, "MATERIAL_NOT_FOUND");
  const { data: files, error: fileLookupError } = await supabase.from("material_files").select("bucket_name,storage_path").eq("material_id", id).eq("user_id", user.id);
  if (fileLookupError) return jsonError("ตรวจสอบไฟล์แนบบทเรียนไม่สำเร็จ", 503, "FILE_LOOKUP_FAILED");
  for (const bucket of new Set((files ?? []).map(file => file.bucket_name))) {
    const paths = (files ?? []).filter(file => file.bucket_name === bucket).map(file => file.storage_path);
    if (!paths.length) continue;
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) return jsonError("ลบไฟล์ในพื้นที่จัดเก็บไม่สำเร็จ บทเรียนยังไม่ได้ถูกลบ", 503, "FILE_DELETE_FAILED");
  }
  const { error } = await supabase.from("learning_materials").delete().eq("id", id).eq("user_id", user.id);
  if (error) return jsonError("ลบบทเรียนไม่สำเร็จ", 503, "MATERIAL_DELETE_FAILED");
  return jsonOk({ success: true });
}
