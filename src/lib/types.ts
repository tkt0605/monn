// ── ユーザー ────────────────────────────────────────────────────────────────
/**
 * Supabase の User 型から必要フィールドだけを抽出した独自型。
 * 外部ライブラリへの直接依存を page 層から隔離する。
 */
export interface MonnUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string; // ISO 8601
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

// ── 認証エラー ────────────────────────────────────────────────────────────────
export interface AuthError {
  message: string;
}

/**
 * ログイン・新規登録の戻り値型。
 * - 成功（メール確認不要）: { user: MonnUser }
 * - 成功（メール確認あり）: { needsVerification: true }
 * - 失敗               : { error: AuthError }
 */
export type AuthResult =
  | { user: MonnUser }
  | { needsVerification: true }
  | { error: AuthError };

// ── 挨拶 ────────────────────────────────────────────────────────────────────
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface GreetingResult {
  timeOfDay: TimeOfDay;
  message: string;
}

// ── ナビゲーション ────────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  requiresAuth: boolean;
}

export interface ResolvedNavigation {
  /** ヘッダーに並べるリンク群 */
  primary: NavItem[];
  /** ヒーローセクションの行動誘導ボタン群 */
  cta: NavItem[];
}

// ── 通知 ────────────────────────────────────────────────────────────────────
export type NotificationType = "system" | "gates" | "mention" | "update" | "blog";

/**
 * DB の notifications テーブルの行と 1:1 対応。
 * snake_case → camelCase に正規化済み。
 */
export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  isRead: boolean;
  createdAt: string; // ISO 8601
}

export interface NotificationSubscription {
  unsubscribe: () => void;
}

// ── gates（プロジェクト） ──────────────────────────────────────────────────────
export type ProjectStatus = "active" | "wip" | "archived";

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  body: string | null;         // 詳細説明（Markdown 想定）
  thumbnailUrl: string | null;
  status: ProjectStatus;
  techStack: string[];
  links: ProjectLink[];
  createdAt: string;           // ISO 8601
  updatedAt: string;
}

/** 一覧表示用に body を省いた軽量型 */
export type ProjectSummary = Omit<Project, "body">;

export interface ProjectFilter {
  status?: ProjectStatus;
}

// ── blog ─────────────────────────────────────────────────────────────────────
export type BlogPostStatus = "draft" | "published";

export interface BlogPost {
  id: string;
  title: string;
  body: string;
  excerpt: string | null;  // 一覧カード用の短い要約
  icon: string;            // 絵文字アイコン（例: "📝"）
  tags: string[];
  status: BlogPostStatus;
  createdAt: string;       // ISO 8601
  updatedAt: string;
}

/** 一覧用に body を省いた軽量型 */
export type BlogPostSummary = Omit<BlogPost, "body">;

// ── ページ集約状態 ────────────────────────────────────────────────────────────
export interface IndexPageState {
  auth: {
    user: MonnUser | null;
    status: AuthStatus;
    error: string | null;
  };
  greeting: GreetingResult;
  navigation: ResolvedNavigation;
  notifications: {
    items: AppNotification[];
    unreadCount: number;
    status: "idle" | "loading" | "error";
  };
}
