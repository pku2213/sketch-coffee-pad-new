"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Search, X } from "lucide-react";
import type { MenuItem } from "@/types";
import { CATEGORY_SHORT_NAMES, useMenu } from "@/lib/useMenu";
import { searchMenu } from "@/lib/search";
import { refreshMenu } from "@/lib/sync";
import { toast } from "@/lib/toast";
import Wordmark from "./Wordmark";

/**
 * 点单页和配方页共用的菜单浏览（v7.1 紧凑版）：
 *  - 顶部 logo + 全局搜索（中文 / 英文 / 拼音首字母）
 *  - 卡片更小、一屏能放下更多，但字号有下限
 *  - 子分类是顶部标签，分类栏窄
 */
export default function MenuBrowser({
  hint,
  onPick,
  renderCard,
  headerExtra,
}: {
  hint: string;
  onPick: (item: MenuItem) => void;
  renderCard?: (item: MenuItem) => React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  const { menu, categories } = useMenu();
  const [activeCategory, setActiveCategory] = useState("");
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(activeCategory)) setActiveCategory(categories[0]);
  }, [categories, activeCategory]);

  const subCategories = useMemo(() => {
    const subs = Array.from(
      new Set(menu.filter(i => i.category === activeCategory).map(i => i.subCategory).filter(Boolean) as string[])
    );
    return subs.length > 0 ? subs : null;
  }, [menu, activeCategory]);

  useEffect(() => {
    setActiveSub(null); // 默认显示整个分类，子分类当作筛选
  }, [activeCategory]);

  const searching = query.trim().length > 0;
  const hits = useMemo(() => (searching ? searchMenu(menu, query) : []), [menu, query, searching]);

  const items = useMemo(() => {
    const inCat = menu.filter(i => i.category === activeCategory);
    return activeSub ? inCat.filter(i => i.subCategory === activeSub) : inCat;
  }, [menu, activeCategory, activeSub]);

  const manualSync = async () => {
    setSyncing(true);
    const r = await refreshMenu({ force: true });
    setSyncing(false);
    if (r === "updated") toast("菜单已从飞书更新", { kind: "success" });
    else toast("同步失败，请检查网络后重试", { kind: "error" });
  };

  const pickCategory = (cat: string) => {
    setQuery("");
    setActiveCategory(cat);
  };

  const card = (item: MenuItem, reason?: string, showCat?: boolean) => (
    <button
      key={item.id}
      onClick={() => onPick(item)}
      className="text-left bg-panel rounded-xl px-3 py-2.5 border border-line shadow-card hover:border-brand/40 active:scale-[0.97] transition-all min-h-[4.25rem] flex flex-col gap-1"
    >
      {renderCard ? renderCard(item) : <DefaultCard item={item} />}
      {(showCat || reason) && (
        <span className="text-[0.72rem] font-bold text-muted truncate">{reason || item.subCategory || item.category}</span>
      )}
    </button>
  );

  return (
    <div className="flex h-full">
      {/* 分类栏 */}
      <nav className="w-[4.5rem] shrink-0 h-full overflow-y-auto no-scrollbar bg-sunken border-r border-line py-2 px-1.5 flex flex-col gap-1">
        {categories.map(cat => {
          const active = !searching && cat === activeCategory;
          return (
            <button
              key={cat}
              onClick={() => pickCategory(cat)}
              className={`w-full py-2.5 rounded-lg text-sm font-black transition-all ${
                active ? "bg-panel text-ink shadow-card" : "text-muted hover:text-ink hover:bg-panel/50"
              }`}
            >
              {CATEGORY_SHORT_NAMES[cat] || cat.slice(0, 2)}
            </button>
          );
        })}
      </nav>

      {/* 内容 */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar">
        <header className="sticky top-0 z-10 bg-canvas/95 backdrop-blur px-4 pt-3 pb-2 space-y-2">
          <div className="flex items-center gap-2">
            <Wordmark className="h-8 w-auto shrink-0 text-ink mr-2 hidden sm:block" />
            {/* 全局搜索 */}
            <label className="flex-1 min-w-0 h-10 rounded-full bg-panel border border-line flex items-center gap-2 px-3 focus-within:border-brand">
              <Search size={16} className="text-muted shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="搜索全部饮品：名称 / 拼音首字母（nt = 拿铁）"
                className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold placeholder:text-muted placeholder:font-bold"
                enterKeyHint="search"
              />
              {searching && (
                <button
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 w-6 h-6 rounded-full bg-sunken text-muted flex items-center justify-center"
                  aria-label="清空搜索"
                >
                  <X size={14} />
                </button>
              )}
            </label>
            {headerExtra}
            <button
              onClick={manualSync}
              disabled={syncing}
              className="shrink-0 h-10 w-10 rounded-full bg-panel border border-line text-muted hover:text-ink flex items-center justify-center disabled:opacity-50"
              title="从飞书同步最新菜单"
              aria-label="同步菜单"
            >
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex items-center gap-2 min-h-8">
            {searching ? (
              <h1 className="text-base font-black">
                搜索「{query.trim()}」<span className="text-muted font-bold text-sm ml-1">{hits.length} 个结果</span>
              </h1>
            ) : (
              <>
                <h1 className="text-lg font-black tracking-tight shrink-0 mr-1">{activeCategory}</h1>
                {subCategories && (
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    <SubChip active={activeSub === null} onClick={() => setActiveSub(null)} label="全部" />
                    {subCategories.map(sub => (
                      <SubChip key={sub} active={sub === activeSub} onClick={() => setActiveSub(sub)} label={sub} />
                    ))}
                  </div>
                )}
                <span className="ml-auto text-xs font-bold text-muted shrink-0 hidden md:inline">{hint}</span>
              </>
            )}
          </div>
        </header>

           <div className="px-4 pb-8 pt-1 grid gap-2 grid-cols-5">
          {searching
            ? hits.map(h => card(h.item, h.reason, true))
            : items.map(item => card(item, undefined, !activeSub && !!subCategories))}
          {searching && hits.length === 0 && (
            <p className="col-span-full py-12 text-center text-muted font-bold">没有找到「{query.trim()}」，试试拼音首字母或换个关键词</p>
          )}
          {!searching && items.length === 0 && (
            <p className="col-span-full py-12 text-center text-muted font-bold">这个分类暂时没有内容</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SubChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-8 px-3 rounded-full text-sm font-black transition-colors ${
        active ? "bg-brand text-brand-fg" : "bg-panel border border-line text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

export function TempBadges({ item }: { item: MenuItem }) {
  const temps = item.options?.temps || [];
  return (
    <span className="flex gap-1">
      {temps.includes("热") && (
        <span className="px-1.5 rounded bg-hot/15 text-hot text-[0.72rem] font-black leading-[1.15rem]">热</span>
      )}
      {temps.includes("冷") && (
        <span className="px-1.5 rounded bg-cold/15 text-cold text-[0.72rem] font-black leading-[1.15rem]">冰</span>
      )}
    </span>
  );
}

function DefaultCard({ item }: { item: MenuItem }) {
  return (
    <>
      <span className="text-base font-black leading-snug line-clamp-2">{item.name}</span>
      <span className="mt-auto flex items-center justify-between gap-1">
        <TempBadges item={item} />
        <span className="text-sm font-black text-accent">¥{item.price}</span>
      </span>
    </>
  );
}
