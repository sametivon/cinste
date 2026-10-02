import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/supabase/admin";

const allowedMimes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function GET(_: Request, { params }: { params: Promise<{ verificationId: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "ADMIN_REQUIRED" }, { status: 403 });
  const { data: verification } = await db.from("student_verifications").select("id,document_path,document_mime").eq("id", (await params).verificationId).maybeSingle();
  if (!verification || !allowedMimes.has(verification.document_mime)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const { data: document, error } = await adminDb().storage.from("student-documents").download(verification.document_path);
  if (error || !document) return NextResponse.json({ error: "DOCUMENT_UNAVAILABLE" }, { status: 404 });
  const extension = verification.document_mime === "application/pdf" ? "pdf" : verification.document_mime === "image/png" ? "png" : "jpg";
  return new NextResponse(document.stream(), { headers: { "Content-Type": verification.document_mime, "Content-Disposition": `inline; filename="verification-${verification.id}.${extension}"`, "Cache-Control": "private, no-store" } });
}
