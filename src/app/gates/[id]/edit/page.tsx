"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { fetchCurrentUser, subscribeAuthState } from "@/lib/auth";
import { fetchProject, updateProject, deleteProject } from "@/lib/gates";
import ProjectForm, { type ProjectFormValues } from "@/app/gates/_components/ProjectForm";
import type { MonnUser, AuthStatus, Project } from "@/lib/types";

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [user, setUser] = useState<MonnUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [project, setProject] = useState<Project | null>(null);
  const [projectStatus, setProjectStatus] = useState<"loading" | "idle" | "notfound">("loading");

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

  // プロジェクト取得（初期値に使う）
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

  const handleSubmit = async (values: ProjectFormValues) => {
    await updateProject(id, {
      title: values.title,
      description: values.description,
      body: values.body || null,
      thumbnailUrl: values.thumbnailUrl || null,
      status: values.status,
      techStack: values.techStack,
      links: values.links,
    });
    router.push(`/gates/${id}`);
  };

  const handleDelete = async () => {
    await deleteProject(id);
    router.push("/gates");
  };

  // ── ローディング / 認証待ち ───────────────────────────────────────────────
  if (authStatus === "loading" || authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <span className="text-zinc-400 text-sm animate-pulse">読み込み中...</span>
      </div>
    );
  }

  if (projectStatus === "notfound" || (projectStatus === "idle" && !project)) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-500 text-sm">プロジェクトが見つかりませんでした。</p>
        <Link href="/gates" className="text-sm text-zinc-700 underline underline-offset-2">
          ← gates に戻る
        </Link>
      </div>
    );
  }

  if (projectStatus === "loading" || !project) {
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
            <Link
              href={`/gates/${id}`}
              className="hover:text-zinc-700 transition-colors truncate"
            >
              {project.title}
            </Link>
            <span>/</span>
            <span className="text-zinc-700">編集</span>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
            <h1 className="text-xl font-bold text-zinc-900 mb-6">
              プロジェクトを編集
            </h1>
            <ProjectForm
              initialValues={{
                title: project.title,
                description: project.description,
                body: project.body ?? "",
                thumbnailUrl: project.thumbnailUrl ?? "",
                status: project.status,
                techStack: project.techStack,
                links: project.links,
              }}
              submitLabel="保存する"
              onSubmit={handleSubmit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
