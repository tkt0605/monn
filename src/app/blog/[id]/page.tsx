"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

import { fetchCurrentUser, subscribeAuthState } from "@/lib/auth";
import { resolveNavigation } from "@/lib/navigation";
import { fetchBlogPost } from "@/lib/blog";
import type { MonnUser, AuthStatus, BlogPost, BlogPostStatus } from "@/lib/types";

const STATUS_CONFIG: Record<BlogPostStatus, { label: string; badge: string }> = {
  published: { label: "公開",   badge: "bg-green-50 text-green-600 border-green-100" },
  draft:     { label: "下書き", badge: "bg-zinc-50 text-zinc-500 border-zinc-200"   },
};

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [user, setUser] = useState<MonnUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [post, setPost] = useState<BlogPost | null>(null);
  const [postStatus, setPostStatus] = useState<"loading" | "idle" | "notfound">("loading");

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

  // 記事取得
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetchBlogPost(id).then((data) => {
      if (!data) { setPostStatus("notfound"); }
      else { setPost(data); setPostStatus("idle"); }
    });
  }, [authStatus, id]);

  const navigation = resolveNavigation(user);

  if (authStatus === "loading" || authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <span className="text-zinc-400 text-sm animate-pulse">読み込み中...</span>
      </div>
    );
  }

  if (postStatus === "notfound" || (postStatus === "idle" && !post)) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-500 text-sm">記事が見つかりませんでした。</p>
        <button onClick={() => router.push("/blog")} className="text-sm text-zinc-700 underline underline-offset-2">
          ← blog に戻る
        </button>
      </div>
    );
  }

  if (postStatus === "loading" || !post) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <span className="text-zinc-400 text-sm animate-pulse">読み込み中...</span>
      </div>
    );
  }

  const status = STATUS_CONFIG[post.status];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-zinc-900">Monn</Link>
          <nav className="hidden sm:flex items-center gap-6">
            {navigation.primary.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/home" className="text-sm px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors text-zinc-700">
            マイページ
          </Link>
        </div>
      </header>

      <main className="min-h-screen bg-zinc-50 pt-20 pb-20 px-6">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* パンくず */}
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Link href="/blog" className="hover:text-zinc-700 transition-colors">blog</Link>
            <span>/</span>
            <span className="text-zinc-700 truncate">{post.title}</span>
          </div>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
          >
            {/* アイコン */}
            <div className="w-full aspect-video bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center">
              <span className="text-8xl select-none">{post.icon}</span>
            </div>

            <div className="p-8 space-y-6">
              {/* ステータス + タイトル + 編集ボタン */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border mb-3 ${status.badge}`}>
                    {status.label}
                  </span>
                  <h1 className="text-2xl font-bold text-zinc-900">{post.title}</h1>
                  {post.excerpt && (
                    <p className="text-zinc-500 mt-1">{post.excerpt}</p>
                  )}
                </div>
                <Link
                  href={`/blog/${post.id}/edit`}
                  className="shrink-0 text-sm px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  編集
                </Link>
              </div>

              {/* 本文 */}
              <div className="border-t border-zinc-100 pt-6">
                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {post.body}
                </p>
              </div>

              {/* タグ */}
              {post.tags.length > 0 && (
                <div className="border-t border-zinc-100 pt-6 space-y-2">
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-zinc-100 text-zinc-700 text-sm rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 日付 */}
              <div className="border-t border-zinc-100 pt-4 flex justify-between text-xs text-zinc-400">
                <span>
                  {new Date(post.createdAt).toLocaleDateString("ja-JP", {
                    year: "numeric", month: "long", day: "numeric",
                  })} に投稿
                </span>
                {post.updatedAt !== post.createdAt && (
                  <span>
                    {new Date(post.updatedAt).toLocaleDateString("ja-JP", {
                      month: "short", day: "numeric",
                    })} 更新
                  </span>
                )}
              </div>
            </div>
          </motion.article>

          <Link href="/blog" className="inline-block text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
            ← blog に戻る
          </Link>
        </div>
      </main>

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
