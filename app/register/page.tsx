import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          新規登録
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          ユーザー名を決めたら「パスキーを作成」を押してください。
          端末の生体認証か PIN が求められます。
        </p>
      </div>
      <RegisterForm />
    </main>
  );
}
