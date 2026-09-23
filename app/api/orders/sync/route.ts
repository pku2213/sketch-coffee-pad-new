import { NextResponse } from 'next/server';
import { client } from '@/lib/feishu';

/**
 * POST /api/orders/sync
 * [v7] 幂等写入：先按「订单号」查飞书里是否已存在，订单号 + 下单时间都一致的视为已写入，跳过；
 *      只新增真正缺失的记录。所以网络中断后重复推送也不会重复记账。
 * 返回 syncedKeys（"订单号|时间戳" 列表）= 这次确认已在飞书里的订单，前端只标记这些为已同步。
 */

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface IncomingOrder {
  orderId: string;
  timestamp: number | string;
  itemName: string;
  originalPrice?: number | string;
  discounts?: string;
  finalPrice?: number | string;
  signature?: string;
}

const SEARCH_CHUNK = 20; // 每次查询的订单号条件数
const CREATE_CHUNK = 200; // 每次批量新增的条数

const sanitizePrice = (val: unknown): number => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (val === null || val === undefined || val === '') return 0;
  const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return Number.isNaN(num) ? 0 : num;
};

const safeString = (val: unknown): string => (val === null || val === undefined ? '' : String(val));

/** 飞书文本字段在 search 接口里可能返回字符串，也可能返回 [{text, type}] 片段数组 */
function readText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(seg => (seg && typeof seg === 'object' && 'text' in seg ? String((seg as { text: unknown }).text) : String(seg))).join('');
  if (typeof v === 'object' && 'text' in (v as object)) return String((v as { text: unknown }).text);
  return String(v);
}

function readTime(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
  return null;
}

const keyOf = (orderId: string, ts: number) => `${orderId}|${ts}`;

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key');
  const validApiKey = process.env.API_SECRET_KEY;
  if (!validApiKey || apiKey !== validApiKey) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Invalid API Key' }, { status: 401 });
  }

  const APP_TOKEN = process.env.FEISHU_APP_TOKEN;
  const TABLE_ID_ORDERS = process.env.FEISHU_TABLE_ID_ORDERS;
  if (!APP_TOKEN || !TABLE_ID_ORDERS) {
    return NextResponse.json({ success: false, error: 'Feishu configuration missing' }, { status: 500 });
  }

  let orders: IncomingOrder[];
  try {
    const body = await request.json();
    orders = Array.isArray(body?.orders) ? body.orders : [];
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // 1. 校验 & 规范化
  const valid: { key: string; orderId: string; ts: number; fields: Record<string, string | number> }[] = [];
  for (const o of orders) {
    const ts = new Date(o?.timestamp ?? NaN).getTime();
    if (!o?.orderId || !o?.itemName || !Number.isFinite(ts)) continue;
    const orderId = safeString(o.orderId);
    valid.push({
      key: keyOf(orderId, ts),
      orderId,
      ts,
      fields: {
        // 列名必须和飞书表头完全一致
        订单号: orderId,
        下单时间: ts,
        饮品明细: safeString(o.itemName),
        原价: sanitizePrice(o.originalPrice),
        优惠明细: safeString(o.discounts),
        实付金额: sanitizePrice(o.finalPrice),
        签名: safeString(o.signature).trim(),
      },
    });
  }
  if (valid.length === 0) {
    return NextResponse.json({ success: true, syncedKeys: [], created: 0, skipped: 0 });
  }

  const syncedKeys: string[] = [];

  try {
    // 2. 查询飞书里已经存在的记录（按订单号），得到已存在的 "订单号|时间" 集合
    const existing = new Set<string>();
    const existingNoTime = new Set<string>(); // 读不到时间的记录：只按订单号判断
    const uniqueIds = Array.from(new Set(valid.map(v => v.orderId)));
    for (let i = 0; i < uniqueIds.length; i += SEARCH_CHUNK) {
      const ids = uniqueIds.slice(i, i + SEARCH_CHUNK);
      let pageToken: string | undefined;
      do {
        const res = await client.bitable.appTableRecord.search({
          path: { app_token: APP_TOKEN, table_id: TABLE_ID_ORDERS },
          params: { page_size: 500, ...(pageToken ? { page_token: pageToken } : {}) },
          data: {
            field_names: ['订单号', '下单时间'],
            filter: {
              conjunction: 'or',
              conditions: ids.map(id => ({ field_name: '订单号', operator: 'is' as const, value: [id] })),
            },
            automatic_fields: false,
          },
        });
        if (res.code !== 0) throw new Error(`Feishu Error (${res.code}): ${res.msg} [search]`);
        for (const item of res.data?.items || []) {
          const f = (item.fields || {}) as Record<string, unknown>;
          const id = readText(f['订单号']);
          const ts = readTime(f['下单时间']);
          if (id && ts !== null) existing.add(keyOf(id, ts));
          else if (id) existingNoTime.add(id);
        }
        pageToken = res.data?.has_more ? res.data.page_token : undefined;
      } while (pageToken);
    }

    // 飞书日期字段可能丢掉毫秒，允许 1 秒误差
    const isExisting = (v: { orderId: string; ts: number }) =>
      existing.has(keyOf(v.orderId, v.ts)) ||
      existingNoTime.has(v.orderId) ||
      Array.from(existing).some(k => {
        const [id, t] = k.split('|');
        return id === v.orderId && Math.abs(Number(t) - v.ts) < 1000;
      });

    const toCreate: typeof valid = [];
    const seen = new Set<string>();
    for (const v of valid) {
      if (seen.has(v.key)) continue; // 同一批里重复的只写一次
      seen.add(v.key);
      if (isExisting(v)) syncedKeys.push(v.key);
      else toCreate.push(v);
    }
    const skipped = syncedKeys.length;

    // 3. 只新增真正缺失的
    for (let i = 0; i < toCreate.length; i += CREATE_CHUNK) {
      const chunk = toCreate.slice(i, i + CREATE_CHUNK);
      const res = await client.bitable.appTableRecord.batchCreate({
        path: { app_token: APP_TOKEN, table_id: TABLE_ID_ORDERS },
        data: { records: chunk.map(c => ({ fields: c.fields })) },
      });
      if (res.code !== 0) throw new Error(`Feishu Error (${res.code}): ${res.msg}`);
      syncedKeys.push(...chunk.map(c => c.key));
    }

    return NextResponse.json({ success: true, syncedKeys, created: toCreate.length, skipped });
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string; response?: { status?: number; data?: { msg?: string } } };
    console.error('❌ Feishu order sync failed:', e);
    let message = 'Failed to sync orders';
    if (e?.code === 'ECONNRESET' || e?.code === 'ETIMEDOUT') message = 'Network timeout connecting to Feishu';
    else if (e?.response) message = `Feishu API Error: ${e.response.status} ${e.response.data?.msg ?? ''}`.trim();
    else if (e?.message) message = e.message;
    // 已经成功的部分也返回，前端会把这部分标记为已同步
    return NextResponse.json({ success: false, error: message, syncedKeys }, { status: 502 });
  }
}
