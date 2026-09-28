import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_MENU, DAILY_CHECKLIST, DEEP_CLEAN_LIST, DEFAULT_SUPPLIES } from '../constants';
import { MenuItem } from '../types';

/**
 * Dexie (IndexedDB) 本地数据库
 * v1: menu / orders / duty
 * v2 [v7]: 新增 meta 表（订单号累计计数器、同步时间等键值）
 * v3 [v7.1]: 新增 restock 表（缺货补货，只存本地）
 * v4 [v7.2]: 新增 supplies 表（原料清单：饮品 / 食品 / 用品 / 其他，可自行添加）
 */

export interface OrderTable {
  id?: number;
  orderId: string;
  timestamp: Date;
  itemName: string;
  payable: number;
  originalPrice?: number;
  discounts?: string;
  status: 'processing' | 'completed' | 'cancelled';
  paid: boolean;
  produced: boolean;
  isSynced: 0 | 1;
  signature: string | null;
  needWash?: boolean;
  washed?: boolean;
  menuItemId?: string;
  selectedBenefits?: string[];
  syncItemName?: string;
  syncDiscounts?: string;
  /** [v7] 完成时间 */
  completedAt?: Date;
}

export interface DutyTable {
  id?: number;
  type: 'MORNING' | 'EVENING' | 'DEEP';
  cat: string;
  items: string[];
}

/**
 * [v7.1] 缺货补货记录（只存在这台 Pad 本地，不同步飞书）
 * 流程：missing 缺货 → requested 已@舒舒 → ordered 舒舒已买·在路上（可跳过）→ arrived 已到货
 */
export type RestockStatus = 'missing' | 'requested' | 'ordered' | 'arrived';

export interface RestockTable {
  id?: number;
  item: string;
  note?: string;
  status: RestockStatus;
  createdAt: Date;
  createdBy?: string;
  requestedAt?: Date;
  requestedBy?: string;
  /** 最近一次再次提醒舒舒的时间 */
  remindedAt?: Date;
  orderedAt?: Date;
  orderedBy?: string;
  arrivedAt?: Date;
  arrivedBy?: string;
}

/** [v7.2] 原料清单（补货页用） */
export interface SupplyTable {
  id?: number;
  name: string;
  category: string;
  createdAt?: Date;
}

export interface MetaTable {
  key: string;
  value: unknown;
}

export class SketchCoffeeDB extends Dexie {
  menu!: EntityTable<MenuItem, 'id'>;
  orders!: EntityTable<OrderTable, 'id'>;
  duty!: EntityTable<DutyTable, 'id'>;
  meta!: EntityTable<MetaTable, 'key'>;
  restock!: EntityTable<RestockTable, 'id'>;
  supplies!: EntityTable<SupplyTable, 'id'>;

  constructor() {
    super('SketchCoffeeDB');

    this.version(1).stores({
      menu: '++id, name, category',
      orders: '++id, orderId, timestamp, isSynced, status',
      duty: '++id, type',
    });

    // [v7] 只新增表，不动旧表结构，老数据原样保留
    this.version(2).stores({
      menu: '++id, name, category',
      orders: '++id, orderId, timestamp, isSynced, status',
      duty: '++id, type',
      meta: 'key',
    });

    // [v7.1] 新增缺货补货表
    this.version(3).stores({
      menu: '++id, name, category',
      orders: '++id, orderId, timestamp, isSynced, status',
      duty: '++id, type',
      meta: 'key',
      restock: '++id, item, status, createdAt',
    });

    // [v7.2] 新增原料清单表，升级时自动写入默认原料
    this.version(4)
      .stores({
        menu: '++id, name, category',
        orders: '++id, orderId, timestamp, isSynced, status',
        duty: '++id, type',
        meta: 'key',
        restock: '++id, item, status, createdAt',
        supplies: '++id, &name, category',
      })
      .upgrade(async tx => {
        const defaults = defaultSupplyRows();
        const known = new Set(defaults.map(d => d.name));
        // 以前手动登记过、但不在默认清单里的原料，放进"其他"
        const extra = new Set<string>();
        await tx.table('restock').each((r: RestockTable) => {
          if (r.item && !known.has(r.item)) extra.add(r.item);
        });
        await tx.table('supplies').bulkAdd([
          ...defaults,
          ...Array.from(extra).map(name => ({ name, category: '其他', createdAt: new Date() })),
        ]);
      });

    this.on('populate', () => {
      // 首次打开：先用代码里的默认菜单/清单兜底（离线也能用），联网后会自动从飞书刷新
      this.menu.bulkAdd(DEFAULT_MENU);
      const dutyData: DutyTable[] = [
        ...DAILY_CHECKLIST.MORNING.map(item => ({ ...item, type: 'MORNING' as const })),
        ...DAILY_CHECKLIST.EVENING.map(item => ({ ...item, type: 'EVENING' as const })),
        ...DEEP_CLEAN_LIST.map(item => ({ ...item, type: 'DEEP' as const })),
      ];
      this.duty.bulkAdd(dutyData);
      this.supplies.bulkAdd(defaultSupplyRows());
    });
  }
}

function defaultSupplyRows(): SupplyTable[] {
  const now = new Date();
  return Object.entries(DEFAULT_SUPPLIES).flatMap(([category, names]) =>
    names.map(name => ({ name, category, createdAt: now })),
  );
}

export const db = new SketchCoffeeDB();

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value });
}
