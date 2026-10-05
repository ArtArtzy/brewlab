import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db, check } from "@/lib/server/db";
import { digest, newSession } from "@/lib/server/session";
export async function POST(req: NextRequest) {
  try {
    if (
      req.headers.get("origin") !==
      new URL(process.env.APP_ORIGIN || req.url).origin
    )
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const pin = process.env.APP_PIN;
    if (
      !pin ||
      !/^\d{4}$/.test(pin) ||
      !process.env.SESSION_SECRET ||
      process.env.SESSION_SECRET.length < 32
    )
      throw new Error(
        "Configure APP_PIN and a SESSION_SECRET of at least 32 characters.",
      );
    const keyHash = digest(
      req.headers.get("x-forwarded-for")?.split(",")[0] || "local",
    );
    const { data: allowed, error } = await db().rpc("allow_pin_attempt", {
      key_hash: keyHash,
    });
    check(error);
    if (!allowed)
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429 },
      );
    const body = await req.json();
    if (
      typeof body.pin !== "string" ||
      !/^\d{4}$/.test(body.pin) ||
      !timingSafeEqual(Buffer.from(body.pin), Buffer.from(pin))
    )
      return NextResponse.json(
        { error: "That PIN does not match. Try again." },
        { status: 401 },
      );
    await newSession();
    check(
      (await db().from("pin_attempts").delete().eq("key_hash", keyHash)).error,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unable to unlock" },
      { status: 503 },
    );
  }
}
