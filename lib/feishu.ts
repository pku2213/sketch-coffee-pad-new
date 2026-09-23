import path from 'path';
import dotenv from 'dotenv';
import * as Lark from '@larksuiteoapi/node-sdk';

import type { MenuItem } from '../types';

// 强制指定读取根目录下的 .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// credentials defined in .env.local
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const APP_TOKEN = process.env.FEISHU_APP_TOKEN;
const TABLE_ID_MENU = process.env.FEISHU_TABLE_ID_MENU;

if (!APP_ID || !APP_SECRET || !APP_TOKEN || !TABLE_ID_MENU) {
  console.warn("Feishu credentials missing in .env.local. Integration may fail.");
}

// Initialize Feishu Client
export const client = new Lark.Client({
  appId: APP_ID || '',
  appSecret: APP_SECRET || '',
});

/**
 * Helper to safely parse JSON strings, including handling double-encoded JSON.
 * e.g. "[\"冷\"]" -> ["冷"]
 */
const safeParse = (value: any) => {
  if (!value) return undefined;
  
  // If it's already an object/array, return it
  if (typeof value !== 'string') return value;

  try {
    const parsed = JSON.parse(value);
    
    // Check for double encoding (e.g., array containing a stringified array)
    if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'string') {
      try {
        // Attempt to parse the inner string
        const inner = JSON.parse(parsed[0]);
        // Only return inner if it looks valid (e.g. array or object)
        if (typeof inner === 'object' && inner !== null) {
          return inner;
        }
      } catch (e) {
        // Inner parse failed, just return the outer parsed value
      }
    }
    
    return parsed;
  } catch (e) {
    // If parse fails, return original value (maybe it's just a plain string)
    console.warn("JSON parse failed for value:", value, e);
    return value; 
  }
};

/**
 * getMenuFromFeishu
 * [v5.0 NEW] Fetches all menu items from Feishu Bitable and parses them.
 */
export async function getMenuFromFeishu(): Promise<MenuItem[]> {
  console.log("--- Fetching Full Menu from Feishu ---");
  
  try {
    // [v7] 支持分页，菜单超过 500 条也不会漏
    const records: { record_id?: string; fields: Record<string, unknown> }[] = [];
    let pageToken: string | undefined;
    do {
      const response = await client.bitable.appTableRecord.list({
        path: {
          app_token: APP_TOKEN || '',
          table_id: TABLE_ID_MENU || '',
        },
        params: {
          page_size: 500,
          ...(pageToken ? { page_token: pageToken } : {}),
        },
      });
      if (response.code !== 0 || !response.data) {
        throw new Error(`Failed to retrieve items from Feishu table (${response.code}): ${response.msg}`);
      }
      records.push(...((response.data.items || []) as typeof records));
      pageToken = response.data.has_more ? response.data.page_token : undefined;
    } while (pageToken);

    return records
      .filter(record => record.fields && record.fields.name)
      .map(record => {
        const fields: any = record.fields;
        return {
          id: String(fields.id || record.record_id),
          name: String(fields.name),
          price: Number(fields.price) || 0,
          category: fields.category,
          subCategory: fields.subCategory || undefined,
          options: {
            temps: safeParse(fields.temps) || [],
            rules: safeParse(fields.rules),
          },
          instructions: safeParse(fields.instructions),
        };
      });

  } catch (error) {
    console.error("Error fetching menu from Feishu:", error);
    throw error; // Rethrow to allow caller to handle fallback
  }
}

/**
 * testFetch
 * Reads the first record from the Menu table and parses it into local MenuItem structure.
 */
export async function testFetch() {
  console.log("--- Starting Feishu Menu Fetch Test ---");
  
  try {
    const response = await client.bitable.appTableRecord.list({
      path: {
        app_token: APP_TOKEN || '',
        table_id: TABLE_ID_MENU || '',
      },
      params: {
        page_size: 1,
      },
    });

    if (!response.data?.items || response.data.items.length === 0) {
      console.log("No records found in Feishu table.");
      return;
    }

    const record = response.data.items[0];
    const fields: any = record.fields;

    // Mapping Feishu fields to Local MenuItem structure
    const parsedData = {
      id: fields.id || record.record_id,
      name: fields.name,
      price: fields.price,
      category: fields.category,
      subCategory: fields.subCategory || undefined,
      options: {
        // Parse temps (assuming it's a Multi-select or Checkbox in Feishu)
        temps: Array.isArray(fields.temps) ? fields.temps : (fields.temps ? [fields.temps] : []),
        // Read rules as string
        rules: fields.rules || '',
      },
      // Parse instructions JSON string
      instructions: fields.instructions ? JSON.parse(fields.instructions) : undefined,
    };

    console.log("Successfully parsed Feishu Record:");
    console.log(JSON.stringify(parsedData, null, 2));
    
    return parsedData;

  } catch (error) {
    console.error("Error fetching from Feishu:", error);
  }
}

// Execute test
// testFetch();
