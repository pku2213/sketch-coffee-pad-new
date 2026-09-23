import { NextResponse } from 'next/server';

// 每次都实时读取飞书，不要被缓存成静态结果
export const dynamic = 'force-dynamic';
import { getMenuFromFeishu } from '@/lib/feishu';

export async function GET() {
  try {
    const menu = await getMenuFromFeishu();
    return NextResponse.json(menu);
  } catch (error) {
    console.error("Failed to fetch menu from Feishu API route:", error);
    return NextResponse.json(
      { error: 'Failed to fetch menu' },
      { status: 500 }
    );
  }
}
