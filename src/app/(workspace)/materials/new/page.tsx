import type { Metadata } from "next";
import { MaterialForm } from "@/components/material-form";
export const metadata: Metadata = { title: "เพิ่มบทเรียน" };
export default function NewMaterialPage() { return <MaterialForm />; }
