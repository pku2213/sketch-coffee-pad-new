import { NextResponse } from 'next/server';

// 每次都实时读取飞书，不要被缓存成静态结果
export const dynamic = 'force-dynamic';
import { client } from '@/lib/feishu';

const TABLE_ID_DUTY = process.env.FEISHU_TABLE_ID_DUTY;
const APP_TOKEN = process.env.FEISHU_APP_TOKEN;

/**
 * GET /api/duty
 * Fetches duty checklist from Feishu Bitable.
 * Transforms flat records back into structured format for frontend:
 * {
 *   MORNING: [{ cat: '...', items: ['...'] }],
 *   EVENING: [{ cat: '...', items: ['...'] }],
 *   DEEP_CLEAN: [{ cat: '...', items: ['...'] }]
 * }
 */
export async function GET() {
  if (!APP_TOKEN || !TABLE_ID_DUTY) {
    return NextResponse.json({ error: 'Feishu config missing' }, { status: 500 });
  }

  try {
    const response = await client.bitable.appTableRecord.list({
      path: {
        app_token: APP_TOKEN,
        table_id: TABLE_ID_DUTY,
      },
      params: {
        page_size: 500, // Fetch all tasks
        sort: JSON.stringify(["任务ID ASC"]), // Sort by ID ascending (smallest ID first)
      },
    });

    if (!response.data?.items) {
      return NextResponse.json({ 
        MORNING: [], 
        EVENING: [], 
        DEEP_CLEAN: [] 
      });
    }

    // Grouping Logic
    const groupedData: Record<string, Record<string, string[]>> = {
      MORNING: {},
      EVENING: {},
      DEEP_CLEAN: {}
    };

    // Helper to map Feishu type string to our key
    const mapType = (typeStr: string): 'MORNING' | 'EVENING' | 'DEEP_CLEAN' | null => {
      const upper = typeStr?.toUpperCase() || '';
      if (upper.includes('MORNING') || upper.includes('早班')) return 'MORNING';
      if (upper.includes('EVENING') || upper.includes('晚班')) return 'EVENING';
      if (upper.includes('DEEP') || upper.includes('大扫除')) return 'DEEP_CLEAN';
      return null;
    };

    for (const record of response.data.items) {
      const fields = record.fields;
      const type = mapType(String(fields['类型']));
      const category = String(fields['分类']);
      const item = String(fields['具体项目']);

      if (type && category && item) {
        if (!groupedData[type][category]) {
          groupedData[type][category] = [];
        }
        groupedData[type][category].push(item);
      }
    }

    // Convert to array structure: [{ cat: '...', items: [...] }]
    const result = {
      MORNING: Object.entries(groupedData.MORNING).map(([cat, items]) => ({ cat, items })),
      EVENING: Object.entries(groupedData.EVENING).map(([cat, items]) => ({ cat, items })),
      DEEP_CLEAN: Object.entries(groupedData.DEEP_CLEAN).map(([cat, items]) => ({ cat, items })),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Failed to fetch duty list:", error);
    return NextResponse.json({ error: 'Failed to fetch duties' }, { status: 500 });
  }
}
