"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, RefreshCw, ThermometerSun, ThermometerSnowflake, ClipboardList, Coffee, CupSoda } from 'lucide-react';
import MenuBrowser from '@/components/MenuBrowser';
import Modal from '@/components/Modal';
import { db } from '@/lib/db';
import { nextOrderId } from '@/lib/orders';
import { calcPrice, describeDiscounts, describeItemName, type MilkOption, type PriceInput } from '@/lib/pricing';
import { toast } from '@/lib/toast';
import type { MenuItem } from '@/types';

/* 选项按钮 */
function Option({
  active,
  onClick,
  label,
  sub,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[3.25rem] px-4 py-2 rounded-2xl border-2 text-left flex items-center justify-between gap-2 transition-all ${
        active ? 'border-brand bg-brand/10 text-ink shadow-card' : 'border-transparent bg-sunken text-ink/70 hover:text-ink'
      }`}
    >
      <span className="flex items-center gap-2 font-black">
        {icon}
        {label}
      </span>
      {sub && <span className={`text-sm font-bold ${active ? 'text-accent' : 'text-muted'}`}>{sub}</span>}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-black text-muted tracking-wider mb-2.5">{title}</h3>
      {children}
    </section>
  );
}

export default function OrderPage() {
  const [showModal, setShowModal] = useState<MenuItem | null>(null);
  const [selectedTemp, setSelectedTemp] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [extraEspresso, setExtraEspresso] = useState(false);
  const [isDecaf, setIsDecaf] = useState(false);
  const [milkOption, setMilkOption] = useState<MilkOption>('normal');
  const [selectedBenefits, setSelectedBenefits] = useState<Set<string>>(new Set());
  const [manualAdjustment, setManualAdjustment] = useState(0);
  const [manualReason, setManualReason] = useState('');

  const activeCount = useLiveQuery(() => db.orders.where('status').equals('processing').count(), [], 0);

  // 打开弹窗时重置选项
  useEffect(() => {
    if (!showModal) return;
    setSelectedTemp(showModal.options?.temps?.[0] || '');
    setExtraEspresso(false);
    setIsDecaf(false);
    setMilkOption('normal');
    setSelectedBenefits(new Set());
    setManualAdjustment(0);
    setManualReason('');
  }, [showModal]);

  const priceInput: PriceInput | null = useMemo(
    () =>
      showModal
        ? {
            basePrice: Number(showModal.price) || 0,
            extraEspresso,
            isDecaf,
            milkOption,
            benefits: selectedBenefits,
            manualAdjustment,
            manualReason,
          }
        : null,
    [showModal, extraEspresso, isDecaf, milkOption, selectedBenefits, manualAdjustment, manualReason],
  );
  const currentPrice = priceInput ? calcPrice(priceInput) : 0;

  const toggleBenefit = (key: string) => {
    const next = new Set(selectedBenefits);
    // 店用杯 / 自带杯 互斥
    if (key === 'store_cup') next.delete('byo_cup');
    if (key === 'byo_cup') next.delete('store_cup');
    if (selectedBenefits.has(key)) next.delete(key);
    else next.add(key);
    setSelectedBenefits(next);
  };

  const handleAdd = async () => {
    if (!showModal || !priceInput || isAdding) return;
    setIsAdding(true);
    try {
      const needWash =
        showModal.name.includes('Dirty') || showModal.category === '酒品' || selectedBenefits.has('store_cup');
      const orderId = await nextOrderId();
      const discounts = describeDiscounts(priceInput);

      await db.orders.add({
        orderId,
        timestamp: new Date(),
        menuItemId: String(showModal.id), // [v7] 记录菜单 ID，查配方更准
        itemName: describeItemName(showModal.name, selectedTemp, priceInput),
        payable: currentPrice,
        originalPrice: Number(showModal.price) || 0,
        discounts,
        syncItemName: `${showModal.name} (${selectedTemp || '常温'})`,
        syncDiscounts: discounts,
        selectedBenefits: Array.from(selectedBenefits),
        status: 'processing',
        paid: false,
        produced: false,
        isSynced: 0,
        signature: null,
        needWash: needWash || undefined,
      });
      toast(`已下单：${showModal.name}　${orderId}`, { kind: 'success' });
      setShowModal(null);
    } catch (error) {
      console.error('Failed to save order:', error);
      toast('保存订单失败，请重试', { kind: 'error' });
    } finally {
      setIsAdding(false);
    }
  };

  const rules = showModal?.options?.rules;
  const perks: string[] = (rules?.perks as string[] | undefined) || [];
  const temps = showModal?.options?.temps || [];

  return (
    <>
      <MenuBrowser
        hint="点菜品开始下单"
        onPick={setShowModal}
        headerExtra={
          <Link
            href="/ledger"
            className="shrink-0 h-10 px-4 rounded-full bg-brand text-brand-fg text-sm font-black flex items-center gap-2 shadow-card"
          >
            <ClipboardList size={16} /> 制作中 {activeCount}
          </Link>
        }
      />

      {showModal && priceInput && (
        <Modal
          onClose={() => setShowModal(null)}
          title={showModal.name}
          subtitle={`${showModal.category}${showModal.subCategory ? ' · ' + showModal.subCategory : ''} · 原价 ¥${showModal.price}`}
          size="lg"
          footer={
            <div className="flex items-center gap-4">
              <div className="mr-auto">
                <p className="text-xs font-bold text-muted">应付</p>
                <p className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">¥{currentPrice.toFixed(1)}</span>
                  {currentPrice !== Number(showModal.price) && (
                    <span className="text-sm font-bold text-muted line-through">¥{showModal.price}</span>
                  )}
                </p>
              </div>
              <button
                onClick={handleAdd}
                disabled={isAdding}
                className="h-14 px-8 rounded-2xl bg-brand text-brand-fg font-black text-lg shadow-card active:scale-[0.98] flex items-center gap-2 disabled:opacity-60"
              >
                {isAdding ? <RefreshCw size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                {isAdding ? '下单中…' : '确认下单'}
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            {temps.length > 0 && (
              <Section title="温度">
                <div className="grid grid-cols-2 gap-3">
                  {temps.map(t => (
                    <Option
                      key={t}
                      active={selectedTemp === t}
                      onClick={() => setSelectedTemp(t)}
                      label={t}
                      icon={
                        t === '热' ? (
                          <ThermometerSun size={18} className="text-hot" />
                        ) : t === '冷' ? (
                          <ThermometerSnowflake size={18} className="text-cold" />
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              </Section>
            )}

            {(rules?.hasMilkBeanSwaps || rules?.hasDecaf || rules?.hasExtraEspresso) && (
              <Section title="豆奶调整">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {rules?.hasMilkBeanSwaps && (
                    <>
                      <Option
                        active={milkOption === 'coconut'}
                        onClick={() => setMilkOption(milkOption === 'coconut' ? 'normal' : 'coconut')}
                        label="换椰奶"
                        sub="+¥2"
                      />
                      <Option
                        active={milkOption === 'oat'}
                        onClick={() => setMilkOption(milkOption === 'oat' ? 'normal' : 'oat')}
                        label="换燕麦奶"
                        sub="+¥4"
                      />
                    </>
                  )}
                  {rules?.hasDecaf && <Option active={isDecaf} onClick={() => setIsDecaf(!isDecaf)} label="低因豆" sub="+¥3" />}
                  {rules?.hasExtraEspresso && (
                    <Option active={extraEspresso} onClick={() => setExtraEspresso(!extraEspresso)} label="加浓缩" sub="+¥3" />
                  )}
                </div>
              </Section>
            )}

            {perks.length > 0 && (
              <Section title="自带与福利">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {perks.includes('cup') && (
                    <>
                      <Option active={selectedBenefits.has('store_cup')} onClick={() => toggleBenefit('store_cup')} label="店用杯" icon={<Coffee size={16} />} sub="-¥1" />
                      <Option active={selectedBenefits.has('byo_cup')} onClick={() => toggleBenefit('byo_cup')} label="自带杯" icon={<CupSoda size={16} />} sub="-¥1" />
                    </>
                  )}
                  {perks.includes('barista') && (
                    <Option active={selectedBenefits.has('barista')} onClick={() => toggleBenefit('barista')} label="☕️ 咖啡师" sub="8折" />
                  )}
                  {perks.includes('duty') && (
                    <Option active={selectedBenefits.has('duty')} onClick={() => toggleBenefit('duty')} label="🛡️ 值班" sub="免费" />
                  )}
                  {perks.includes('beans') && (rules?.hasDecaf || rules?.hasExtraEspresso) && (
                    <Option active={selectedBenefits.has('byo_beans')} onClick={() => toggleBenefit('byo_beans')} label="🫘 自带豆" sub="-¥4" />
                  )}
                  {perks.includes('milk') && rules?.hasMilkBeanSwaps && (
                    <Option active={selectedBenefits.has('byo_milk')} onClick={() => toggleBenefit('byo_milk')} label="🥛 自带奶" sub="-¥3" />
                  )}
                </div>
              </Section>
            )}

            <Section title="手动调整（可选）">
              <div className="flex gap-3">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="金额 ±"
                  value={manualAdjustment === 0 ? '' : manualAdjustment}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setManualAdjustment(Number.isFinite(v) ? v : 0);
                  }}
                  className="w-32 h-12 rounded-xl border-2 border-line bg-canvas px-3 font-black outline-none focus:border-brand"
                />
                <input
                  type="text"
                  placeholder="调整原因"
                  value={manualReason}
                  onChange={e => setManualReason(e.target.value)}
                  className="flex-1 min-w-0 h-12 rounded-xl border-2 border-line bg-canvas px-3 font-bold outline-none focus:border-brand"
                />
              </div>
            </Section>
          </div>
        </Modal>
      )}
    </>
  );
}
