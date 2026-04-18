import { NextResponse } from "next/server";
import {
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
} from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getDb, type UserRow } from "@/lib/db";
import { rpID, origin } from "@/lib/webauthn";
import { getChallenge, clearChallenge } from "@/lib/challenge";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { response: RegistrationResponseJSON; nickname?: string }
    | null;

  if (!body?.response) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const challengeCtx = await getChallenge();
  if (!challengeCtx || challengeCtx.kind !== "registration") {
    return NextResponse.json({ error: "no active challenge" }, { status: 400 });
  }

  const db = getDb();
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(challengeCtx.userId) as UserRow | undefined;

  if (!user) {
    await clearChallenge();
    return NextResponse.json({ error: "user not found" }, { status: 400 });
  }

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challengeCtx.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (err) {
    await clearChallenge();
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "verification failed" },
      { status: 400 },
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    await clearChallenge();
    return NextResponse.json({ error: "not verified" }, { status: 400 });
  }

  const {
    credential,
    credentialDeviceType,
    credentialBackedUp,
  } = verification.registrationInfo;

  const nickname =
    body.nickname?.trim() ||
    `Passkey (${new Date().toLocaleDateString("ja-JP")})`;

  db.prepare(
    `INSERT INTO credentials (
      id, user_id, public_key, counter, transports, device_type, backed_up, nickname, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    credential.id,
    user.id,
    Buffer.from(credential.publicKey),
    credential.counter,
    credential.transports ? JSON.stringify(credential.transports) : null,
    credentialDeviceType,
    credentialBackedUp ? 1 : 0,
    nickname,
    Date.now(),
  );

  await clearChallenge();
  await createSession({ userId: user.id, username: user.username });

  return NextResponse.json({ verified: true });
}
