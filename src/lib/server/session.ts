import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db, check } from "./db";
export const digest = (v: string) =>
  createHash("sha256")
    .update(v + (process.env.SESSION_SECRET || ""))
    .digest("hex");
export async function authenticated() {
  const token = (await cookies()).get("brew_session")?.value;
  if (!token) return false;
  const { data, error } = await db()
    .from("app_sessions")
    .select("token_hash")
    .eq("token_hash", digest(token))
    .maybeSingle();
  check(error);
  return !!data;
}
export async function requireSession() {
  if (!(await authenticated())) throw new Error("Please unlock Brew Lab.");
}
export async function newSession() {
  const token = randomBytes(32).toString("hex");
  const { error } = await db()
    .from("app_sessions")
    .insert({ token_hash: digest(token) });
  check(error);
  (await cookies()).set("brew_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 10,
  });
}
