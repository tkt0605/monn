"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

import { fetchCurrentUser, subscribeAuthState } from "@/lib/auth";
import { resolveNavigation } from "@/lib/navigation";
import { fetchProject } from "@/lib/gates";
import { sanitizeUrl } from "@/lib/sanitize";
import type { MonnUser, AuthStatus, Project, ProjectStatus } from "@/lib/types";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; badge: string }> = {
  active:   { label: "公開中",     badge: "bg-green-50 text-green-600 border-green-100" },
  wip:      { label: "開発中",     badge: "bg-amber-50 text-amber-600 border-amber-100" },
  archived: { label: "アーカイブ", badge: "bg-zinc-50 text-zinc-500 border-zinc-200"   },
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [user, setUser] = useState<MonnUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [project, setProject] = useState<Project | null>(null);
  const [projectStatus, setProjectStatus] = useState<"loading" | "idle" | "notfound">("loading");

  // 認証状態
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

  // プロジェクト取得
  useEffect(() => {
    fetchProject(id).then((data) => {
      if (!data) {
        setProjectStatus("notfound");
      } else {
        setProject(data);
        setProjectStatus("idle");
      }
    });
  }, [id]);

  const navigation = resolveNavigation(user);
  const isOwner = authStatus === "authenticated";

  // ── ローディング / 404 ────────────────────────────────────────────────────
  if (projectStatus === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <span className="text-zinc-400 text-sm animate-pulse">読み込み中...</span>
      </div>
    );
  }

  if (projectStatus === "notfound" || !project) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-500 text-sm">プロジェクトが見つかりませんでした。</p>
        <button
          onClick={() => router.push("/gates")}
          className="text-sm text-zinc-700 underline underline-offset-2 hover:text-zinc-900 transition-colors"
        >
          ← gates に戻る
        </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[project.status];

  return (
    <>
      {/* ── ヘッダー ─────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-zinc-900">
            Monn
          </Link>
          <nav className="hidden sm:flex items-center gap-6">
            {navigation.primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href={isOwner ? "/home" : "/auth/login_signup"}
            className="text-sm px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors text-zinc-700"
          >
            {isOwner ? "マイページ" : "ログイン"}
          </Link>
        </div>
      </header>

      {/* ── メイン ───────────────────────────────────────────────── */}
      <main className="min-h-screen bg-zinc-50 pt-20 pb-20 px-6">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* パンくず */}
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Link href="/gates" className="hover:text-zinc-700 transition-colors">
              gates
            </Link>
            <span>/</span>
            <span className="text-zinc-700 truncate">{project.title}</span>
          </div>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
          >
            {/* サムネイル */}
            {project.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.thumbnailUrl}
                alt={project.title}
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="w-full aspect-video bg-gradient-to-br from-zinc-200 to-zinc-100 flex items-center justify-center">
                <span className="text-6xl font-bold text-zinc-300">
                  {project.title[0]?.toUpperCase()}
                </span>
              </div>
            )}

            {/* コンテンツ */}
            <div className="p-8 space-y-6">
              {/* ステータス + タイトル + 編集ボタン */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span
                    className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border mb-3 ${status.badge}`}
                  >
                    {status.label}
                  </span>
                  <h1 className="text-2xl font-bold text-zinc-900">{project.title}</h1>
                  <p className="text-zinc-500 mt-1">{project.description}</p>
                </div>
                {isOwner && (
                  <Link
                    href={`/gates/${project.id}/edit`}
                    className="shrink-0 text-sm px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    編集
                  </Link>
                )}
              </div>

              {/* 詳細説明 */}
              {project.body && (
                <div className="border-t border-zinc-100 pt-6">
                  <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                    {project.body}
                  </p>
                </div>
              )}

              {/* 技術スタック */}
              {project.techStack.length > 0 && (
                <div className="border-t border-zinc-100 pt-6 space-y-2">
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Tech Stack
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {project.techStack.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-zinc-100 text-zinc-700 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* リンク */}
              {project.links.length > 0 && (
                <div className="border-t border-zinc-100 pt-6 space-y-2">
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Links
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {project.links.map((link) => (
                      <a
                        key={link.url}
                        href={sanitizeUrl(link.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 border border-zinc-200 text-sm text-zinc-700 rounded-lg hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
                      >
                        {link.label} ↗
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 日付 */}
              <div className="border-t border-zinc-100 pt-4 text-xs text-zinc-400">
                {new Date(project.createdAt).toLocaleDateString("ja-JP", {
                  year: "numeric", month: "long", day: "numeric",
                })} に公開
              </div>
            </div>
          </motion.article>

          {/* gates へ戻る */}
          <Link
            href="/gates"
            className="inline-block text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            ← gates に戻る
          </Link>
        </div>
      </main>

      {/* ── フッター ─────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-zinc-100 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-sm font-bold text-zinc-300 select-none">Monn</span>
          <p className="text-xs text-zinc-400">Copyright © 2026 Monn. All rights reserved.</p>
          <a
            href="https://x.com/monn_dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Follow on X
          </a>
        </div>
      </footer>
    </>
  );
}
