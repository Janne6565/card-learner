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
      return NextResponse.json({ done: true, completed: session.completed, total: session.total });
    }

    // Mark active if pending
    if (session.status === "pending") {
      await supabase
        .from("study_sessions")
        .update({ status: "active" })
        .eq("token", token);
    }

    // Fetch next due card
    const now = new Date().toISOString();
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
      // No more due cards — mark session done
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
    });
  } catch (err) {
    console.error("Next card error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
