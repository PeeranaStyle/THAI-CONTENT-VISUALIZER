import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type LearningMaterial = {
  id: string;
  title: string;
  description: string;
  source_type: "pasted_text" | "pdf" | "document";
  original_text: string;
  extracted_text: string;
  processing_status: "queued" | "processing" | "ready" | "failed";
  created_at: string;
  updated_at: string;
};

export async function listMaterials(userId: string) {
  const { data, error } = await getSupabaseAdmin().from("learning_materials")
    .select("id,title,description,source_type,processing_status,created_at,updated_at")
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your learning materials.");
  return data ?? [];
}

export async function getOwnedMaterial(userId: string, materialId: string) {
  const { data, error } = await getSupabaseAdmin().from("learning_materials")
    .select("id,title,description,source_type,original_text,extracted_text,processing_status,created_at,updated_at")
    .eq("id", materialId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Could not load this learning material.");
  return data as LearningMaterial | null;
}
