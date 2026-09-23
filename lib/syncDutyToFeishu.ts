import { DAILY_CHECKLIST, DEEP_CLEAN_LIST } from '@/constants';
import { client } from './feishu';

/**
 * Sync Local Duty Data to Feishu Bitable
 * This script migrates our centralized local duty constants to Feishu.
 */
async function syncDutyToFeishu() {
  console.log("🚀 开始同步打卡任务数据到飞书...");
  
  const APP_TOKEN = process.env.FEISHU_APP_TOKEN;
  const TABLE_ID_DUTY = process.env.FEISHU_TABLE_ID_DUTY;

  if (!APP_TOKEN || !TABLE_ID_DUTY) {
    console.error("❌ 错误: FEISHU_APP_TOKEN 或 FEISHU_TABLE_ID_DUTY 未在环境变量中定义。");
    return;
  }

  // [v7] 安全锁：这个脚本会先清空飞书整张打卡任务表，再用代码里的默认数据重写。
  //      必须显式设置 CONFIRM_WIPE=yes 才会执行，防止误运行把飞书里改过的数据覆盖掉。
  if (process.env.CONFIRM_WIPE !== 'yes') {
    console.error("⛔ 已阻止：此脚本会清空飞书打卡任务表。确认要执行请加环境变量 CONFIRM_WIPE=yes");
    return;
  }

  // 0. 清空现有数据
  console.log("🧹 正在清空现有任务数据...");
  try {
    let hasMore = true;
    let pageToken = '';
    
    while (hasMore) {
      const listResponse = await client.bitable.appTableRecord.list({
        path: {
          app_token: APP_TOKEN,
          table_id: TABLE_ID_DUTY,
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
            table_id: TABLE_ID_DUTY,
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

  // 1. 数据转换
  const records = [];
  let idCounter = 1;

  // Process MORNING
  for (const group of DAILY_CHECKLIST.MORNING) {
    for (const item of group.items) {
      records.push({
        fields: {
          "任务ID": String(idCounter++),
          "类型": "MORNING",
          "分类": group.cat,
          "具体项目": item,
        }
      });
    }
  }

  // Process EVENING
  for (const group of DAILY_CHECKLIST.EVENING) {
    for (const item of group.items) {
      records.push({
        fields: {
          "任务ID": String(idCounter++),
          "类型": "EVENING",
          "分类": group.cat,
          "具体项目": item,
        }
      });
    }
  }

  // Process DEEP_CLEAN
  for (const group of DEEP_CLEAN_LIST) {
    for (const item of group.items) {
      records.push({
        fields: {
          "任务ID": String(idCounter++),
          "类型": "DEEP_CLEAN",
          "分类": group.cat,
          "具体项目": item,
        }
      });
    }
  }

  try {
    const total = records.length;
    console.log(`📦 准备上传 ${total} 条任务数据...`);
    
    const response = await client.bitable.appTableRecord.batchCreate({
      path: {
        app_token: APP_TOKEN,
        table_id: TABLE_ID_DUTY,
      },
      data: {
        records: records,
      },
    });

    if (response.code === 0) {
      console.log("✅ 任务数据同步成功！");
    } else {
      console.error("❌ 同步失败:", response.msg);
      console.error("完整响应:", JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error("❌ 同步过程中发生错误:", error);
  }
}

// 立即运行同步逻辑
syncDutyToFeishu();
