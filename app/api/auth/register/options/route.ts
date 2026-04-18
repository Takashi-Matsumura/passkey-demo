import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, type CredentialRow, type UserRow } from "@/lib/db";
import { rpID, rpName } from "@/lib/webauthn";
import { setChallenge } from "@/lib/challenge";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
    displayName?: string;
  } | null;

  const db = getDb();
  const session = await getSession();

  let user: UserRow | undefined;

  if (session) {
    user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(session.userId) as UserRow | undefined;
    if (!user) {
      return NextResponse.json({ error: "session user missing" }, { status: 401 });
    }
  } else {
    const username = body?.username?.trim();
    if (!username || username.length < 2 || username.length > 32) {
      return NextResponse.json(
        { error: "username must be 2-32 characters" },
        { status: 400 },
      );
    }

    const displayName = body?.displayName?.trim() || null;
    if (displayName && displayName.length > 64) {
      return NextResponse.json(
        { error: "displayName must be 64 characters or less" },
        { status: 400 },
      );
    }

    user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as UserRow | undefined;

    if (!user) {
      const id = uuidv4();
      const now = Date.now();
      db.prepare(
        "INSERT INTO users (id, username, display_name, created_at) VALUES (?, ?, ?, ?)",
      ).run(id, username, displayName, now);
      user = { id, username, display_name: displayName, created_at: now };
    } else if (displayName && !user.display_name) {
      db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(
        displayName,
        user.id,
      );
      user = { ...user, display_name: displayName };
    }
  }

  const existing = db
    .prepare("SELECT * FROM credentials WHERE user_id = ?")
    .all(user.id) as CredentialRow[];

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.username,
    userDisplayName: user.display_name ?? user.username,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.id,
      transports: c.transports ? JSON.parse(c.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await setChallenge({
    challenge: options.challenge,
    userId: user.id,
    kind: "registration",
  });

  return NextResponse.json(options);
}
