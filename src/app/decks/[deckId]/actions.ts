"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateDeck(deckId: string, formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!name) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("decks")
    .update({ name, description })
    .eq("id", deckId)
    .eq("user_id", user.id);

  redirect(`/decks/${deckId}`);
}
