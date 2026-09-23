/**
 * 价格计算（从点单页抽出来的纯函数，逻辑与原版完全一致，方便测试）
 * 规则：原价 + 加料 → 先减固定金额 → 再打折（值班免费 / 咖啡师 8 折）→ 加手动调整 → 保留 1 位小数，最低 0
 */

export type MilkOption = 'normal' | 'coconut' | 'oat';

export interface PriceInput {
  basePrice: number;
  extraEspresso: boolean;
  isDecaf: boolean;
  milkOption: MilkOption;
  benefits: Set<string> | string[];
  manualAdjustment: number;
  manualReason?: string;
}

export const ADDON_PRICES = { extraEspresso: 3, decaf: 3, coconut: 2, oat: 4 } as const;
export const BENEFIT_REDUCTIONS: Record<string, number> = { byo_cup: 1, store_cup: 1, byo_beans: 4, byo_milk: 3 };

export function calcPrice(input: PriceInput): number {
  const b = new Set(input.benefits);
  let total = input.basePrice;
  if (input.extraEspresso) total += ADDON_PRICES.extraEspresso;
  if (input.isDecaf) total += ADDON_PRICES.decaf;
  if (input.milkOption === 'coconut') total += ADDON_PRICES.coconut;
  if (input.milkOption === 'oat') total += ADDON_PRICES.oat;

  for (const [key, amount] of Object.entries(BENEFIT_REDUCTIONS)) {
    if (b.has(key)) total -= amount;
  }

  if (b.has('duty')) total = 0;
  else if (b.has('barista')) total = total * 0.8;

  total += Number.isFinite(input.manualAdjustment) ? input.manualAdjustment : 0;
  return Math.max(0, Math.round(total * 10) / 10);
}

/** 飞书"优惠明细"和本地显示用的描述，例如 "燕麦奶(+4)、自带杯(-1)、咖啡师(8折)" */
export function describeDiscounts(input: PriceInput): string {
  const b = new Set(input.benefits);
  const parts: string[] = [];
  if (input.milkOption === 'coconut') parts.push('椰奶(+2)');
  if (input.milkOption === 'oat') parts.push('燕麦奶(+4)');
  if (input.isDecaf) parts.push('低因(+3)');
  if (input.extraEspresso) parts.push('加一份浓缩(+3)');
  if (b.has('byo_cup')) parts.push('自带杯(-1)');
  if (b.has('store_cup')) parts.push('店用杯(-1)');
  if (b.has('byo_beans')) parts.push('自带豆(-4)');
  if (b.has('byo_milk')) parts.push('自带奶(-3)');
  if (b.has('duty')) parts.push('值班(免费)');
  else if (b.has('barista')) parts.push('咖啡师(8折)');
  if (input.manualAdjustment) {
    const sign = input.manualAdjustment > 0 ? '+' : '';
    parts.push(`${input.manualReason || '手动调整'}(${sign}${input.manualAdjustment})`);
  }
  return parts.length > 0 ? parts.join('、') : '无优惠';
}

/** 本地显示的饮品全名，例如 "拿铁 (热、燕麦奶、自带杯)" */
export function describeItemName(name: string, temp: string, input: PriceInput): string {
  const b = new Set(input.benefits);
  const opts: string[] = [];
  if (temp) opts.push(temp);
  if (input.milkOption === 'coconut') opts.push('椰奶');
  if (input.milkOption === 'oat') opts.push('燕麦奶');
  if (input.isDecaf) opts.push('低因');
  if (input.extraEspresso) opts.push('加一份浓缩');
  if (b.has('byo_cup')) opts.push('自带杯');
  if (b.has('store_cup')) opts.push('店用杯');
  if (b.has('byo_beans')) opts.push('自带豆');
  if (b.has('byo_milk')) opts.push('自带奶');
  if (input.manualAdjustment) opts.push(`手动调整${input.manualAdjustment > 0 ? '+' : ''}${input.manualAdjustment}`);
  return opts.length > 0 ? `${name} (${opts.join('、')})` : name;
}
