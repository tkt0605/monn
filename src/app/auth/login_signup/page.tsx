"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { signInWithEmail, signUpWithEmail } from "@/lib/auth";

type Mode = "login" | "signup";

// ── エラーメッセージの日本語化 ────────────────────────────────────────────────
const ERROR_MAP: Record<string, string> = {
  "Invalid login credentials":                        "メールアドレスまたはパスワードが正しくありません。",
  "Email not confirmed":                              "メールアドレスが確認されていません。受信ボックスをご確認ください。",
  "User already registered":                          "このメールアドレスはすでに登録されています。",
  "Password should be at least 6 characters":         "パスワードは6文字以上で入力してください。",
  "Unable to validate email address: invalid format": "メールアドレスの形式が正しくありません。",
};

/** Supabase の "Email address X is invalid" を検出する正規表現 */
const EMAIL_INVALID_RE = /^Email address .+ is invalid$/i;

function localizeError(message: string): string {
  if (EMAIL_INVALID_RE.test(message)) {
    return "このメールアドレスは使用できません。別のメールアドレスをお試しください。";
  }
  return ERROR_MAP[message] ?? message;
}

// ── フォーム本体（useSearchParams を使うので Suspense 内に配置） ────────────────

function LoginSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrorMsg(null);
    setVerificationSent(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const result =
        mode === "login"
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password);

      if ("error" in result) {
        setErrorMsg(localizeError(result.error.message));
        return;
      }

      if ("needsVerification" in result) {
        setVerificationSent(true);
        return;
      }

      router.replace("/home");
    });
  };

  // ── メール確認待ち画面 ────────────────────────────────────────────────────
  if (verificationSent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            className="text-green-500"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-800">確認メールを送信しました</p>
          <p className="text-xs text-zinc-400 mt-1">
            {email} に届いたリンクをクリックして登録を完了してください。
          </p>
        </div>
        <button
          onClick={() => { setVerificationSent(false); setMode("login"); }}
          className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors underline underline-offset-2"
        >
          ログイン画面に戻る
        </button>
      </motion.div>
    );
  }

  // ── ログイン / 新規登録フォーム ───────────────────────────────────────────
  return (
    <>
      {/* タブ切り替え */}
      <div className="flex rounded-lg bg-zinc-100 p-1 mb-6">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`flex-1 text-sm py-1.5 rounded-md transition-all ${
              mode === m
                ? "bg-white text-zinc-900 font-medium shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {m === "login" ? "ログイン" : "新規登録"}
          </button>
        ))}
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-shadow"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            パスワード
            {mode === "signup" && (
              <span className="text-zinc-400 font-normal ml-1">（6文字以上）</span>
            )}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-shadow"
          />
        </div>

        {/* エラー表示 */}
        <AnimatePresence>
          {errorMsg && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg"
            >
              {errorMsg}
            </motion.p>
          )}
        </AnimatePresence>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending
            ? "処理中..."
            : mode === "login"
            ? "ログイン"
            : "アカウントを作成"}
        </button>
      </form>
    </>
  );
}

// ── ページ本体 ────────────────────────────────────────────────────────────────

export default function LoginSignupPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* ロゴ */}
        <Link
          href="/"
          className="block text-center text-2xl font-bold text-zinc-900 mb-8 hover:opacity-70 transition-opacity"
        >
          Monn
        </Link>

        {/* カード */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-8 py-8">
          <Suspense
            fallback={
              <div className="text-center py-8 text-zinc-400 text-sm animate-pulse">
                読み込み中...
              </div>
            }
          >
            <LoginSignupForm />
          </Suspense>
        </div>

        {/* トップへ戻る */}
        <p className="text-center text-xs text-zinc-400 mt-6">
          <Link href="/" className="hover:text-zinc-600 transition-colors">
            ← トップに戻る
          </Link>
        </p>
      </div>
    </div>
  );
}
