"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { removeRecentBarista, setCurrentBarista, useSettings, formatDuration } from "@/lib/settings";
import { toast } from "@/lib/toast";

/**
 * [v7 NEW] 换班：设置"当前值班咖啡师"
 * 设好之后，完成订单时默认用这个名字签名，不用每单都签。
 */
export default function BaristaPicker({ onDone }: { onDone?: () => void }) {
  const { currentBarista, recentBaristas, baristaSince } = useSettings();
  const [draft, setDraft] = useState(currentBarista);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => setDraft(currentBarista), [currentBarista]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const commit = (name: string) => {
    const n = name.trim();
    if (!n) return;
    const changed = n !== currentBarista;
    setCurrentBarista(n);
    if (changed) toast(`已换班：当前值班 ${n}`, { kind: "success" });
    onDone?.();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-sunken px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-muted">当前值班</p>
          <p className="text-lg font-black">{currentBarista || "未设置"}</p>
        </div>
        {currentBarista && baristaSince && (
          <p className="text-xs font-bold text-muted text-right">
            已值班
            <br />
            <span className="text-ink">{formatDuration(now - baristaSince)}</span>
          </p>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          commit(draft);
        }}
      >
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="输入接班咖啡师的名字"
          className="flex-1 min-w-0 h-12 rounded-xl border-2 border-line bg-canvas px-4 text-lg font-bold focus:border-brand outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="h-12 px-5 rounded-xl bg-brand text-brand-fg font-black flex items-center gap-1.5 disabled:opacity-40"
        >
          <Check size={18} /> 换班
        </button>
      </form>

      {recentBaristas.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted mb-2">最近值班（点一下直接换班）</p>
          <div className="flex flex-wrap gap-2">
            {recentBaristas.map(name => (
              <span
                key={name}
                className={`group inline-flex items-center rounded-full border-2 text-sm font-bold ${
                  name === currentBarista ? "border-brand bg-brand text-brand-fg" : "border-line bg-panel"
                }`}
              >
                <button onClick={() => commit(name)} className="pl-4 pr-2 py-1.5">
                  {name}
                </button>
                <button
                  onClick={() => removeRecentBarista(name)}
                  className="pr-2 py-1.5 opacity-40 hover:opacity-100"
                  aria-label={`移除 ${name}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
