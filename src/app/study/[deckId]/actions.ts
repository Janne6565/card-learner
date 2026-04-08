"use server";

import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/** Create a new study session for a deck and redirect into it. */
export async function createStudySession(deckId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date().toISOString();
  const { count, error: countError } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .lte("due_at", now);

  if (countError) throw new Error(countError.message);
  if (!count || count === 0) throw new Error("No due cards");

  const token = nanoid(10);
  // Sessions don't expire — set a far-future sentinel date
  const expiresAt = new Date("2100-01-01T00:00:00Z").toISOString();

  const { error: insertError } = await supabase.from("study_sessions").insert({
    token,
    user_id: user.id,
    deck_id: deckId,
    total: count,
    completed: 0,
    expires_at: expiresAt,
  });

  if (insertError) throw new Error(insertError.message);

  redirect(`/study/${deckId}/${token}`);
}

/** Delete a study session owned by the current user. */
export async function deleteStudySession(deckId: string, token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use the service-role client to bypass RLS for the delete. Ownership is
  // still enforced explicitly by the user_id filter below. The initial
  // migration shipped without a DELETE policy on study_sessions, so the
  // anon-key client would silently match zero rows.
  const service = createServiceClient();
  const { error } = await service
    .from("study_sessions")
    .delete()
    .eq("token", token)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/study/${deckId}`);
}
