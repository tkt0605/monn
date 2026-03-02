import type { MonnUser, NavItem, ResolvedNavigation } from "@/lib/types";

/**
 * サイト全体のナビゲーション定義。
 * requiresAuth: true の項目はログイン済みの場合のみ表示される。
 */
export const NAV_CONFIG: NavItem[] = [
  { label: "Home",     href: "/home",     requiresAuth: false },
  { label: "gates",    href: "/gates",    requiresAuth: false },
  { label: "blog",     href: "/blog",     requiresAuth: true  },
  // { label: "Settings", href: "/settings", requiresAuth: true  },
];

/**
 * 認証状態に応じて表示すべきナビゲーションを解決する純粋関数。
 *
 * @param user       - 現在のユーザー（未ログインなら null）
 * @param navConfig  - ナビゲーション定義（省略時は NAV_CONFIG を使用）
 */
export function resolveNavigation(
  user: MonnUser | null,
  navConfig: NavItem[] = NAV_CONFIG
): ResolvedNavigation {
  const isAuthenticated = user !== null;

  const primary = navConfig.filter(
    (item) => !item.requiresAuth || isAuthenticated
  );

  const cta: NavItem[] = isAuthenticated
    ? [
        { label: "ホームへ",    href: "/home",     requiresAuth: true  },
        { label: "gates へ",   href: "/gates",    requiresAuth: true  },
      ]
    : [
        { label: "ログインする",  href: "/auth/login_signup?mode=login",  requiresAuth: false },
        { label: "新規登録する",  href: "/auth/login_signup?mode=signup", requiresAuth: false },
      ];

  return { primary, cta };
}
