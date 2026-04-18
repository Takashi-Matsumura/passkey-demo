# Passkey Demo

WebAuthn / FIDO2 （パスキー）を手を動かしながら学ぶための最小限の Next.js アプリです。ユーザー名とパスキーだけでアカウント登録・ログインができ、パスワードは一切使いません。

- ユーザー登録 → パスキー登録 → パスキー認証 → 保護ページ、の一通りのフローを実装
- 同じユーザーに複数のパスキーを紐付けて一覧・追加・削除
- `better-sqlite3` による単一ファイル DB でサーバー側ストレージを直接覗ける

## 技術スタック

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS 4
- [`@simplewebauthn/server`](https://simplewebauthn.dev/) / `@simplewebauthn/browser`
- `better-sqlite3`（ローカルファイル DB）
- `jose`（セッション cookie の HS256 署名）

## セットアップと起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。環境変数は **開発時は未設定で OK** です（`lib/webauthn.ts` のデフォルトが `localhost` / `http://localhost:3000` を使います）。

独自ドメインや公開環境で動かす場合のみ `.env.local` を作成してください（`.env.local.example` をコピー）。

## 動作確認手順

1. `/register` で `alice` などのユーザー名を入れて「パスキーを作成」
   - macOS なら Touch ID / Face ID / iCloud Keychain の UI が出る
   - Windows なら Windows Hello の UI が出る
2. 自動で `/dashboard` に遷移し、登録したパスキーが 1 件表示される
3. 「ログアウト」→ `/login` → 同じユーザー名で「パスキーで認証」→ dashboard 復帰
4. dashboard の「+ パスキーを追加」で 2 件目を登録（例: 物理セキュリティキー, 別のブラウザ等）
5. 片方を「削除」→ 残った方でログインできることを確認
6. `sqlite3 data/passkey-demo.db 'select id, nickname, counter from credentials;'` で DB の中身を直接覗く

## コードの見どころ

| ファイル | 何をしているか |
|---|---|
| `lib/db.ts` | better-sqlite3 接続と `users` / `credentials` スキーマ |
| `lib/webauthn.ts` | Relying Party（rpID, rpName, origin）設定 |
| `lib/session.ts` | jose で HS256 署名した JWT をセッション cookie に保存 |
| `lib/challenge.ts` | registration/authentication 用の一時 challenge を cookie に保持 |
| `app/api/auth/register/options/route.ts` | `generateRegistrationOptions` で options を作る |
| `app/api/auth/register/verify/route.ts` | `verifyRegistrationResponse` で attestation を検証 |
| `app/api/auth/authenticate/options/route.ts` | `generateAuthenticationOptions` |
| `app/api/auth/authenticate/verify/route.ts` | `verifyAuthenticationResponse` + counter 更新 |
| `app/register/RegisterForm.tsx` | `@simplewebauthn/browser` の `startRegistration` を呼ぶクライアント |
| `app/login/LoginForm.tsx` | `startAuthentication` を呼ぶクライアント |
| `app/dashboard/DashboardClient.tsx` | 登録済み credential 一覧・追加・削除 UI |

## WebAuthn 学習ポイント

### challenge / RP ID / Origin

- **challenge**: サーバーが毎回発行するランダム値。クライアントは端末の秘密鍵でこれに署名して返す。サーバーはその署名を公開鍵で検証。本デモでは cookie に 5 分 TTL で保存（本番はサーバー側セッション KV が理想）
- **RP ID**: 認証対象ドメイン。開発時は `localhost`、本番時は `example.com`。ポート番号は含まない
- **Origin**: スキーム + ホスト + ポートの完全な値。`expectedOrigin` で照合される

### counter（リプレイ攻撃対策）

認証成功のたびに authenticator が返す単調増加カウンタ。前回値より小さい/等しい値が来たらクローン疑いとして拒否すべき。本デモでは `authenticate/verify` で `newCounter` を常時 DB に反映しています。

### attestation

本デモは `attestationType: "none"` を採用。第三者認証局による authenticator の真正性検証は省き、自己証明（self-attestation）相当で受け入れます。企業向け用途で特定機種しか許容しない場合は `"direct"` に切り替え、AAGUID を検証します。

### サーバーに保存されるもの

`credentials` テーブルに保存されるのは:

- credential ID（base64url）
- 公開鍵（CBOR）
- counter
- transports, deviceType, backedUp フラグ

**秘密鍵はサーバーに絶対に来ません**。これがパスワード/TOTP と決定的に違う点です。

## パスキーの基礎知識（学習メモ）

### パスキー vs パスワード: 何が変わるか

| 従来 (ID + パスワード) | パスキー |
|---|---|
| ユーザーが覚える/管理する | ユーザーは**何も覚えない** |
| サーバーにパスワードハッシュを保存 | サーバーに**公開鍵のみ** |
| 使い回せてしまう（漏洩被害が拡大する） | サイトごとに固有の鍵ペアで使い回し不可 |
| フィッシングで盗める | Origin にバインドされ、偽サイトでは鍵が開かない |
| 2FA 併用が実質必須 | 単独でフィッシング耐性と多要素性を満たす |

鍵の配置:

- **秘密鍵**: 端末内の Secure Enclave（Apple の T2/M チップ）、TPM、物理セキュリティキーの Secure Element などに格納。iCloud Keychain などで同期されるときも **エンドツーエンド暗号化** され、Apple / Google 側も中身を読めません
- **公開鍵**: Relying Party（本デモなら Next.js サーバー）の `credentials.public_key` に CBOR バイト列で保存

> ただし「パスワードを完全に廃止」できるかは **アカウントリカバリの設計**次第です。全てのパスキーを失ったときのために、実プロダクトでは email magic link / recovery code / 従来パスワード などのフォールバックを併設するのが通常です。

### パスキーの種類（authenticator の分類）

パスキーは 2 軸で分類できます。

**軸 A: Platform vs Roaming（どこに存在するか）**

| 種類 | 例 | 特徴 |
|---|---|---|
| Platform Authenticator | MacBook Touch ID、iPhone Face ID、Windows Hello、Android 指紋認証 | 端末そのものに内蔵。持ち運び不要 |
| Roaming Authenticator | YubiKey、SoloKey、Titan Key、CTAP2 対応スマホ（PC で caBLE 経由使用） | 着脱可能・持ち運べる |

**軸 B: Synced vs Device-bound（複製・同期されるか）**

| 種類 | 例 | `backedUp` フラグ |
|---|---|---|
| 同期パスキー（Synced） | iCloud Keychain、Google Password Manager、1Password、Dashlane、Bitwarden | `true` |
| デバイスバウンド（Device-bound） | YubiKey、TPM に固定されたパスキー | `false` |

本デモ dashboard の `deviceType` (`singleDevice` / `multiDevice`) と `backedUp` で、登録されたパスキーがどの象限かを判別できます。例: macOS + iCloud Keychain は `multiDevice · backed up`。

> 生体認証（Touch ID / Face ID / Windows Hello）はパスキーそのものではなく、**端末に保管された秘密鍵を解錠するためのローカル認証（UV = User Verification）の手段**です。WebAuthn では「生体、PIN、パスコードのどれか」という抽象で扱われます。

### `transports` の意味

dashboard に `hybrid, internal` のように表示される項目。authenticator がどの経路でホストと通信するかを示します。

| 値 | 意味 |
|---|---|
| `internal` | 端末内蔵（Touch ID / Face ID / Windows Hello） |
| `hybrid` | CTAP 2.2 の caBLE。QR コード + Bluetooth でスマホを PC の authenticator として使う |
| `usb` / `nfc` / `ble` | 物理セキュリティキーの接続方式 |

### user entity の 3 フィールド

`PublicKeyCredentialUserEntity` は登録時に次の 3 つを持ちます:

| フィールド | 役割 | 本デモでの値 |
|---|---|---|
| `id` | ユーザーの不変な内部 ID（opaque bytes）。パスキーはこの ID にひも付く | UUID を UTF-8 bytes 化 |
| `name` | ログイン識別子。メール・ハンドル名など | `alice` |
| `displayName` | 人が読むためのフルネーム。パスワードマネージャーの UI で表示される | `Alice Anderson`（任意） |

Google Password Manager や iCloud Keychain の一覧画面で「表示名」として出てくるのは `displayName` の値です。本デモでは `/register` フォームで任意入力にし、空のときは `name` にフォールバックします。

### 登録時に OS が出すプロンプトについて

パスキー登録時に「Mac のログインパスワード」や「iCloud Keychain の復旧用コード」を求められることがあります。これらは **WebAuthn 仕様ではなく OS / Apple エコシステム側の仕組み** で、本デモのコードは一切関与していません。

- **Mac ログインパスワード入力**: Touch ID が使えない場合のフォールバック、および新規 credential を Keychain に書き込む操作の権限確認
- **iCloud Keychain 復旧コード（28 文字）**: すべての端末を失ったときに Apple サーバーから同期データ（同期パスキー含む）を取り戻すための最後の砦。iCloud Keychain 初期設定時に一度だけ生成される

### RP（Relying Party）として押さえるべきポイント

- **サーバー発行の challenge を必ず検証する**: 一度使ったら破棄、TTL は短く。本デモは 5 分で cookie 保存だが、本番はサーバー側セッション KV が望ましい
- **Origin / RP ID の照合を厳密に**: 開発は `localhost`、本番は HTTPS + 実ドメイン必須
- **counter を毎回更新し、単調増加をチェック**: 戻った値はクローン警告
- **同期パスキーの脅威モデル**: iCloud / Google アカウントが侵害されると、そこに同期されたパスキー群にも影響しうる。重要アカウントには Device-bound パスキー（物理キー）を併用する設計もある
- **復旧経路を先に決める**: 「最後のパスキーを失ったらどうするか」はプロダクト設計の核

## 本番デプロイで変更が必要な箇所

- `.env` に `RP_ID=yourdomain.com`, `ORIGIN=https://yourdomain.com`, `SESSION_SECRET=<long random>` を設定
- `better-sqlite3` はサーバーレスと相性が悪い。Vercel にデプロイするなら Vercel Marketplace の Neon Postgres 等へ差し替え
- `requireUserVerification: true` への引き上げ検討（本デモは学習優先で false）
- Cookie `secure: true` は `NODE_ENV === "production"` で自動的に入るが、HTTPS 前提

## 参考リンク

- [WebAuthn W3C Spec](https://w3c.github.io/webauthn/)
- [SimpleWebAuthn Docs](https://simplewebauthn.dev/)
- [passkeys.dev](https://passkeys.dev/) — パスキーの概念・実装ガイド
- [FIDO Alliance](https://fidoalliance.org/passkeys/) — 仕様策定元
