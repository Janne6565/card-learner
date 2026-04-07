"use server";

import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days

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
