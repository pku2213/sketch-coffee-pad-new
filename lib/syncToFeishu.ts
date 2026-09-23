import { DEFAULT_MENU } from '@/constants';
import { client } from './feishu';

/**
 * [v5.0 NEW] Sync Local Menu to Feishu Bitable
 * This script migrates our centralized local constants data to Feishu.
 */
async function syncToFeishu() {
  console.log("🚀 开始同步菜单数据到飞书...");
  
  const APP_TOKEN = process.env.FEISHU_APP_TOKEN;
  const TABLE_ID_MENU = process.env.FEISHU_TABLE_ID_MENU;

  if (!APP_TOKEN || !TABLE_ID_MENU) {
    console.error("❌ 错误: FEISHU_APP_TOKEN 或 FEISHU_TABLE_ID_MENU 未在环境变量中定义。");
    return;
  }

  // [v7] 安全锁：这个脚本会先清空飞书整张菜单表，再用代码里的默认数据重写。
  //      必须显式设置 CONFIRM_WIPE=yes 才会执行，防止误运行把飞书里改过的数据覆盖掉。
  if (process.env.CONFIRM_WIPE !== 'yes') {
    console.error("⛔ 已阻止：此脚本会清空飞书菜单表。确认要执行请加环境变量 CONFIRM_WIPE=yes");
    return;
  }

  // 0. 清空现有数据
  console.log("🧹 正在清空现有数据...");
  try {
    let hasMore = true;
    let pageToken = '';
    
    while (hasMore) {
      const listResponse = await client.bitable.appTableRecord.list({
        path: {
          app_token: APP_TOKEN,
          table_id: TABLE_ID_MENU,
        },
        params: {
          page_size: 500,
          page_token: pageToken,
        },
      });

      if (listResponse.data?.items && listResponse.data.items.length > 0) {
        const recordIds = listResponse.data.items.map(record => record.record_id!);
        console.log(`正在删除 ${recordIds.length} 条旧记录...`);
        
        await client.bitable.appTableRecord.batchDelete({
          path: {
            app_token: APP_TOKEN,
            table_id: TABLE_ID_MENU,
          },
          data: {
            records: recordIds,
          },
        });
        
        hasMore = listResponse.data.has_more || false;
        pageToken = listResponse.data.page_token || '';
      } else {
        hasMore = false;
      }
    }
    console.log("✅ 旧数据清空完成。");
  } catch (error) {
    console.error("❌ 清空数据失败:", error);
    return;
  }

  // 1. 数据转换：按照用户要求的映射逻辑
  const records = DEFAULT_MENU.map(item => {
    // Helper to safely stringify once
    const safeStringify = (val: any) => {
      if (!val) return '';
      if (typeof val === 'string') return val; // Already a string, don't stringify again
      return JSON.stringify(val);
    };

    return {
      fields: {
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category,
        subCategory: item.subCategory || '',
        // id, name, price, category, subCategory, rules 保持不变 (如果是对象则转为字符串以便飞书存储)
        rules: safeStringify(item.options?.rules),
        // 将 options.temps 转回 JSON 字符串存入飞书的 temps 列
        temps: safeStringify(item.options?.temps),
        // 将 instructions 转回 JSON 字符串存入飞书的 instructions 列
        instructions: safeStringify(item.instructions),
      }
    };
  });

  try {
    const total = records.length;
    console.log(`📦 准备上传 ${total} 条数据...`);

    // 2. 批量写入：使用 client.bitable.appTableRecord.batchCreate 接口一次性推送
    const response = await client.bitable.appTableRecord.batchCreate({
      path: {
        app_token: APP_TOKEN,
        table_id: TABLE_ID_MENU,
      },
      data: {
        records: records,
      },
    });

    if (response.code === 0) {
      console.log("✅ 搬家成功！所有数据已同步到飞书。");
    } else {
      console.error("❌ 同步失败:", response.msg);
      console.error("完整响应:", JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error("❌ 同步过程中发生错误:", error);
  }
}

// 立即运行同步逻辑
syncToFeishu();
