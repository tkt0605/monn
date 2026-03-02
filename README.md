# Monn

個人開発したアプリの紹介・ブログサイトです。趣味で作成したものですので暖かい目で受け入れてください。

## 概要

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16（App Router） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| アニメーション | Framer Motion |
| バックエンド | Supabase（認証 / DB / Realtime） |

## ページ構成

```
/                      ランディングページ（公開）
/gates                 作ったアプリの紹介一覧（公開）
/gates/[id]            アプリ詳細（公開）
/gates/new             アプリ追加（認証必須）
/gates/[id]/edit       アプリ編集・削除（認証必須）
/home                  ダッシュボード・通知（認証必須）
/blog                  ブログ一覧（認証必須）
/blog/[id]             ブログ詳細（認証必須）
/blog/new              記事投稿（認証必須）
/blog/[id]/edit        記事編集・削除（認証必須）
/auth/login_signup     ログイン / 新規登録
/settings              設定（認証必須・未実装）
```

## ライブラリ構成（`src/lib/`）

```
auth.ts            認証（セッション取得・購読・ログイン・登録・ログアウト）
navigation.ts      ナビゲーション（認証状態によるリンクのフィルタリング）
greeting.ts        時刻に応じた挨拶メッセージの生成
notifications.ts   通知（Realtime 購読・作成・既読更新）
gates.ts           プロジェクト CRUD
blog.ts            ブログ記事 CRUD
types.ts           全共有型定義
supabase.ts        Supabase クライアント生成
```

## Supabase テーブル

### `projects`（gates）

```sql
create table projects (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text not null,
  body          text,
  thumbnail_url text,
  status        text not null default 'wip',  -- wip | active | archived
  tech_stack    text[] not null default '{}',
  links         jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table projects enable row level security;
create policy "public read"  on projects for select using (true);
create policy "owner write"  on projects for all    using (auth.role() = 'authenticated');
```

### `blog_posts`（blog）

```sql
create table blog_posts (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null default '',
  excerpt    text,
  icon       text not null default '📝',
  tags       text[] not null default '{}',
  status     text not null default 'draft',  -- draft | published
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table blog_posts enable row level security;
create policy "auth only" on blog_posts for all using (auth.role() = 'authenticated');
```

### `notifications`

```sql
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  type       text not null,  -- system | gates | mention | update
  title      text not null,
  body       text not null,
  href       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;
create policy "owner only" on notifications for all using (auth.uid() = user_id);
```

## 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアクセスできます。

## 環境変数

`.env` に以下を設定してください。

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## ライセンス

個人プロジェクトのため、ライセンスは特に設けていません。
