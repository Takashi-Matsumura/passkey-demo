import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          ログイン
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          登録済みのユーザー名を入力すると、端末のパスキーで認証できます。
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
