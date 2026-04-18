import { cookies } from "next/headers";

const CHALLENGE_COOKIE = "pd_challenge";
const CHALLENGE_TTL_SECONDS = 60 * 5;

export type ChallengeContext = {
  challenge: string;
  userId: string;
  kind: "registration" | "authentication";
};

export async function setChallenge(ctx: ChallengeContext): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, JSON.stringify(ctx), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

export async function getChallenge(): Promise<ChallengeContext | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CHALLENGE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ChallengeContext;
    if (
      typeof parsed.challenge === "string" &&
      typeof parsed.userId === "string" &&
      (parsed.kind === "registration" || parsed.kind === "authentication")
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearChallenge(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CHALLENGE_COOKIE);
}
