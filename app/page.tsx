import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Passkey Demo
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          WebAuthn / FIDO2 を手を動かしながら学ぶためのミニアプリ。
          ユーザー名とパスキーだけでログインします（パスワード不要）。
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/register"
          className="flex h-11 flex-1 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          新規登録してパスキーを作る
        </Link>
        <Link
          href="/login"
          className="flex h-11 flex-1 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          パスキーでログイン
        </Link>
      </div>

      <section className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
        <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">
          このデモで学べること
        </h2>
        <ul className="list-inside list-disc space-y-1">
          <li>パスキー登録のフロー（attestation）</li>
          <li>パスキー認証のフロー（assertion）</li>
          <li>challenge / RP ID / Origin / counter の役割</li>
          <li>サーバー側に保存されるのは公開鍵のみであること</li>
          <li>同一ユーザーに複数のパスキーをひも付けて管理</li>
        </ul>
      </section>
    </main>
  );
}
