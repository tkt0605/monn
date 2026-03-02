import { createClient } from "@/lib/supabase";
import type {
  AppNotification,
  NotificationSubscription,
  NotificationType,
} from "@/lib/types";

/** DB の snake_case 行を AppNotification（camelCase）に変換する内部ヘルパー */
function rowToNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as NotificationType,
    title: row.title as string,
    body: row.body as string,
    href: (row.href as string) ?? null,
    isRead: row.is_read as boolean,
    createdAt: row.created_at as string,
  };
}

/**
 * 通知一覧を初回取得する。
 * テーブルが未作成など DB エラーの場合は空配列を返す（ページをクラッシュさせない）。
 */
export async function fetchNotifications(
  userId: string,
  options?: { limit?: number; onlyUnread?: boolean }
): Promise<AppNotification[]> {
  const supabase = createClient();

  let query = supabase
    .from("notifications")
    .select("*")
    // .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (options?.onlyUnread) query = query.eq("is_read", false);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;

  if (error) {
    console.warn("[notifications] fetchNotifications:", error.message);
    return [];
  }

  return (data ?? []).map(rowToNotification);
}

/**
 * Supabase Realtime で該当ユーザーの新着通知を購読する。
 *
 * 戻り値の unsubscribe を useEffect の return で必ず呼ぶこと（メモリリーク防止）。
 *
 * @example
 * useEffect(() => {
 *   if (!user) return;
 *   const { unsubscribe } = subscribeNotifications(user.id, (n) => {
 *     setNotifications((prev) => [n, ...prev]);
 *   });
 *   return () => unsubscribe();
 * }, [user?.id]);
 */
export function subscribeNotifications(
  userId: string,
  callback: (notification: AppNotification) => void
): NotificationSubscription {
  const supabase = createClient();

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) =>
        callback(rowToNotification(payload.new as Record<string, unknown>))
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * 通知を1件作成する。
 * gates や blog での投稿時にクライアント側から呼ぶ。
 */
export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    is_read: false,
  });
  if (error) console.warn("[notifications] createNotification:", error.message);
}

/**
 * 指定した通知を既読にする。
 * DB 更新のみ行い、UI の state 更新は呼び出し元が担う。
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw new Error(error.message);
}
