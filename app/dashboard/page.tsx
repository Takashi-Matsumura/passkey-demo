import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getDb, type CredentialRow } from "@/lib/db";
import DashboardClient, { type CredentialItem } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, nickname, transports, device_type, backed_up, counter, created_at FROM credentials WHERE user_id = ? ORDER BY created_at DESC",
    )
    .all(session.userId) as Array<
    Pick<
      CredentialRow,
      | "id"
      | "nickname"
      | "transports"
      | "device_type"
      | "backed_up"
      | "counter"
      | "created_at"
    >
  >;

  const initialCredentials: CredentialItem[] = rows.map((r) => ({
    id: r.id,
    nickname: r.nickname,
    transports: r.transports ? (JSON.parse(r.transports) as string[]) : [],
    deviceType: r.device_type,
    backedUp: r.backed_up === 1,
    counter: r.counter,
    createdAt: r.created_at,
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Signed in as
          </p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {session.username}
          </h1>
        </div>
      </header>
      <DashboardClient initialCredentials={initialCredentials} />
    </main>
  );
}
