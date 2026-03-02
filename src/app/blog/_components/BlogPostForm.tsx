"use client";

import { useState, useTransition, useRef, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BlogPostStatus } from "@/lib/types";

export interface BlogPostFormValues {
  title: string;
  excerpt: string;
  body: string;
  icon: string;
  tags: string[];
  status: BlogPostStatus;
}

interface Props {
  initialValues?: Partial<BlogPostFormValues>;
  submitLabel: string;
  onSubmit: (values: BlogPostFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const DEFAULT_VALUES: BlogPostFormValues = {
  title: "",
  excerpt: "",
  body: "",
  icon: "📝",
  tags: [],
  status: "draft",
};

// ── 絵文字カタログ ────────────────────────────────────────────────────────────
const EMOJI_CATALOG: Record<string, string[]> = {
  "執筆":       ["📝", "✍️", "📖", "📚", "📄", "🗒️", "📓", "📔", "🖊️", "📰", "📜", "🗞️"],
  "技術":       ["💻", "🔨", "⚙️", "🛠️", "🚀", "🔧", "🐛", "🔍", "💾", "🖥️", "📡", "🔌"],
  "アイデア":   ["💡", "🧠", "🤔", "🎯", "✨", "💫", "🌟", "⭐", "🔮", "🧩", "🎪", "🎭"],
  "デザイン":   ["🎨", "🖌️", "🖼️", "✏️", "🎬", "🎮", "🕹️", "📐", "📏", "🎠", "🌈", "🎉"],
  "データ":     ["📊", "📈", "📉", "🗂️", "📋", "🔢", "🧮", "💹", "📌", "🗺️", "🔬", "🧪"],
  "ライフ":     ["☕", "🌱", "🌍", "🎵", "🔥", "⚡", "🏆", "🎁", "🐾", "🌸", "🍀", "🦋"],
};

const ALL_EMOJIS = Object.values(EMOJI_CATALOG).flat();

// ── EmojiPicker ───────────────────────────────────────────────────────────────
function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const pickRandom = () => {
    const next = ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
    onChange(next);
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-5">
        {/* 現在の絵文字（クリックで picker を開く） */}
        <button
          type="button"
          onClick={() => setIsOpen((p) => !p)}
          className="w-24 h-24 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 rounded-2xl text-6xl transition-colors border-2 border-dashed border-zinc-200 hover:border-zinc-400 select-none"
        >
          {value}
        </button>

        <div className="space-y-1">
          <p className="text-xs text-zinc-500">クリックしてアイコンを変更</p>
          <button
            type="button"
            onClick={pickRandom}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors underline underline-offset-2"
          >
            ランダムに選ぶ 🎲
          </button>
        </div>
      </div>

      {/* ドロップダウン picker */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-28 left-0 z-30 bg-white border border-zinc-200 rounded-2xl shadow-xl p-4 w-80 max-h-72 overflow-y-auto"
          >
            {Object.entries(EMOJI_CATALOG).map(([category, emojis]) => (
              <div key={category} className="mb-4 last:mb-0">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                  {category}
                </p>
                <div className="flex flex-wrap gap-1">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { onChange(emoji); setIsOpen(false); }}
                      className={`w-9 h-9 flex items-center justify-center text-xl rounded-lg transition-colors hover:bg-zinc-100 ${
                        value === emoji ? "bg-zinc-200 ring-2 ring-zinc-400" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── BlogPostForm ──────────────────────────────────────────────────────────────

export default function BlogPostForm({
  initialValues,
  submitLabel,
  onSubmit,
  onDelete,
}: Props) {
  const [values, setValues] = useState<BlogPostFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [tagInput, setTagInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof BlogPostFormValues>(
    key: K,
    value: BlogPostFormValues[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  // ── タグ ──────────────────────────────────────────────────────────────────
  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || values.tags.includes(tag)) return;
    set("tags", [...values.tags, tag]);
    setTagInput("");
  };
  const removeTag = (tag: string) =>
    set("tags", values.tags.filter((t) => t !== tag));
  const onTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  };

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

      {/* ステータス切り替え */}
      <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
        <span className="text-xs font-semibold text-zinc-500 mr-1">ステータス</span>
        {(["draft", "published"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => set("status", s)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              values.status === s
                ? s === "published"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
            }`}
          >
            {s === "draft" ? "下書き" : "公開"}
          </button>
        ))}
      </div>

      {/* アイコン選択（Zenn 風） */}
      <Field label="アイコン">
        <EmojiPicker value={values.icon} onChange={(e) => set("icon", e)} />
      </Field>

      {/* タイトル */}
      <Field label="タイトル" required>
        <input
          type="text"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          required
          placeholder="記事のタイトル"
          className={inputCls}
        />
      </Field>

      {/* 要約 */}
      <Field label="要約" hint="一覧カードに表示します（任意）">
        <textarea
          value={values.excerpt}
          onChange={(e) => set("excerpt", e.target.value)}
          rows={2}
          placeholder="この記事は..."
          className={`${inputCls} resize-none`}
        />
      </Field>

      {/* 本文 */}
      <Field label="本文" required>
        <textarea
          value={values.body}
          onChange={(e) => set("body", e.target.value)}
          required
          rows={16}
          placeholder="記事の内容を書いてください..."
          className={`${inputCls} resize-y font-mono text-sm leading-relaxed`}
        />
      </Field>

      {/* タグ */}
      <Field label="タグ" hint="Enter または「追加」で確定">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={onTagKeyDown}
              placeholder="Next.js"
              className={`${inputCls} flex-1`}
            />
            <button type="button" onClick={addTag} className={addBtnCls}>追加</button>
          </div>
          {values.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {values.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-700 text-xs rounded-full">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-zinc-400 hover:text-zinc-700 transition-colors leading-none">×</button>
                </span>
              ))}
            </div>
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
        {onDelete && (
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">本当に削除しますか？</span>
                <button type="button" onClick={handleDelete} disabled={isDeleting} className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  {isDeleting ? "削除中..." : "削除する"}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors">
                  キャンセル
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                削除する
              </button>
            )}
          </div>
        )}
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

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-shadow bg-white";

const addBtnCls =
  "px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors whitespace-nowrap";

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
