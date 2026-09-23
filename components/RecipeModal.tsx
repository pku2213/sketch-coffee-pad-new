"use client";

import { ThermometerSun, ThermometerSnowflake, AlertCircle, Lightbulb, ListOrdered } from "lucide-react";
import Modal from "./Modal";
import type { MenuItem } from "@/types";

/** 去掉步骤前面自带的 "1. " 编号，统一由界面编号 */
const clean = (s: string) => s.replace(/^\s*\d+\s*[.、．]\s*/, "");

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span className="shrink-0 w-7 h-7 rounded-full bg-ink/10 text-ink/60 font-mono font-black text-sm flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span className="text-lg md:text-xl font-bold leading-relaxed">{clean(step)}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * [v7] 配方弹窗（配方页和账本页共用）
 * @param highlight 只突出某个温度（账本里从"拿铁 (冷)"打开时，冷饮做法排在前面）
 */
export default function RecipeModal({
  item,
  onClose,
  highlight,
  syncedAt,
}: {
  item: MenuItem;
  onClose: () => void;
  highlight?: "hot" | "cold";
  syncedAt?: string;
}) {
  const ins = item.instructions;
  const hasHot = !!ins?.hot?.length;
  const hasCold = !!ins?.cold?.length;

  const hotBlock = hasHot && (
    <section key="hot" className="rounded-3xl p-5 md:p-6 bg-hot/10 border-2 border-hot/20">
      <h3 className="flex items-center gap-2 text-xl font-black text-hot mb-4">
        <ThermometerSun size={24} /> 热饮做法
      </h3>
      <StepList steps={ins!.hot!} />
    </section>
  );
  const coldBlock = hasCold && (
    <section key="cold" className="rounded-3xl p-5 md:p-6 bg-cold/10 border-2 border-cold/20">
      <h3 className="flex items-center gap-2 text-xl font-black text-cold mb-4">
        <ThermometerSnowflake size={24} /> 冷饮做法
      </h3>
      <StepList steps={ins!.cold!} />
    </section>
  );
  const tempBlocks = highlight === "cold" ? [coldBlock, hotBlock] : [hotBlock, coldBlock];

  return (
    <Modal
      onClose={onClose}
      size="xl"
      title={
        <span className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl md:text-3xl">{item.name}</span>
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-sunken text-muted">{item.category}</span>
          {item.options?.temps?.includes("热") && <ThermometerSun size={20} className="text-hot" />}
          {item.options?.temps?.includes("冷") && <ThermometerSnowflake size={20} className="text-cold" />}
        </span>
      }
      subtitle={syncedAt ? `配方数据同步于 ${syncedAt}` : "制作流程 PREP GUIDE"}
    >
      {!ins || (!ins.general?.length && !hasHot && !hasCold && !ins.tips?.length) ? (
        <div className="py-16 flex flex-col items-center text-muted">
          <AlertCircle size={48} />
          <p className="font-black text-xl mt-4">暂无制作流程</p>
        </div>
      ) : (
        <div className="space-y-5">
          {ins.general && ins.general.length > 0 && (
            <section className="rounded-3xl p-5 md:p-6 bg-sunken">
              <h3 className="flex items-center gap-2 text-xl font-black text-ink/70 mb-4">
                <ListOrdered size={22} /> 制作步骤
              </h3>
              <StepList steps={ins.general} />
            </section>
          )}

          {(hasHot || hasCold) && (
            <div className={`grid gap-5 ${hasHot && hasCold ? "lg:grid-cols-2" : ""}`}>{tempBlocks}</div>
          )}

          {ins.tips && ins.tips.length > 0 && (
            <section className="rounded-3xl p-5 bg-accent/15 border-2 border-accent/25">
              <h3 className="flex items-center gap-2 text-base font-black text-accent mb-3">
                <Lightbulb size={20} /> 制作要点
              </h3>
              <ul className="space-y-2">
                {ins.tips.map((tip, i) => (
                  <li key={i} className="text-lg font-bold leading-relaxed">
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
