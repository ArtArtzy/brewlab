import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db, check } from "@/lib/server/db";
import { digest } from "@/lib/server/session";
export async function POST(req: NextRequest) {
  if (
    req.headers.get("origin") !==
    new URL(process.env.APP_ORIGIN || req.url).origin
  )
    return new NextResponse(null, { status: 403 });
  const c = await cookies(),
    token = c.get("brew_session")?.value;
  if (token) {
    const { error } = await db()
      .from("app_sessions")
      .delete()
      .eq("token_hash", digest(token));
    check(error);
  }
  c.delete("brew_session");
  return NextResponse.json({ ok: true });
}
