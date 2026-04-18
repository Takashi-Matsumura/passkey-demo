import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getDb, type CredentialRow, type UserRow } from "@/lib/db";
import { rpID } from "@/lib/webauthn";
import { setChallenge } from "@/lib/challenge";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
  } | null;

  const username = body?.username?.trim();
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const db = getDb();
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;

  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const credentials = db
    .prepare("SELECT * FROM credentials WHERE user_id = ?")
    .all(user.id) as CredentialRow[];

  if (credentials.length === 0) {
    return NextResponse.json(
      { error: "no passkeys registered for this user" },
      { status: 400 },
    );
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: credentials.map((c) => ({
      id: c.id,
      transports: c.transports ? JSON.parse(c.transports) : undefined,
    })),
    userVerification: "preferred",
  });

  await setChallenge({
    challenge: options.challenge,
    userId: user.id,
    kind: "authentication",
  });

  return NextResponse.json(options);
}
