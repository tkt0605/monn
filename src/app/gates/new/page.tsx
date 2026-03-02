"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { fetchCurrentUser, subscribeAuthState } from "@/lib/auth";
import { createProject } from "@/lib/gates";
import { createNotification } from "@/lib/notifications";
import ProjectForm, { type ProjectFormValues } from "@/app/gates/_components/ProjectForm";
import type { MonnUser, AuthStatus } from "@/lib/types";

export default function NewProjectPage() {
  const router = useRouter();
  const [user, setUser] = useState<MonnUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");

  // 認証状態（未ログインならリダイレクト）
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

  const handleSubmit = async (values: ProjectFormValues) => {
    const project = await createProject({
      title: values.title,
      description: values.description,
      body: values.body || null,
      thumbnailUrl: values.thumbnailUrl || null,
      status: values.status,
      techStack: values.techStack,
      links: values.links,
    });
    // /home の通知パネルに流す
    if (user) {
      await createNotification({
        userId: user.id,
        type: "gates",
        title: "新しいプロジェクトを追加しました",
        body: project.title,
        href: `/gates/${project.id}`,
      });
    }
    router.push(`/gates/${project.id}`);
  };

  // ── ローディング / 認証待ち ───────────────────────────────────────────────
  if (authStatus === "loading" || authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <span className="text-zinc-400 text-sm animate-pulse">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── ヘッダー ─────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-zinc-900">
            Monn
          </Link>
          <span className="text-sm text-zinc-500">
            {user?.displayName ?? user?.email}
          </span>
        </div>
      </header>

      {/* ── コンテンツ ───────────────────────────────────────────── */}
      <main className="pt-20 pb-20 px-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* パンくず */}
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Link href="/gates" className="hover:text-zinc-700 transition-colors">
              gates
            </Link>
            <span>/</span>
            <span className="text-zinc-700">新しいプロジェクト</span>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
            <h1 className="text-xl font-bold text-zinc-900 mb-6">
              プロジェクトを追加
            </h1>
            <ProjectForm submitLabel="作成する" onSubmit={handleSubmit} />
          </div>
        </div>
      </main>
    </div>
  );
}
