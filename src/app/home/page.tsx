"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { fetchCurrentUser, subscribeAuthState, signOut } from "@/lib/auth";
import { resolveGreeting } from "@/lib/greeting";
import { resolveNavigation } from "@/lib/navigation";
import {
  fetchNotifications,
  subscribeNotifications,
  markAsRead,
} from "@/lib/notifications";
import { sanitizeUrl } from "@/lib/sanitize";
import type {
  MonnUser,
  AppNotification,
  AuthStatus,
  NotificationType,
} from "@/lib/types";

// ── 通知タイプごとのスタイル定義 ─────────────────────────────────────────────
const TYPE_STYLES: Record<
  NotificationType,
  { border: string; badge: string; label: string }
> = {
  system:  { border: "border-l-zinc-400",  badge: "bg-zinc-100 text-zinc-600",   label: "システム"       },
  gates:   { border: "border-l-blue-400",  badge: "bg-blue-50 text-blue-600",    label: "gates"          },
  mention: { border: "border-l-amber-400", badge: "bg-amber-50 text-amber-600",  label: "メンション"     },
  update:  { border: "border-l-green-400", badge: "bg-green-50 text-green-600",  label: "アップデート"   },
};

/** ISO 8601 → 日本語の相対時刻表記 */
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return new Date(iso).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

// ── サブコンポーネント ────────────────────────────────────────────────────────

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      fill="currentColor"
      viewBox="0 0 16 16"
      className={className}
    >
      <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6" />
    </svg>
  );
}

function NotificationCard({
  notification,
  onMarkAsRead,
}: {
  notification: AppNotification;
  onMarkAsRead: (id: string) => void;
}) {
  const styles = TYPE_STYLES[notification.type];

  return (
    <div
      className={`
        bg-white rounded-xl border-l-4 ${styles.border}
        shadow-sm px-5 py-4 flex gap-4
        ${notification.isRead ? "opacity-60" : ""}
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles.badge}`}
          >
            {styles.label}
          </span>
          <span className="text-xs text-zinc-400">
            {formatRelativeTime(notification.createdAt)}
          </span>
          {!notification.isRead && (
            <span className="w-2 h-2 rounded-full bg-blue-500 ml-auto shrink-0" />
          )}
        </div>

        <p className="text-sm font-semibold text-zinc-800 truncate">
          {notification.title}
        </p>
        <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">
          {notification.body}
        </p>

        {notification.href && (
          <Link
            href={sanitizeUrl(notification.href ?? "#")}
            className="mt-2 inline-block text-xs text-blue-600 hover:underline"
          >
            詳細を見る →
          </Link>
        )}
      </div>

      {!notification.isRead && (
        <button
          onClick={() => onMarkAsRead(notification.id)}
          className="shrink-0 self-start text-xs text-zinc-400 hover:text-zinc-700 transition-colors mt-1"
        >
          既読
        </button>
      )}
    </div>
  );
}

// ── メインページ ──────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();

  const [user, setUser] = useState<MonnUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifStatus, setNotifStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [greeting, setGreeting] = useState(resolveGreeting(new Date()));
  const userMenuRef = useRef <HTMLDivElement>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const logout = async(): Promise<void> =>{
    await signOut();
    router.replace("/");
  };

  useEffect(() =>{
    const handleClickOutSide = (e: MouseEvent) =>{
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen){
      document.addEventListener('mousedown', handleClickOutSide);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutSide);
    }
  }, [isUserMenuOpen]);
  // 挨拶を毎分更新（日付が変わっても正しい時間帯を表示するため）
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

  // 未ログインならトップへリダイレクト
  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/");
  }, [authStatus, router]);

  // 通知の初回取得 + リアルタイム購読
  useEffect(() => {
    if (!user) return;

    setNotifStatus("loading");
    fetchNotifications(user.id, { limit: 30 })
      .then((items) => {
        setNotifications(items);
        setNotifStatus("idle");
      })
      .catch(() => setNotifStatus("error"));

    const { unsubscribe } = subscribeNotifications(user.id, (newItem) => {
      setNotifications((prev) => [newItem, ...prev]);
    });

    // user.id が変わった（アカウント切り替え）時のみ再購読する
    return () => unsubscribe();
  }, [user?.id]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const navigation = resolveNavigation(user);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ── ローディング ─────────────────────────────────────────────────────────
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <span className="text-zinc-400 text-sm animate-pulse">読み込み中...</span>
      </div>
    );
  }

  // redirect 実行中は何も表示しない
  if (authStatus === "unauthenticated") return null;

  // ── メイン描画 ────────────────────────────────────────────────────────────
  return (
    <>
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* ロゴ */}
          <Link href="/" className="text-xl font-bold tracking-tight text-zinc-900">
            Monn
          </Link>

          {/* ナビゲーション */}
          <nav className="flex items-center gap-6">
            {navigation.primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* ベル + ユーザーアバター */}
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors">
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <div onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} ref={userMenuRef} className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-600 select-none">
              {user?.displayName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "?"}
              {isUserMenuOpen && (
                <div className="absolute p-4 mt-30 w-56 bg-white rounded-lg shadow-lg border border-zinc-200">
                  <button className="block w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-zinc-100 transition-colors rounded-full">
                    {user?.displayName ?? user?.email}
                  </button>
                  <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-zinc-100 transition-colors rounded-full">
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="min-h-screen bg-zinc-100 pt-20 pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-10">

          {/* 挨拶セクション */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold text-zinc-900">{greeting.message}</h1>
            <p className="mt-1 text-zinc-500 text-sm">
              {user?.displayName ?? user?.email} さん
            </p>
          </motion.section>

          {/* 通知セクション */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-800">通知</h2>
              {unreadCount > 0 && (
                <span className="text-sm text-zinc-500">未読 {unreadCount} 件</span>
              )}
            </div>

            {notifStatus === "loading" ? (
              <div className="text-center py-16 text-zinc-400 text-sm animate-pulse">
                読み込み中...
              </div>
            ) : notifStatus === "error" ? (
              <div className="text-center py-16 text-red-400 text-sm">
                通知の取得に失敗しました。
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-16 text-zinc-400 text-sm">
                新しい通知はありません。
              </div>
            ) : (
              <AnimatePresence initial={false}>
                <ul className="space-y-3">
                  {notifications.map((notif) => (
                    <motion.li
                      key={notif.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <NotificationCard
                        notification={notif}
                        onMarkAsRead={handleMarkAsRead}
                      />
                    </motion.li>
                  ))}
                </ul>
              </AnimatePresence>
            )}
          </section>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-zinc-200 py-6 px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-1">
          <p className="text-xs text-zinc-400">
            Copyright © 2026 Monn. All rights reserved.
          </p>
          <a
            href="https://x.com/monn_dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Follow me on X
          </a>
        </div>
      </footer>
    </>
  );
}
