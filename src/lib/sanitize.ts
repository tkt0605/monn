/**
 * 許可プロトコル以外の URL（javascript: など）を "#" に置換する。
 * <a href> や <Link href> に渡す前に必ず通すこと。
 *
 * @example
 * sanitizeUrl("https://example.com") // => "https://example.com"
 * sanitizeUrl("javascript:alert(1)") // => "#"
 * sanitizeUrl("/gates/123")          // => "/gates/123"（相対パスはそのまま）
 */
export function sanitizeUrl(url: string): string {
  if (!url) return "#";

  // 相対パス（/ または # で始まる）はそのまま許可
  if (url.startsWith("/") || url.startsWith("#")) return url;

  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return "#";
    return url;
  } catch {
    // URL パース失敗（不正な形式）
    return "#";
  }
}

/**
 * ユーザーに表示するエラーメッセージを汎用化する。
 * DB の内部エラーをそのまま露出しないための変換層。
 *
 * @param error - キャッチした Error オブジェクト
 * @param fallback - 表示するフォールバックメッセージ
 */
export function toUserMessage(
  error: unknown,
  fallback = "操作に失敗しました。もう一度お試しください。"
): string {
  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    return error.message; // 開発中は詳細を出す
  }
  return fallback;
}
