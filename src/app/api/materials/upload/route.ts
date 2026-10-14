import { randomUUID } from "node:crypto";
import { PDFParse } from "pdf-parse";
import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/security";
import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("คำขอนี้ไม่ปลอดภัย", 403, "ORIGIN_REJECTED");
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบก่อนอัปโหลด", 401, "UNAUTHENTICATED");
  let form: FormData;
  try { form = await request.formData(); } catch { return jsonError("อ่านไฟล์ที่ส่งมาไม่สำเร็จ", 400, "INVALID_UPLOAD"); }
  const file = form.get("file");
  const titleValue = form.get("title");
  if (!(file instanceof File) || file.size < 8 || file.size > env.MAX_UPLOAD_BYTES) return jsonError("ไฟล์ PDF ต้องมีขนาดไม่เกิน 25 MB", 413, "FILE_SIZE_INVALID");
  const title = typeof titleValue === "string" && titleValue.trim() ? titleValue.trim().slice(0, 140) : file.name.replace(/\.pdf$/i, "").slice(0, 140);
  if (!title || !file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") return jsonError("รองรับเฉพาะไฟล์ PDF เท่านั้น", 415, "FILE_TYPE_INVALID");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") return jsonError("ไฟล์นี้ไม่มีรูปแบบ PDF ที่ถูกต้อง", 415, "PDF_HEADER_INVALID");

  let extractedText = "";
  const parser = new PDFParse({ data: bytes });
  try { extractedText = (await parser.getText()).text.trim(); }
  catch { return jsonError("อ่านเนื้อหาในไฟล์ PDF ไม่ได้ ลองตรวจสอบว่าไฟล์ไม่เสียหาย", 422, "PDF_PARSE_FAILED"); }
  finally { await parser.destroy().catch(() => undefined); }
  if (extractedText.length < 40) return jsonError("ไม่พบข้อความที่อ่านได้ใน PDF หากเป็นไฟล์สแกน ให้คัดลอกข้อความหรือใช้ OCR ก่อน", 422, "PDF_TEXT_UNAVAILABLE");
  if (extractedText.length > 150_000) extractedText = extractedText.slice(0, 150_000);

  const supabase = getSupabaseAdmin();
  const materialId = randomUUID();
  const fileId = randomUUID();
  const storagePath = `users/${user.id}/materials/${materialId}/${fileId}.pdf`;
  const { data: material, error: materialError } = await supabase.from("learning_materials").insert({
    id: materialId, user_id: user.id, title, description: "", source_type: "pdf",
    original_text: extractedText, extracted_text: extractedText, processing_status: "ready",
  }).select("id,title,created_at").single();
  if (materialError || !material) return jsonError("สร้างรายการบทเรียนไม่สำเร็จ", 503, "MATERIAL_SAVE_FAILED");
  const { error: uploadError } = await supabase.storage.from("learning-materials").upload(storagePath, bytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) {
    await supabase.from("learning_materials").delete().eq("id", materialId).eq("user_id", user.id);
    return jsonError("อัปโหลดไปยังพื้นที่จัดเก็บไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า Supabase Storage", 503, "STORAGE_UPLOAD_FAILED");
  }
  const { error: metadataError } = await supabase.from("material_files").insert({
    id: fileId, material_id: materialId, user_id: user.id, bucket_name: "learning-materials", storage_path: storagePath,
    original_filename: file.name.slice(0, 255), mime_type: "application/pdf", file_size: file.size,
  });
  if (metadataError) {
    await supabase.storage.from("learning-materials").remove([storagePath]);
    await supabase.from("learning_materials").delete().eq("id", materialId).eq("user_id", user.id);
    return jsonError("บันทึกรายละเอียดไฟล์ไม่สำเร็จ", 503, "FILE_METADATA_FAILED");
  }
  const { error: activityError } = await supabase.from("learning_activity").insert({ user_id: user.id, activity_type: "material_created", reference_id: materialId, metadata: { sourceType: "pdf" } });
  if (activityError) {
    await supabase.storage.from("learning-materials").remove([storagePath]);
    await supabase.from("learning_materials").delete().eq("id", materialId).eq("user_id", user.id);
    return jsonError("บันทึกกิจกรรมการเรียนไม่สำเร็จ", 503, "MATERIAL_SAVE_FAILED");
  }
  return jsonOk({ material }, 201);
}
