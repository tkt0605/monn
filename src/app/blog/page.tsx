"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

import { fetchCurrentUser, subscribeAuthState } from "@/lib/auth";
import { resolveNavigation } from "@/lib/navigation";
import { fetchBlogPosts } from "@/lib/blog";
import type {
  MonnUser,
  AuthStatus,
  BlogPostSummary,
  BlogPostStatus,
} from "@/lib/types";

// ── ステータス定義 ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<BlogPostStatus, { label: string; badge: string }> = {
  published: { label: "公開",   badge: "bg-green-50 text-green-600 border-green-100" },
  draft:     { label: "下書き", badge: "bg-zinc-50 text-zinc-500 border-zinc-200"   },
};

const FILTER_TABS: { label: string; value: BlogPostStatus | undefined }[] = [
  { label: "すべて", value: undefined     },
  { label: "公開",   value: "published"   },
  { label: "下書き", value: "draft"       },
];

// ── サブコンポーネント ────────────────────────────────────────────────────────

function BlogCard({ post }: { post: BlogPostSummary }) {
  const status = STATUS_CONFIG[post.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
    >
      {/* アイコン */}
      <Link href={`/blog/${post.id}`} className="block aspect-video bg-gradient-to-br from-zinc-100 to-zinc-50 overflow-hidden flex items-center justify-center">
        <span className="text-7xl select-none">{post.icon}</span>
      </Link>

      {/* コンテンツ */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border mb-2 ${status.badge}`}>
            {status.label}
          </span>
          <Link href={`/blog/${post.id}`}>
            <h2 className="text-base font-bold text-zinc-900 hover:text-zinc-600 transition-colors line-clamp-2">
              {post.title}
            </h2>
          </Link>
          {post.excerpt && (
            <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{post.excerpt}</p>
          )}
        </div>

        {/* タグ */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[11px] px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">
                {tag}
              </span>
            ))}
            {post.tags.length > 4 && (
              <span className="text-[11px] px-2 py-0.5 bg-zinc-100 text-zinc-400 rounded-full">
                +{post.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* 日付 + 編集 */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-xs text-zinc-400">
            {new Date(post.createdAt).toLocaleDateString("ja-JP", {
              year: "numeric", month: "short", day: "numeric",
            })}
          </span>
          <Link href={`/blog/${post.id}/edit`} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
            編集
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── メインページ ──────────────────────────────────────────────────────────────

export default function BlogPage() {
  const router = useRouter();
  const [user, setUser] = useState<MonnUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [postsStatus, setPostsStatus] = useState<"loading" | "idle" | "error">("loading");
  const [filter, setFilter] = useState<BlogPostStatus | undefined>(undefined);

  // 認証（必須）
  useEffect(() => {
    fetchCurrentUser().then((u) => {
      setUser(u);
      setAuthStatus(u ? "authenticated" : "unauthenticated");
    });
    const { unsubscribe } = subscribeAuthState((u) => {
      setUser(u);
      setAuthStatus(u ? "authenticated" : "unauthenticated");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/auth/login_signup");
  }, [authStatus, router]);

  // 記事一覧取得
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    setPostsStatus("loading");
    fetchBlogPosts(filter ? { status: filter } : undefined)
      .then((items) => { setPosts(items); setPostsStatus("idle"); })
      .catch(() => setPostsStatus("error"));
  }, [authStatus, filter]);

  const navigation = resolveNavigation(user);

  if (authStatus === "loading" || authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <span className="text-zinc-400 text-sm animate-pulse">読み込み中...</span>
      </div>
    );
  }

  return (
    <>
      {/* ── ヘッダー ─────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-zinc-900">Monn</Link>
          <nav className="hidden sm:flex items-center gap-6">
            {navigation.primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${
                  item.href === "/blog"
                    ? "text-zinc-900 font-medium"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/home" className="text-sm px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors text-zinc-700">
            マイページ
          </Link>
        </div>
      </header>

      {/* ── メイン ───────────────────────────────────────────────── */}
      <main className="min-h-screen bg-zinc-50 pt-20 pb-20 px-6">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* タイトル */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">blog</h1>
              <p className="text-sm text-zinc-400 mt-1">
                {user?.displayName ?? user?.email} の記事
              </p>
            </div>
            <Link
              href="/blog/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              新規投稿
            </Link>
          </div>

          {/* フィルタータブ */}
          <div className="flex gap-1 bg-white border border-zinc-200 rounded-xl p-1 w-fit">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
                  filter === tab.value
                    ? "bg-zinc-900 text-white font-medium shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* コンテンツ */}
          {postsStatus === "loading" ? (
            <div className="text-center py-24 text-zinc-400 text-sm animate-pulse">読み込み中...</div>
          ) : postsStatus === "error" ? (
            <div className="text-center py-24 text-red-400 text-sm">読み込みに失敗しました。</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-24 text-zinc-400 text-sm space-y-3">
              <p>記事がまだありません。</p>
              <Link href="/blog/new" className="inline-block text-zinc-700 underline underline-offset-2 hover:text-zinc-900 transition-colors">
                最初の記事を書く →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map((post) => <BlogCard key={post.id} post={post} />)}
            </div>
          )}
        </div>
      </main>

      {/* ── フッター ─────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-zinc-100 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-sm font-bold text-zinc-300 select-none">Monn</span>
          <p className="text-xs text-zinc-400">Copyright © 2026 Monn. All rights reserved.</p>
          <a href="https://x.com/monn_dev" target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            Follow on X
          </a>
        </div>
      </footer>
    </>
  );
}
