"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { fetchCurrentUser, subscribeAuthState } from "@/lib/auth";
import { resolveNavigation } from "@/lib/navigation";
import { fetchProjects } from "@/lib/gates";
import type {
  MonnUser,
  AuthStatus,
  ProjectSummary,
  ProjectStatus,
  ProjectFilter,
} from "@/lib/types";

// ── ステータス定義 ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; badge: string }
> = {
  active:   { label: "公開中",     badge: "bg-green-50 text-green-600 border-green-100" },
  wip:      { label: "開発中",     badge: "bg-amber-50 text-amber-600 border-amber-100" },
  archived: { label: "アーカイブ", badge: "bg-zinc-50 text-zinc-500 border-zinc-200"   },
};

const FILTER_TABS: { label: string; value: ProjectStatus | undefined }[] = [
  { label: "すべて",     value: undefined   },
  { label: "公開中",     value: "active"    },
  { label: "開発中",     value: "wip"       },
  { label: "アーカイブ", value: "archived"  },
];

// ── サブコンポーネント ────────────────────────────────────────────────────────

function ProjectCard({
  project,
  isOwner,
}: {
  project: ProjectSummary;
  isOwner: boolean;
}) {
  const status = STATUS_CONFIG[project.status];
  const initial = project.title[0]?.toUpperCase() ?? "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
    >
      {/* サムネイル */}
      <Link href={`/gates/${project.id}`} className="block aspect-video bg-zinc-100 relative overflow-hidden">
        {project.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.thumbnailUrl}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-100">
            <span className="text-4xl font-bold text-zinc-300">{initial}</span>
          </div>
        )}
      </Link>

      {/* コンテンツ */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* ステータス + タイトル */}
        <div>
          <span
            className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border mb-2 ${status.badge}`}
          >
            {status.label}
          </span>
          <Link href={`/gates/${project.id}`}>
            <h2 className="text-base font-bold text-zinc-900 hover:text-zinc-600 transition-colors line-clamp-1">
              {project.title}
            </h2>
          </Link>
          <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">
            {project.description}
          </p>
        </div>

        {/* 技術スタック */}
        {project.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.techStack.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full"
              >
                {tag}
              </span>
            ))}
            {project.techStack.length > 4 && (
              <span className="text-[11px] px-2 py-0.5 bg-zinc-100 text-zinc-400 rounded-full">
                +{project.techStack.length - 4}
              </span>
            )}
          </div>
        )}

        {/* リンク + 編集ボタン */}
        <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
          {project.links.slice(0, 3).map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 border border-zinc-200 px-2.5 py-1 rounded-full hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {link.label} ↗
            </a>
          ))}
          {isOwner && (
            <Link
              href={`/gates/${project.id}/edit`}
              className="ml-auto text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              編集
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── メインページ ──────────────────────────────────────────────────────────────

export default function GatesPage() {
  const [user, setUser] = useState<MonnUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectStatus, setProjectStatus] = useState<"loading" | "idle" | "error">("loading");
  const [filter, setFilter] = useState<ProjectFilter>({});

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

  // プロジェクト一覧取得
  useEffect(() => {
    setProjectStatus("loading");
    fetchProjects(filter)
      .then((items) => {
        setProjects(items);
        setProjectStatus("idle");
      })
      .catch(() => setProjectStatus("error"));
  }, [filter]);

  const navigation = resolveNavigation(user);
  const isOwner = authStatus === "authenticated";

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
                className={`text-sm transition-colors ${
                  item.href === "/gates"
                    ? "text-zinc-900 font-medium"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
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
        <div className="max-w-5xl mx-auto space-y-8">

          {/* タイトル */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">gates</h1>
              <p className="text-sm text-zinc-400 mt-1">これまでに作ったアプリたち</p>
            </div>
            {isOwner && (
              <Link
                href="/gates/new"
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
              >
                <span className="text-lg leading-none">+</span>
                追加
              </Link>
            )}
          </div>

          {/* フィルタータブ */}
          <div className="flex gap-1 bg-white border border-zinc-200 rounded-xl p-1 w-fit">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setFilter(tab.value ? { status: tab.value } : {})}
                className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
                  filter.status === tab.value
                    ? "bg-zinc-900 text-white font-medium shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* コンテンツ */}
          {projectStatus === "loading" ? (
            <div className="text-center py-24 text-zinc-400 text-sm animate-pulse">
              読み込み中...
            </div>
          ) : projectStatus === "error" ? (
            <div className="text-center py-24 text-red-400 text-sm">
              読み込みに失敗しました。
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-24 text-zinc-400 text-sm space-y-3">
              <p>プロジェクトがまだありません。</p>
              {isOwner && (
                <Link
                  href="/gates/new"
                  className="inline-block text-zinc-700 underline underline-offset-2 hover:text-zinc-900 transition-colors"
                >
                  最初のプロジェクトを追加する →
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} isOwner={isOwner} />
              ))}
            </div>
          )}
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
