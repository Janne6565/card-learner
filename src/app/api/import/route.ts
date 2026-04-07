import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseAnkiTxt } from "@/lib/anki/parser";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const deckId = formData.get("deckId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const { deckName, cards } = parseAnkiTxt(text);

    if (cards.length === 0) {
      return NextResponse.json({ error: "No cards found in file" }, { status: 400 });
    }

    // Use existing deck or create a new one
    let targetDeckId = deckId;

    if (!targetDeckId) {
      const { data: newDeck, error: deckError } = await supabase
        .from("decks")
        .insert({
          name: deckName || file.name.replace(/\.\w+$/, ""),
          user_id: user.id,
        })
        .select("id")
        .single();

      if (deckError) {
        return NextResponse.json({ error: deckError.message }, { status: 500 });
      }
      targetDeckId = newDeck.id;
    }

    // Bulk insert cards
    const cardRows = cards.map((c) => ({
      deck_id: targetDeckId,
      user_id: user.id,
      guid: c.guid || null,
      notetype: c.notetype || null,
      front: c.front,
      back: c.back,
      tags: c.tags,
      is_html: c.isHtml,
    }));

    // Insert in batches of 500 to avoid payload limits
    const BATCH_SIZE = 500;
    let totalInserted = 0;

    for (let i = 0; i < cardRows.length; i += BATCH_SIZE) {
      const batch = cardRows.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from("cards").insert(batch);
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      totalInserted += batch.length;
    }

    return NextResponse.json({
      imported: totalInserted,
      deckId: targetDeckId,
      deckName: deckName || null,
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
