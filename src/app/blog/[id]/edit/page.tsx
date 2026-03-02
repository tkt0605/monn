"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { fetchCurrentUser, subscribeAuthState } from "@/lib/auth";
import { fetchBlogPost, updateBlogPost, deleteBlogPost } from "@/lib/blog";
import BlogPostForm, { type BlogPostFormValues } from "@/app/blog/_components/BlogPostForm";
import type { MonnUser, AuthStatus, BlogPost } from "@/lib/types";

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [user, setUser] = useState<MonnUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [post, setPost] = useState<BlogPost | null>(null);
  const [postStatus, setPostStatus] = useState<"loading" | "idle" | "notfound">("loading");

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

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetchBlogPost(id).then((data) => {
      if (!data) { setPostStatus("notfound"); }
      else { setPost(data); setPostStatus("idle"); }
    });
  }, [authStatus, id]);

  const handleSubmit = async (values: BlogPostFormValues) => {
    await updateBlogPost(id, {
      title: values.title,
      body: values.body,
      excerpt: values.excerpt || null,
      icon: values.icon || "📝",
      tags: values.tags,
      status: values.status,
    });
    router.push(`/blog/${id}`);
  };

  const handleDelete = async () => {
    await deleteBlogPost(id);
    router.push("/blog");
  };

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
        <Link href="/blog" className="text-sm text-zinc-700 underline underline-offset-2">← blog に戻る</Link>
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

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-zinc-900">Monn</Link>
          <span className="text-sm text-zinc-500">{user?.displayName ?? user?.email}</span>
        </div>
      </header>

      <main className="pt-20 pb-20 px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Link href="/blog" className="hover:text-zinc-700 transition-colors">blog</Link>
            <span>/</span>
            <Link href={`/blog/${id}`} className="hover:text-zinc-700 transition-colors truncate">{post.title}</Link>
            <span>/</span>
            <span className="text-zinc-700">編集</span>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
            <h1 className="text-xl font-bold text-zinc-900 mb-6">記事を編集</h1>
            <BlogPostForm
              initialValues={{
                title: post.title,
                excerpt: post.excerpt ?? "",
                body: post.body,
                icon: post.icon,
                tags: post.tags,
                status: post.status,
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
