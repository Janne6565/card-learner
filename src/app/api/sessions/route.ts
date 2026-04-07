import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";

/** POST /api/sessions — create a study session for a deck */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deckId } = await request.json();
    if (!deckId) {
      return NextResponse.json({ error: "deckId required" }, { status: 400 });
    }

    // Count due cards
    const now = new Date().toISOString();
    const { count, error: countError } = await supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .eq("user_id", user.id)
      .lte("due_at", now);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if (!count || count === 0) {
      return NextResponse.json({ error: "No due cards" }, { status: 400 });
    }

    const token = nanoid(10);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    const { error: insertError } = await supabase.from("study_sessions").insert({
      token,
      user_id: user.id,
      deck_id: deckId,
      total: count,
      completed: 0,
      expires_at: expiresAt,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ token, total: count });
  } catch (err) {
    console.error("Session creation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
