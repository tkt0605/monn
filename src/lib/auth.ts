import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import type { MonnUser, AuthResult } from "@/lib/types";

/** Supabase の User を MonnUser に正規化する内部ヘルパー */
function mapToMonnUser(user: User): MonnUser {
  return {
    id: user.id,
    email: user.email!,
    displayName: (user.user_metadata?.display_name as string) ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
    createdAt: user.created_at,
  };
}

/**
 * 現在のセッションからユーザーを取得する。
 * getUser() はサーバーで JWT を検証するため getSession() より安全。
 * 未ログインの場合は null を返す。
 */
export async function fetchCurrentUser(): Promise<MonnUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? mapToMonnUser(user) : null;
}

/**
 * 認証状態の変化を購読する。
 * 戻り値の unsubscribe を useEffect の return で必ず呼ぶこと（メモリリーク防止）。
 *
 * @example
 * useEffect(() => {
 *   const { unsubscribe } = subscribeAuthState((user) => setUser(user));
 *   return () => unsubscribe();
 * }, []);
 */
export function subscribeAuthState(
  callback: (user: MonnUser | null) => void
): { unsubscribe: () => void } {
  const supabase = createClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? mapToMonnUser(session.user) : null);
  });
  return { unsubscribe: () => subscription.unsubscribe() };
}

// ── 書き込み系 ────────────────────────────────────────────────────────────────

/**
 * メールアドレス + パスワードでログインする。
 * Supabase のエラーメッセージをそのまま返すため、
 * 必要に応じてページ側で日本語に変換すること。
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: { message: error.message } };
  return { user: mapToMonnUser(data.user) };
}

/**
 * メールアドレス + パスワードで新規登録する。
 * Supabase でメール確認が有効な場合は needsVerification: true を返す。
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: { message: error.message } };
  if (!data.user) return { error: { message: "登録に失敗しました。" } };
  // session が null = メール確認待ち
  if (!data.session) return { needsVerification: true };
  return { user: mapToMonnUser(data.user) };
}

/** ログアウトする。 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}



