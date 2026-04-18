"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startRegistration } from "@simplewebauthn/browser";

export default function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const optRes = await fetch("/api/auth/register/options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, displayName }),
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
          minLength={2}
          maxLength={32}
          required
          placeholder="alice"
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          表示名{" "}
          <span className="text-zinc-500">（任意・パスワードマネージャー上の表示に使われます）</span>
        </span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={64}
          placeholder="Alice Anderson"
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="h-11 rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {busy ? "処理中…" : "パスキーを作成"}
      </button>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        すでに登録済みですか？{" "}
        <Link href="/login" className="underline">
          ログインへ
        </Link>
      </p>
    </form>
  );
}
