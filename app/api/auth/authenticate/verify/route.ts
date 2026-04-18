import { NextResponse } from "next/server";
import {
  verifyAuthenticationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getDb, type CredentialRow, type UserRow } from "@/lib/db";
import { rpID, origin } from "@/lib/webauthn";
import { getChallenge, clearChallenge } from "@/lib/challenge";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { response: AuthenticationResponseJSON }
    | null;

  if (!body?.response) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const challengeCtx = await getChallenge();
  if (!challengeCtx || challengeCtx.kind !== "authentication") {
    return NextResponse.json({ error: "no active challenge" }, { status: 400 });
  }

  const db = getDb();
  const credRow = db
    .prepare("SELECT * FROM credentials WHERE id = ? AND user_id = ?")
    .get(body.response.id, challengeCtx.userId) as CredentialRow | undefined;

  if (!credRow) {
    await clearChallenge();
    return NextResponse.json(
      { error: "credential not registered for this user" },
      { status: 400 },
    );
  }

  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challengeCtx.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credRow.id,
        publicKey: new Uint8Array(credRow.public_key),
        counter: credRow.counter,
        transports: credRow.transports ? JSON.parse(credRow.transports) : undefined,
      },
      requireUserVerification: false,
    });
  } catch (err) {
    await clearChallenge();
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "verification failed" },
      { status: 400 },
    );
  }

  if (!verification.verified) {
    await clearChallenge();
    return NextResponse.json({ error: "not verified" }, { status: 400 });
  }

  db.prepare("UPDATE credentials SET counter = ? WHERE id = ?").run(
    verification.authenticationInfo.newCounter,
    credRow.id,
  );

  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(challengeCtx.userId) as UserRow;

  await clearChallenge();
  await createSession({ userId: user.id, username: user.username });

  return NextResponse.json({ verified: true });
}
