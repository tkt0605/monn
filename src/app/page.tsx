"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { fetchCurrentUser, subscribeAuthState } from "@/lib/auth";
import { resolveGreeting } from "@/lib/greeting";
import { resolveNavigation } from "@/lib/navigation";
import type { MonnUser, AuthStatus } from "@/lib/types";

// ── アニメーション定義 ────────────────────────────────────────────────────────
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

// ── アイコン ────────────────────────────────────────────────────────────────

function PersonCheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m1.679-4.493-1.335 2.226a.75.75 0 0 1-1.174.144l-.774-.773a.5.5 0 0 1 .708-.708l.547.548 1.17-1.951a.5.5 0 1 1 .858.514M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
      <path d="M2 13c0 1 1 1 1 1h5.256A4.5 4.5 0 0 1 8 12.5a4.5 4.5 0 0 1 1.544-3.393Q8.844 9.002 8 9c-5 0-6 3-6 4" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
    </svg>
  );
}

// ── メインページ ──────────────────────────────────────────────────────────────

export default function IndexPage() {
  const [user, setUser] = useState<MonnUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [greeting, setGreeting] = useState(resolveGreeting(new Date()));

  // 挨拶を毎分更新
  useEffect(() => {
    const timer = setInterval(
      () => setGreeting(resolveGreeting(new Date())),
      60_000
    );
    return () => clearInterval(timer);
  }, []);

  // 認証状態の取得と購読
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

  const navigation = resolveNavigation(user);

  const welcomeName =
    authStatus === "authenticated"
      ? (user?.displayName ?? user?.email ?? "")
      : "ゲスト";

  return (
    <>
      {/* ── ヘッダー ─────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* ロゴ */}
          <span className="text-lg font-bold tracking-tight text-zinc-900 select-none">
            Monn
          </span>

          {/* ナビゲーション */}
          {/* <nav className="hidden sm:flex items-center gap-6">
            {navigation.primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav> */}

          {/* 認証ボタン */}
          <Link
            href={authStatus === "authenticated" ? "/home" : "/auth/login_signup"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
          >
            {authStatus === "authenticated" ? (
              <>
                <PersonCheckIcon />
                <span>マイページ</span>
              </>
            ) : (
              <>
                <PersonIcon />
                <span>ログイン</span>
              </>
            )}
          </Link>
        </div>
      </header>

      {/* ── ヒーロー ─────────────────────────────────────────────── */}
      <main className="bg-white">
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-28 text-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-xl w-full flex flex-col items-center gap-8"
          >
            {/* バッジ */}
            <motion.div variants={fadeUp}>
              <span className="inline-block text-[11px] font-semibold tracking-[0.2em] text-zinc-400 uppercase border border-zinc-200 rounded-full px-3 py-1">
                Personal Portfolio &amp; Blog
              </span>
            </motion.div>

            {/* 挨拶 + ウェルカム */}
            <motion.div variants={fadeUp} className="space-y-3">
              <h1 className="text-5xl sm:text-6xl font-bold text-zinc-900 tracking-tight leading-[1.10]">
                {greeting.message}
              </h1>
              <p
                className={`text-xl text-zinc-400 font-light transition-opacity duration-300 ${
                  authStatus === "loading" ? "opacity-0" : "opacity-100"
                }`}
              >
                {welcomeName} さん
              </p>
            </motion.div>

            {/* 説明文 */}
            <motion.p
              variants={fadeUp}
              className="text-sm text-zinc-500 leading-relaxed max-w-xs"
            >
              ここは、僕の開発したアプリの紹介ページ兼ブログです。
              <br />
              趣味で作成したものですので暖かい目で受け入れてください。
            </motion.p>

            {/* CTA ボタン */}
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap gap-3 justify-center"
            >
              {navigation.cta.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    i === 0
                      ? "px-7 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors shadow-sm"
                      : "px-7 py-2.5 rounded-full border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* ── フッター ─────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-zinc-100 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-sm font-bold text-zinc-300 select-none">Monn</span>
          <p className="text-xs text-zinc-400">
            Copyright © 2026 Monn. All rights reserved.
          </p>
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
