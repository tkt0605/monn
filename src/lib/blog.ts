import { createClient } from "@/lib/supabase";
import { toUserMessage } from "@/lib/sanitize";
import type { BlogPost, BlogPostSummary, BlogPostStatus } from "@/lib/types";

// ── 内部ヘルパー ──────────────────────────────────────────────────────────────

function rowToPost(row: Record<string, unknown>): BlogPost {
  return {
    id: row.id as string,
    title: row.title as string,
    body: (row.body as string) ?? "",
    excerpt: (row.excerpt as string) ?? null,
    icon: (row.icon as string) || "📝",
    tags: (row.tags as string[]) ?? [],
    status: row.status as BlogPostStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToSummary(row: Record<string, unknown>): BlogPostSummary {
  const post = rowToPost(row);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { body: _body, ...summary } = post;
  return summary;
}

// ── 読み取り系（認証必須・RLS で制御） ───────────────────────────────────────

/**
 * ブログ記事の一覧を取得する。
 * status / tag によるフィルタリングが可能。
 */
export async function fetchBlogPosts(filter?: {
  status?: BlogPostStatus;
  tag?: string;
}): Promise<BlogPostSummary[]> {
  const supabase = createClient();

  let query = supabase
    .from("blog_posts")
    .select(
      "id, title, excerpt, icon, tags, status, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.tag)    query = query.contains("tags", [filter.tag]);

  const { data, error } = await query;
  if (error) {
    console.warn("[blog] fetchBlogPosts:", error.message);
    return [];
  }
  return (data ?? []).map(rowToSummary);
}

/**
 * ブログ記事を1件取得する（詳細ページ用）。
 * 存在しない場合は null を返す。
 */
export async function fetchBlogPost(id: string): Promise<BlogPost | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.warn("[blog] fetchBlogPost:", error.message);
    return null;
  }
  return data ? rowToPost(data as Record<string, unknown>) : null;
}

// ── 書き込み系（認証必須・RLS で制御） ───────────────────────────────────────

/** ブログ記事を新規作成する。 */
export async function createBlogPost(
  input: Omit<BlogPost, "id" | "createdAt" | "updatedAt">
): Promise<BlogPost> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title: input.title,
      body: input.body,
      excerpt: input.excerpt,
      icon: input.icon,
      tags: input.tags,
      status: input.status,
    })
    .select()
    .single();

  if (error) throw new Error(toUserMessage(error, "記事の作成に失敗しました。"));
  return rowToPost(data as Record<string, unknown>);
}

/** ブログ記事を部分更新する。 */
export async function updateBlogPost(
  id: string,
  input: Partial<Omit<BlogPost, "id" | "createdAt" | "updatedAt">>
): Promise<BlogPost> {
  const supabase = createClient();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title   !== undefined) patch.title   = input.title;
  if (input.body    !== undefined) patch.body    = input.body;
  if (input.excerpt !== undefined) patch.excerpt = input.excerpt;
  if (input.icon    !== undefined) patch.icon    = input.icon;
  if (input.tags    !== undefined) patch.tags    = input.tags;
  if (input.status  !== undefined) patch.status  = input.status;

  const { data, error } = await supabase
    .from("blog_posts")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(toUserMessage(error, "記事の更新に失敗しました。"));
  return rowToPost(data as Record<string, unknown>);
}

/** ブログ記事を削除する。 */
export async function deleteBlogPost(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw new Error(toUserMessage(error, "記事の削除に失敗しました。"));
}
