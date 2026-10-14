import { NextResponse } from "next/server";

export function jsonError(message: string, status: number, code = "REQUEST_FAILED") {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJson(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { return null; }
}

export function isUniqueViolation(error: unknown): boolean {
  return isRecord(error) && error.code === "23505";
}
