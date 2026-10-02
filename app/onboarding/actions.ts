"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function submitVerification(form: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const input = z.object({
    fullName: z.string().min(3).max(120),
    universityId: z.string().uuid(),
    faculty: z.string().max(120).optional(),
  }).parse(Object.fromEntries(form));
  const file = form.get('document');
  if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
    redirect('/onboarding?error=Documentul trebuie să fie PDF, JPG sau PNG și sub 5 MB');
  }

  const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error: uploadError } = await db.storage.from('student-documents').upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) redirect(`/onboarding?error=${encodeURIComponent(uploadError.message)}`);

  const { error } = await db.rpc('submit_student_verification', {
    p_full_name: input.fullName,
    p_university_id: input.universityId,
    p_faculty: input.faculty || null,
    p_document_path: path,
    p_document_mime: file.type,
    p_document_bytes: file.size,
  });
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  redirect('/student');
}
