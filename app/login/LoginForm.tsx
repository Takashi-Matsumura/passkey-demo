"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const optRes = await fetch("/api/auth/authenticate/options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!optRes.ok) {
        const { error } = await optRes.json().catch(() => ({ error: "認証開始に失敗" }));
        throw new Error(error ?? "認証開始に失敗");
      }
      const options = await optRes.json();

      const authResp = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/authenticate/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response: authResp }),
      });
      if (!verifyRes.ok) {
        const { error } = await verifyRes.json().catch(() => ({ error: "検証に失敗" }));
        throw new Error(error ?? "検証に失敗");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          ユーザー名
        </span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="alice"
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="h-11 rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {busy ? "処理中…" : "パスキーで認証"}
      </button>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        初めてですか？{" "}
        <Link href="/register" className="underline">
          新規登録へ
        </Link>
      </p>
    </form>
  );
}
