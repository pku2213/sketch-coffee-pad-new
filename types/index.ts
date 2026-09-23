
export enum ShiftType {
  MORNING = '早班',
  EVENING = '晚班',
  JOINT = '大扫除(双人)'
}

export enum TaskCategory {
  DAILY = '日常打卡',
  DEEP_CLEAN = '每周大扫除'
}

export interface MenuItem {
  id: string;
  name: string;
  englishName?: string;
  price: number;
  category: string;
  subCategory?: string;
  image?: string;
  options?: {
    temps?: string[];
    rules?: Record<string, any>;
  };
  // 制作流程数据结构
  instructions?: {
    general?: string[]; // 通用步骤
    hot?: string[];    // 热饮步骤
    cold?: string[];   // 冷饮步骤
    tips?: string[];   // 备注/小贴士
  };
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  finalPrice: number;
  quantity: number;
  temp?: string;
  extraEspresso?: boolean; 
  isDecaf?: boolean;
  milkOption?: 'normal' | 'coconut' | 'oat'; 
  selectedBenefits?: string[]; // [v3.1] Updated to support multiple benefits (byo_cup, store_cup, barista, duty, byo_beans, byo_milk)
  manualAdjustment?: number;
  manualReason?: string;
  note?: string;

  /* [v3.0 NEW] 账本追踪属性 */
  isPaid?: boolean;      // 已支付状态
  isFinished?: boolean;  // 已制作状态
  isWashed?: boolean;    // 已洗杯状态
  signature?: string;    // 手写签名 (Base64图片)
  createdAt: number;     // 订单创建时间戳 (用于财务报表)
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  isPaid: boolean;
  isFinished: boolean;
  createdAt: number;
}
