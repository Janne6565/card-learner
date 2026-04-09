import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ token: string }>;
}

/** GET /api/sessions/[token]/next — get the next due card for a phone session */
export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { token } = await params;
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

    if (session.status === "done") {
      return NextResponse.json({
        done: true,
        completed: session.completed,
        total: session.total,
      });
    }

    // Mark active if pending
    if (session.status === "pending") {
      await supabase
        .from("study_sessions")
        .update({ status: "active" })
        .eq("token", token);
    }

    const now = new Date().toISOString();

    // Compute rating counts from the card_last_ratings map
    const cardLastRatings: Record<string, number> = session.card_last_ratings ?? {};
    const computeRatingCounts = (cardIds?: string[]) => {
      const counts = { again: 0, hard: 0, good: 0, easy: 0 };
      const ids = cardIds ?? Object.keys(cardLastRatings);
      for (const id of ids) {
        const r = cardLastRatings[id];
        if (r === 1) counts.again++;
        else if (r === 2) counts.hard++;
        else if (r === 3) counts.good++;
        else if (r === 4) counts.easy++;
      }
      return counts;
    };

    // ── Batch mode ──────────────────────────────────────────────────────────
    if (session.batch_card_ids !== null) {
      const graduated: string[] = session.graduated_card_ids ?? [];
      let batchIds: string[] = session.batch_card_ids ?? [];

      // Cards in the current batch that haven't been graduated yet
      let remaining = batchIds.filter((id: string) => !graduated.includes(id));

      if (remaining.length === 0) {
        // Current batch is fully mastered — load the next batch
        const { data: nextBatch } = await supabase
          .from("cards")
          .select("id")
          .eq("deck_id", session.deck_id)
          .eq("user_id", session.user_id)
          .lte("due_at", now)
          .not("id", "in", `(${graduated.join(",")})`)
          .order("due_at", { ascending: true })
          .limit(session.batch_size);

        if (!nextBatch || nextBatch.length === 0) {
          // No more cards — session complete
          await supabase
            .from("study_sessions")
            .update({ status: "done" })
            .eq("token", token);
          return NextResponse.json({
            done: true,
            completed: session.completed,
            total: session.total,
          });
        }

        batchIds = nextBatch.map((c: { id: string }) => c.id);
        await supabase
          .from("study_sessions")
          .update({ batch_card_ids: batchIds })
          .eq("token", token);
        remaining = batchIds;
      }

      // Fetch the next due card within the remaining batch
      const { data: card } = await supabase
        .from("cards")
        .select("id, front, back, is_html, tags")
        .in("id", remaining)
        .lte("due_at", now)
        .order("due_at", { ascending: true })
        .limit(1)
        .single();

      if (!card) {
        // All remaining batch cards are requeued slightly in the future (race).
        // Return a small wait hint — the phone will retry.
        return NextResponse.json({ waiting: true });
      }

      return NextResponse.json({
        done: false,
        card,
        progress: {
          completed: session.completed,
          total: session.total,
        },
        batchProgress: {
          graduated: graduated.length,
          batchSize: session.batch_size,
          batchTotal: batchIds.length,
        },
        ratingCounts: computeRatingCounts(batchIds),
      });
    }

    // ── Unlimited mode (no batching) ─────────────────────────────────────────
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id, front, back, is_html, tags")
      .eq("deck_id", session.deck_id)
      .eq("user_id", session.user_id)
      .lte("due_at", now)
      .order("due_at", { ascending: true })
      .limit(1)
      .single();

    if (cardError || !card) {
      await supabase
        .from("study_sessions")
        .update({ status: "done" })
        .eq("token", token);
      return NextResponse.json({
        done: true,
        completed: session.completed,
        total: session.total,
      });
    }

    return NextResponse.json({
      done: false,
      card,
      progress: {
        completed: session.completed,
        total: session.total,
      },
      ratingCounts: computeRatingCounts(),
    });
  } catch (err) {
    console.error("Next card error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
