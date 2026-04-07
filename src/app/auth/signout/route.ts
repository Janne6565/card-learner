import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const siteUrl =
    process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = siteUrl
    ? siteUrl.replace(/\/$/, "")
    : forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : new URL(request.url).origin;

  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
