"use client";

import { useState, useTransition, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Project, ProjectStatus, ProjectLink } from "@/lib/types";

export interface ProjectFormValues {
  title: string;
  description: string;
  body: string;
  thumbnailUrl: string;
  status: ProjectStatus;
  techStack: string[];
  links: ProjectLink[];
}

interface Props {
  /** 編集時は初期値を渡す。新規作成時は省略 */
  initialValues?: Partial<ProjectFormValues>;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  /** 編集ページ専用：削除ボタンのハンドラ */
  onDelete?: () => Promise<void>;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "wip",      label: "🔧 開発中"     },
  { value: "active",   label: "✅ 公開中"     },
  { value: "archived", label: "📦 アーカイブ" },
];

const DEFAULT_VALUES: ProjectFormValues = {
  title: "",
  description: "",
  body: "",
  thumbnailUrl: "",
  status: "wip",
  techStack: [],
  links: [],
};

export default function ProjectForm({
  initialValues,
  submitLabel,
  onSubmit,
  onDelete,
}: Props) {
  const [values, setValues] = useState<ProjectFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [techInput, setTechInput] = useState("");
  const [linkInput, setLinkInput] = useState({ label: "", url: "" });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  // ── tech stack ────────────────────────────────────────────────────────────
  const addTech = () => {
    const tag = techInput.trim();
    if (!tag || values.techStack.includes(tag)) return;
    set("techStack", [...values.techStack, tag]);
    setTechInput("");
  };

  const removeTech = (tag: string) =>
    set("techStack", values.techStack.filter((t) => t !== tag));

  const onTechKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addTech(); }
  };

  // ── links ─────────────────────────────────────────────────────────────────
  const addLink = () => {
    const { label, url } = linkInput;
    if (!label.trim() || !url.trim()) return;
    set("links", [...values.links, { label: label.trim(), url: url.trim() }]);
    setLinkInput({ label: "", url: "" });
  };

  const removeLink = (i: number) =>
    set("links", values.links.filter((_, idx) => idx !== i));

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await onSubmit(values);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "エラーが発生しました。");
      }
    });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    startDeleting(async () => {
      try {
        await onDelete();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "削除に失敗しました。");
        setConfirmDelete(false);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* タイトル */}
      <Field label="タイトル" required>
        <input
          type="text"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          required
          placeholder="My Awesome App"
          className={inputCls}
        />
      </Field>

      {/* 一言説明 */}
      <Field label="一言説明" hint="カード表示に使います" required>
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          required
          rows={2}
          placeholder="このアプリは..."
          className={`${inputCls} resize-none`}
        />
      </Field>

      {/* 詳細説明 */}
      <Field label="詳細説明" hint="詳細ページに表示します（任意）">
        <textarea
          value={values.body}
          onChange={(e) => set("body", e.target.value)}
          rows={6}
          placeholder="機能の説明、開発の背景など..."
          className={`${inputCls} resize-y`}
        />
      </Field>

      {/* サムネイル URL */}
      <Field label="サムネイル URL" hint="画像の直リンク（任意）">
        <input
          type="url"
          value={values.thumbnailUrl}
          onChange={(e) => set("thumbnailUrl", e.target.value)}
          placeholder="https://example.com/image.png"
          className={inputCls}
        />
      </Field>

      {/* ステータス */}
      <Field label="ステータス">
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set("status", opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                values.status === opt.value
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Field>

      {/* 技術スタック */}
      <Field label="技術スタック" hint="Enter または「追加」で確定">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={onTechKeyDown}
              placeholder="Next.js"
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              onClick={addTech}
              className={addBtnCls}
            >
              追加
            </button>
          </div>
          {values.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {values.techStack.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-700 text-xs rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTech(tag)}
                    className="text-zinc-400 hover:text-zinc-700 transition-colors leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Field>

      {/* リンク */}
      <Field label="リンク" hint="ラベルと URL を入力して「追加」">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={linkInput.label}
              onChange={(e) => setLinkInput((p) => ({ ...p, label: e.target.value }))}
              placeholder="Demo"
              className={`${inputCls} w-28`}
            />
            <input
              type="url"
              value={linkInput.url}
              onChange={(e) => setLinkInput((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://..."
              className={`${inputCls} flex-1`}
            />
            <button type="button" onClick={addLink} className={addBtnCls}>
              追加
            </button>
          </div>
          {values.links.length > 0 && (
            <ul className="space-y-1">
              {values.links.map((link, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-600">
                  <span className="font-medium w-20 truncate">{link.label}</span>
                  <span className="flex-1 truncate text-zinc-400">{link.url}</span>
                  <button
                    type="button"
                    onClick={() => removeLink(i)}
                    className="text-zinc-400 hover:text-red-500 transition-colors text-xs"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>

      {/* エラー */}
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

      {/* アクションボタン */}
      <div className="flex items-center justify-between pt-2">
        {/* 削除（編集ページのみ） */}
        {onDelete && (
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">本当に削除しますか？</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "削除中..." : "削除する"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                削除する
              </button>
            )}
          </div>
        )}

        {/* 送信 */}
        <button
          type="submit"
          disabled={isPending}
          className="ml-auto px-6 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ── スタイル定数 ──────────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-shadow bg-white";

const addBtnCls =
  "px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors whitespace-nowrap";

// ── Field ラッパー ────────────────────────────────────────────────────────────
function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-semibold text-zinc-700">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[11px] text-zinc-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
