"use client";

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import MenuBrowser, { TempBadges } from '@/components/MenuBrowser';
import RecipeModal from '@/components/RecipeModal';
import type { MenuItem } from '@/types';

function stepCount(item: MenuItem) {
  const ins = item.instructions;
  if (!ins) return 0;
  return Math.max(ins.general?.length || 0, ins.hot?.length || 0, ins.cold?.length || 0);
}

export default function ProcessPage() {
  const [viewing, setViewing] = useState<MenuItem | null>(null);

  return (
    <>
      <MenuBrowser
        hint="点菜品查看制作流程"
        onPick={setViewing}
        renderCard={item => {
          const n = stepCount(item);
          return (
            <>
              <span className="text-base font-black leading-snug line-clamp-2">{item.name}</span>
              <span className="mt-auto flex items-center justify-between gap-1">
                <TempBadges item={item} />
                <span className={`flex items-center gap-1 text-xs font-bold ${n ? 'text-brand' : 'text-muted'}`}>
                  <BookOpen size={13} /> {n ? `${n} 步` : '无配方'}
                </span>
              </span>
            </>
          );
        }}
      />
      {viewing && <RecipeModal item={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
