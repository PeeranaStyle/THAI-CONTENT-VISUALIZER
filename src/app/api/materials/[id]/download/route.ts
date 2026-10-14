import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบก่อนดาวน์โหลดไฟล์", 401, "UNAUTHENTICATED");
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: material } = await supabase.from("learning_materials").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!material) return jsonError("ไม่พบบทเรียนนี้", 404, "MATERIAL_NOT_FOUND");
  const { data: file, error } = await supabase.from("material_files").select("bucket_name,storage_path,original_filename").eq("material_id", id).eq("user_id", user.id).maybeSingle();
  if (error || !file) return jsonError("ไม่พบไฟล์แนบของบทเรียนนี้", 404, "FILE_NOT_FOUND");
  const { data: signed, error: signError } = await supabase.storage.from(file.bucket_name).createSignedUrl(file.storage_path, 60, { download: file.original_filename });
  if (signError || !signed) return jsonError("สร้างลิงก์ดาวน์โหลดไม่สำเร็จ", 503, "DOWNLOAD_UNAVAILABLE");
  return jsonOk({ url: signed.signedUrl });
}
