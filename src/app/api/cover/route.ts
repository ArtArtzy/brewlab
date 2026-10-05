import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { db, check } from "@/lib/server/db";
import sharp from "sharp";
export async function POST(req: NextRequest) {
  try {
    if (
      req.headers.get("origin") !==
      new URL(process.env.APP_ORIGIN || req.url).origin
    )
      throw new Error("Invalid origin");
    await requireSession();
    const file = (await req.formData()).get("file");
    if (
      !(file instanceof File) ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 12 * 1024 * 1024
    )
      throw new Error("Choose a JPEG, PNG or WebP under 12 MB.");
    const bytes = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 40000000,
    })
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const path = `${crypto.randomUUID()}.webp`;
    check(
      (
        await db()
          .storage.from("bean-covers")
          .upload(path, bytes, { contentType: "image/webp" })
      ).error,
    );
    return NextResponse.json({ path });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 },
    );
  }
}
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const path = req.nextUrl.searchParams.get("path") || "";
    if (!/^[\da-f-]+\.webp$/.test(path)) throw new Error("Invalid cover");
    const { data, error } = await db()
      .storage.from("bean-covers")
      .download(path);
    check(error);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
