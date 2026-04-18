"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";

export type CredentialItem = {
  id: string;
  nickname: string | null;
  transports: string[];
  deviceType: string | null;
  backedUp: boolean;
  counter: number;
  createdAt: number;
};

type Props = {
  initialCredentials: CredentialItem[];
};

export default function DashboardClient({ initialCredentials }: Props) {
  const router = useRouter();
  const [creds, setCreds] = useState<CredentialItem[]>(initialCredentials);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/credentials", { cache: "no-store" });
    if (!res.ok) {
      setError("パスキー一覧を取得できませんでした");
      return;
    }
    const data = await res.json();
    setCreds(data.credentials);
  }, []);

  async function addPasskey() {
    setBusy(true);
    setError(null);
    try {
      const optRes = await fetch("/api/auth/register/options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!optRes.ok) {
        const { error } = await optRes.json().catch(() => ({ error: "登録開始に失敗" }));
        throw new Error(error ?? "登録開始に失敗");
      }
      const options = await optRes.json();
      const attResp = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response: attResp }),
      });
      if (!verifyRes.ok) {
        const { error } = await verifyRes.json().catch(() => ({ error: "検証に失敗" }));
        throw new Error(error ?? "検証に失敗");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteCred(id: string) {
    if (!confirm("このパスキーを削除しますか？")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/credentials?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "削除に失敗" }));
        throw new Error(error ?? "削除に失敗");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <section className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            登録済みパスキー ({creds.length})
          </h2>
          <button
            onClick={addPasskey}
            disabled={busy}
            className="h-9 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            + パスキーを追加
          </button>
        </div>

        {creds.length === 0 && (
          <p className="text-sm text-zinc-500">
            まだパスキーがありません。「追加」から作成してください。
          </p>
        )}
        {creds.length > 0 && (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {creds.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {c.nickname ?? "(no nickname)"}
                  </p>
                  <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <dt>作成日</dt>
                    <dd>{new Date(c.createdAt).toLocaleString("ja-JP")}</dd>
                    <dt>Device</dt>
                    <dd>
                      {c.deviceType}
                      {c.backedUp ? " · backed up" : ""}
                    </dd>
                    <dt>Transports</dt>
                    <dd>{c.transports.length > 0 ? c.transports.join(", ") : "—"}</dd>
                    <dt>Counter</dt>
                    <dd>{c.counter}</dd>
                    <dt className="col-span-1">ID</dt>
                    <dd className="col-span-1 truncate font-mono">{c.id}</dd>
                  </dl>
                </div>
                <button
                  onClick={() => deleteCred(c.id)}
                  disabled={busy}
                  className="h-8 shrink-0 rounded-md border border-red-300 px-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
      </section>

      <button
        onClick={logout}
        className="self-start text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ログアウト
      </button>
    </>
  );
}
