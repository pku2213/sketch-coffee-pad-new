import type { MenuItem } from '../types';

/**
 * [v7.1] 饮品搜索：支持中文、英文名、拼音首字母（nt = 拿铁，zgnt = 榛果拿铁）
 * 拼音首字母用浏览器自带的中文排序规则推算，不需要额外的拼音库。
 */

const BOUNDARY_CHARS = '阿八嚓哒妸发旮哈讥咔垃痳拏噢妑七呥扨它穵夕丫帀';
const BOUNDARY_LETTERS = 'abcdefghjklmnopqrstwxyz';

let collator: Intl.Collator | null = null;
const cache = new Map<string, string>();

function initialOf(ch: string): string {
  if (!/[一-鿿]/.test(ch)) return /[a-z0-9]/i.test(ch) ? ch.toLowerCase() : '';
  const hit = cache.get(ch);
  if (hit !== undefined) return hit;
  let result = '';
  try {
    collator ??= new Intl.Collator('zh-Hans-CN', { sensitivity: 'base' });
    for (let i = BOUNDARY_CHARS.length - 1; i >= 0; i--) {
      if (collator.compare(ch, BOUNDARY_CHARS[i]) >= 0) {
        result = BOUNDARY_LETTERS[i];
        break;
      }
    }
  } catch {
    result = '';
  }
  cache.set(ch, result);
  return result;
}

export function pinyinInitials(text: string): string {
  return Array.from(text || '').map(initialOf).join('');
}

export interface SearchHit {
  item: MenuItem;
  score: number;
  /** 命中原因，比如"配方含：燕麦奶" */
  reason?: string;
}

const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');

export function searchMenu(menu: MenuItem[], query: string): SearchHit[] {
  const q = norm(query);
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const item of menu) {
    const name = norm(item.name);
    const initials = pinyinInitials(item.name);
    const en = norm(item.englishName || '');
    const cat = norm(`${item.category || ''}${item.subCategory || ''}`);
    let score = 0;
    let reason: string | undefined;
    if (name.startsWith(q)) score = 100;
    else if (name.includes(q)) score = 80;
    else if (initials.startsWith(q)) score = 70;
    else if (initials.includes(q)) score = 55;
    else if (en.includes(q)) score = 45;
    else if (cat.includes(q)) {
      score = 30;
      reason = item.subCategory || item.category;
    } else {
      const ins = item.instructions;
      const steps = [...(ins?.general || []), ...(ins?.hot || []), ...(ins?.cold || []), ...(ins?.tips || [])];
      if (q.length >= 2 && steps.some(s => norm(s).includes(q))) {
        score = 10;
        reason = `配方含「${query.trim()}」`;
      }
    }
    if (score > 0) hits.push({ item, score, reason });
  }
  return hits.sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length);
}
