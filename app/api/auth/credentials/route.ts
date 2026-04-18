import { NextResponse } from "next/server";
import { getDb, type CredentialRow } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, nickname, transports, device_type, backed_up, counter, created_at FROM credentials WHERE user_id = ? ORDER BY created_at DESC",
    )
    .all(session.userId) as Array<Pick<
    CredentialRow,
    | "id"
    | "nickname"
    | "transports"
    | "device_type"
    | "backed_up"
    | "counter"
    | "created_at"
  >>;

  return NextResponse.json({
    username: session.username,
    credentials: rows.map((r) => ({
      id: r.id,
      nickname: r.nickname,
      transports: r.transports ? JSON.parse(r.transports) : [],
      deviceType: r.device_type,
      backedUp: r.backed_up === 1,
      counter: r.counter,
      createdAt: r.created_at,
    })),
  });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare("DELETE FROM credentials WHERE id = ? AND user_id = ?")
    .run(id, session.userId);

  if (result.changes === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
