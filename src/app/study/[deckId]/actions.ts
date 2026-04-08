"use server";

import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type ActionResult = { error: string } | { error: null };

/**
 * Create a new study session for a deck and redirect into it.
 * @param batchSize  Number of cards per batch, or null for unlimited (study all due cards).
 */
export async function createStudySession(deckId: string, batchSize: number | null = null): Promise<ActionResult> {
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

  if (countError) return { error: countError.message };
  if (!count || count === 0) return { error: "No due cards" };

  const token = nanoid(10);
  const expiresAt = new Date("2100-01-01T00:00:00Z").toISOString();

  // Load the first batch of card IDs when batch mode is enabled
  let batchCardIds: string[] | null = null;
  if (batchSize !== null) {
    const { data: firstBatch } = await supabase
      .from("cards")
      .select("id")
      .eq("deck_id", deckId)
      .eq("user_id", user.id)
      .lte("due_at", now)
      .order("due_at", { ascending: true })
      .limit(batchSize);
    batchCardIds = firstBatch?.map((c) => c.id) ?? [];
  }

  const { error: insertError } = await supabase.from("study_sessions").insert({
    token,
    user_id: user.id,
    deck_id: deckId,
    total: count,
    completed: 0,
    expires_at: expiresAt,
    batch_size: batchSize,
    batch_card_ids: batchCardIds,
    graduated_card_ids: [],
  });

  if (insertError) return { error: insertError.message };

  redirect(`/study/${deckId}/${token}`);
}

/** Delete a study session owned by the current user. */
export async function deleteStudySession(deckId: string, token: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();
  const { error } = await service
    .from("study_sessions")
    .delete()
    .eq("token", token)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/study/${deckId}`);
}
