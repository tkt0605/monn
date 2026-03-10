import { createClient } from "@/lib/supabase";
import { toUserMessage } from "@/lib/sanitize";
import type {
  Project,
  ProjectSummary,
  ProjectFilter,
  ProjectLink,
  ProjectStatus,
} from "@/lib/types";

// ── 内部ヘルパー ──────────────────────────────────────────────────────────────

/**
 * jsonb カラムの links を安全に配列へ変換する。
 * - すでに配列 → そのまま使用
 * - JSON 文字列（過去に誤って stringify して保存したもの）→ parse
 * - null / undefined → 空配列
 */
function parseLinks(raw: unknown): ProjectLink[] {
  if (Array.isArray(raw)) return raw as ProjectLink[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as ProjectLink[]; } catch { return []; }
  }
  return [];
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    body: (row.body as string) ?? null,
    thumbnailUrl: (row.thumbnail_url as string) ?? null,
    status: row.status as ProjectStatus,
    techStack: (row.tech_stack as string[]) ?? [],
    links: parseLinks(row.links),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToSummary(row: Record<string, unknown>): ProjectSummary {
  const project = rowToProject(row);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { body: _body, ...summary } = project;
  return summary;
}

// ── 読み取り系（認証不要） ────────────────────────────────────────────────────

/**
 * プロジェクト一覧を取得する。body を含まない軽量型で返す。
 * DBエラー時は空配列を返す（ページをクラッシュさせない）。
 */
export async function fetchProjects(
  filter?: ProjectFilter
): Promise<ProjectSummary[]> {
  const supabase = createClient();

  let query = supabase
    .from("projects")
    .select(
      "id, title, description, thumbnail_url, status, tech_stack, links, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (filter?.status) query = query.eq("status", filter.status);

  const { data, error } = await query;
  if (error) {
    console.warn("[gates] fetchProjects:", error.message);
    return [];
  }
  return (data ?? []).map(rowToSummary);
}

/**
 * プロジェクトを1件取得する（詳細ページ用）。
 * 存在しない場合は null を返す。
 */
export async function fetchProject(id: string): Promise<Project | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.warn("[gates] fetchProject:", error.message);
    return null;
  }
  return data ? rowToProject(data as Record<string, unknown>) : null;
}

// ── 書き込み系（認証必須） ────────────────────────────────────────────────────

/**
 * プロジェクトを新規作成する。
 * Supabase の RLS により、未認証の場合はエラーになる。
 */
export async function createProject(
  input: Omit<Project, "id" | "createdAt" | "updatedAt">
): Promise<Project> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      title: input.title,
      description: input.description,
      body: input.body,
      thumbnail_url: input.thumbnailUrl,
      status: input.status,
      tech_stack: input.techStack,
      links: input.links,
    })
    .select()
    .single();

  if (error) throw new Error(toUserMessage(error, "プロジェクトの作成に失敗しました。"));
  return rowToProject(data as Record<string, unknown>);
}

/**
 * プロジェクトを更新する。
 * 指定したフィールドのみ上書きする（部分更新）。
 */
export async function updateProject(
  id: string,
  input: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>
): Promise<Project> {
  const supabase = createClient();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined)        patch.title         = input.title;
  if (input.description !== undefined)  patch.description   = input.description;
  if (input.body !== undefined)         patch.body          = input.body;
  if (input.thumbnailUrl !== undefined) patch.thumbnail_url = input.thumbnailUrl;
  if (input.status !== undefined)       patch.status        = input.status;
  if (input.techStack !== undefined)    patch.tech_stack    = input.techStack;
  if (input.links !== undefined)        patch.links         = input.links;

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(toUserMessage(error, "プロジェクトの更新に失敗しました。"));
  return rowToProject(data as Record<string, unknown>);
}

/** プロジェクトを削除する。 */
export async function deleteProject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(toUserMessage(error, "プロジェクトの削除に失敗しました。"));
}
