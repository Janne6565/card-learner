import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sm2, type Rating } from "@/lib/srs/sm2";

interface Props {
  params: Promise<{ token: string }>;
}

/** POST /api/sessions/[token]/answer — submit a rating for a card */
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { token } = await params;
    const { cardId, rating } = await request.json();

    if (!cardId || !rating || ![1, 2, 3, 4].includes(rating)) {
      return NextResponse.json(
        { error: "cardId and rating (1-4) required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Fetch session
    const { data: session, error: sessError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("token", token)
      .single();

    if (sessError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "done" || session.status === "expired") {
      return NextResponse.json({ error: "Session is " + session.status }, { status: 410 });
    }

    // Fetch the card
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .eq("deck_id", session.deck_id)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Run SM-2
    const now = new Date();
    const newState = sm2(
      {
        easeFactor: card.ease_factor,
        intervalDays: card.interval_days,
        repetitions: card.repetitions,
        dueAt: new Date(card.due_at),
        lapses: card.lapses,
      },
      rating as Rating,
      now,
    );

    // Update card
    const { error: updateError } = await supabase
      .from("cards")
      .update({
        ease_factor: newState.easeFactor,
        interval_days: newState.intervalDays,
        repetitions: newState.repetitions,
        due_at: newState.dueAt.toISOString(),
        lapses: newState.lapses,
      })
      .eq("id", cardId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Insert review log
    await supabase.from("reviews").insert({
      card_id: cardId,
      user_id: session.user_id,
      rating,
      prev_interval: card.interval_days,
      new_interval: newState.intervalDays,
    });

    // Update session counters
    const ratingCountColumn =
      rating === 1
        ? "again_count"
        : rating === 2
          ? "hard_count"
          : rating === 3
            ? "good_count"
            : "easy_count";

    // Increment completed and the rating-specific counter
    const { data: updatedSession } = await supabase.rpc("increment_session_counters", {
      p_token: token,
      p_rating_column: ratingCountColumn,
    });

    // Fallback: manual update if RPC doesn't exist
    if (!updatedSession) {
      const newCompleted = session.completed + 1;
      const updateData: Record<string, unknown> = {
        completed: newCompleted,
        [ratingCountColumn]: (session[ratingCountColumn as keyof typeof session] as number) + 1,
      };

      // Check if we're done
      if (newCompleted >= session.total) {
        updateData.status = "done";
      }

      await supabase
        .from("study_sessions")
        .update(updateData)
        .eq("token", token);
    }

    return NextResponse.json({
      ok: true,
      newInterval: newState.intervalDays,
      newEaseFactor: newState.easeFactor,
    });
  } catch (err) {
    console.error("Answer error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
