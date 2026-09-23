
import { MenuItem } from '../types';

const RULES = {
  JUICE_TEA: { perks: ['cup', 'barista', 'duty'] as any },
  NON_COFF_LATTE: { hasMilkBeanSwaps: true, perks: ['milk', 'cup', 'barista', 'duty'] as any },
  AMERICANO: { hasDecaf: true, hasExtraEspresso: true, perks: ['beans', 'cup', 'barista', 'duty'] as any },
  LATTE_GENERAL: { hasDecaf: true, hasExtraEspresso: true, hasMilkBeanSwaps: true, perks: ['beans', 'milk', 'cup', 'barista', 'duty'] as any },
  CAPPUCCINO: { hasDecaf: true, perks: ['beans', 'barista', 'duty'] as any },
  DIRTY: { hasDecaf: true, hasExtraEspresso: true, hasMilkBeanSwaps: true, perks: ['beans', 'milk', 'cup', 'barista', 'duty'] as any },
  HAND_POUR: { perks: ['beans', 'barista', 'duty'] as any },
  SPECIALTY: { hasDecaf: true, hasExtraEspresso: true, hasMilkBeanSwaps: true, perks: ['beans', 'milk', 'cup', 'barista', 'duty'] as any },
  ALCOHOL: { perks: ['cup', 'barista', 'duty'] as any },
  SNACK: { perks: ['barista', 'duty'] as any },
};

export const DAILY_CHECKLIST = {
  MORNING: [
    { cat: '开机打水', items: ['打开全、半自动机', '打开制冰机', '接水（热水凉水）', '将消毒柜中杯子转移到大杯柜'] },
    { cat: '清点原料', items: ['咖啡豆 ≥ 2 袋、牛奶 ≥ 3 盒', '果汁（苹果汁、橙汁、葡萄汁等） ≥ 1 盒', '不够的话在群里 @nina 补货'] },
    { cat: '补料', items: ['热饮杯两摞、冷饮杯一摞', '杯盖一摞、粗细吸管', '确保机器里有水', '垃圾桶套袋'] },
    { cat: '最后', items: ['拍照发群里！'] }
  ],
  EVENING: [
    { cat: '吧台区清洁', items: ['清洁咖啡粉碗', '倒空咖啡机水槽'] },
    { cat: '全店清洁整理', items: ['收拾并整理冰箱', '清洁台面、地面', '清空待洗物品', '带走垃圾桶垃圾'] },
    { cat: '安全检查', items: ['关闭三台机器电源：半自动机、全自动机、制冰机', '关闭水壶电源'] },
    { cat: '消毒柜消毒', items: ['将桌面的全部杯碗放在消毒柜下层，开启消毒'] },
    { cat: '最后', items: ['拍照发群里！'] }
  ]
};

export const DEEP_CLEAN_LIST = [
  { cat: '全自动咖啡机', items: ['清理咖啡渣槽、接水槽', '刷扫机器内部咖啡残渣'] },
  { cat: '半自动咖啡机', items: ['清理接水槽', '擦拭设备表面', '用专用刷刷萃取头', '两个粉碗抠出来分别清洗'] },
  { cat: '其他器具清洗&擦拭', items: ['制冰机（注意清洁接水篮）', '消毒柜', '大杯柜', '空气炸锅', '电子秤', '半自动旁边的粉渣盒', '电动磨豆机', '刀子勺子置物架拆下来清洗', '粉渣桶放到垃圾桶里扔掉'] },
  { cat: '冰箱', items: ['整理公用冰箱', '断舍离私人冰箱'] },
  { cat: '拍照发群', items: ['各个机器的图片', 'Check List 完成图'] }
];

export const INVENTORY_ITEMS = [
  '咖啡豆', '纯牛奶', '燕麦奶', '椰奶', '黄油牛乳', '气泡水', '北冰洋汽水', '葡萄汁', '橙汁', '苹果汁', '菠萝汁', '柚子汁', '抹茶粉', '焙茶粉', '可可粉', '红茶', '绿茶', '路易波士茶', '糖浆', '蜂蜜柚子酱', '巧克力酱', '桃花酱', '桂花酱', '红枣酱', '黄杏酱', '花生酱', '南瓜酱', '淡奶油', '牛角包', '瑞士卷', '麻薯', '薯条', '巴斯克', '冷饮杯', '热饮杯', '杯盖', '打包袋'
];

export const DEFAULT_MENU: MenuItem[] = [
  // --- 美味小食和其他 ---
  { id: 's1', name: '牛角包', price: 5, category: '美味小食和其他', options: { rules: RULES.SNACK }, instructions: { general: ["1. 垫大油纸，撕开牛角包包装后放入空气炸锅", "2. 180℃，5min", "3. 询问顾客是否要加酱（巧克力酱、炼乳），装在船型纸盒中出品"] } },
  { id: 's2', name: '薯条', price: 5, category: '美味小食和其他', options: { rules: RULES.SNACK }, instructions: { general: ["1. 垫大油纸，倒入100g薯条", "2. 190℃，20min；中途翻面", "3. 询问顾客是否需要番茄酱，装在船型纸盒中出品"] } },
  { id: 's3', name: '鸡翅中', price: 5, category: '美味小食和其他', options: { rules: RULES.SNACK }, instructions: { general: ["1. 垫小油纸，放入一个鸡翅中", "2. 200℃，15min", "3. 装在船型纸盒中出品"] } },
  { id: 's4', name: '吐司', price: 3, category: '美味小食和其他', options: { rules: RULES.SNACK }, instructions: { general: ["1. 询问顾客是否需要加热，不加热直接卖就行", "2. 加热：将吐司放入面包机，旋钮固定在黑笔刻度处，拨下拨片；拨片跳起就好了"] } },
  { id: 's5', name: '一个杯子', price: 1, category: '美味小食和其他' },
  { id: 's6', name: '手工费', price: 1, category: '美味小食和其他' },

  // --- 无咖啡因 ---
  { id: 'j1', name: '苹果汁', price: 7, category: '无咖啡因', subCategory: '果汁', options: { temps: ['冷'], rules: RULES.JUICE_TEA }, instructions: { cold: ["1. 取冷饮杯倒入苹果汁，出品"] } },
  { id: 'j2', name: '橙汁', price: 7, category: '无咖啡因', subCategory: '果汁', options: { temps: ['冷'], rules: RULES.JUICE_TEA }, instructions: { cold: ["1. 取冷饮杯倒入橙汁，出品"] } },
  { id: 'j3', name: '椰子水', price: 7, category: '无咖啡因', subCategory: '果汁', options: { temps: ['冷'], rules: RULES.JUICE_TEA }, instructions: { cold: ["1. 取冷饮杯倒入椰子水，出品"] } },
  { id: 'j4', name: '菠萝汁', price: 7, category: '无咖啡因', subCategory: '果汁', options: { temps: ['冷'], rules: RULES.JUICE_TEA }, instructions: { cold: ["1. 取冷饮杯倒入菠萝汁，出品"] } },
  { id: 'j5', name: '葡萄汁', price: 7, category: '无咖啡因', subCategory: '果汁', options: { temps: ['冷'], rules: RULES.JUICE_TEA }, instructions: { cold: ["1. 取冷饮杯倒入葡萄汁，出品"] } },
  { id: 'j6', name: '果汁气泡水', price: 9, category: '无咖啡因', subCategory: '果汁', options: { temps: ['冷'], rules: RULES.JUICE_TEA }, instructions: { cold: ["1. 取冷饮杯，加适量冰", "2. 加入对应果汁和气泡水（1：1），盖盖出品"] } },
  { id: 't1', name: '红茶/绿茶', price: 7, category: '无咖啡因', subCategory: '茶', options: { temps: ['热'], rules: RULES.JUICE_TEA }, instructions: { hot: ["1. 取热饮杯，加入相应茶包", "2. 热水注满"] } },
  { id: 't2', name: '蜂蜜柚子茶', price: 10, category: '无咖啡因', subCategory: '茶', options: { temps: ['热'], rules: RULES.JUICE_TEA }, instructions: { hot: ["1. 取热饮杯，放入红茶茶包，加少量开水泡茶（1min）", "2. 加入蜂蜜柚子酱（25-30g），搅拌均匀", "3. 补满热水/常温水，出品"] } },
  { id: 't3', name: '抹茶拿铁', price: 12, category: '无咖啡因', subCategory: '茶', options: { temps: ['热', '冷'], rules: RULES.NON_COFF_LATTE }, instructions: { hot: ["1. 取热饮杯，加入抹茶粉(3-5g)、蔗糖糖浆(10g)、少量热水，搅匀", "2. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，加入抹茶粉(3-5g)、蔗糖糖浆(10g)、少量热水，搅匀", "2. 加入冰牛奶(200g)，盖盖出品"] } },
  { id: 't4', name: '路易波士奶茶', price: 14, category: '无咖啡因', subCategory: '茶', options: { temps: ['热', '冷'], rules: RULES.NON_COFF_LATTE }, instructions: { hot: ["1. 取热饮杯", "2. 萃取14g路易波士茶粉，约50s", "3. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯", "2. 萃取14g路易波士茶粉，约50s", "3. 加入冰牛奶(200g)，盖盖出品"] } },
  { id: 'm1', name: '蒸汽奶', price: 7, category: '无咖啡因', subCategory: '奶', options: { temps: ['热'], rules: RULES.NON_COFF_LATTE }, instructions: { hot: ["1. 打发200g左右牛奶", "2. 倒入热饮杯，出品"] } },
  { id: 'm2', name: '南瓜燕麦奶', price: 10, category: '无咖啡因', subCategory: '奶', options: { temps: ['热', '冷'], rules: { perks: ['cup', 'barista', 'duty'] } }, instructions: { hot: ["1. 取热饮杯，加入南瓜酱(30g)", "2. 加入打发的燕麦奶(200g)，搅匀"], cold: ["1. 取冷饮杯，加入南瓜酱(30g)", "2. 加入燕麦奶(200g)，搅匀"] } },
  { id: 'm3', name: '热可可', price: 12, category: '无咖啡因', subCategory: '奶', options: { temps: ['热'], rules: RULES.NON_COFF_LATTE }, instructions: { hot: ["1. 取热饮杯，加入可可粉(5-8g)、巧克力酱(15g)、少量热水，搅匀", "2. 加入打发的牛奶(200g)，盖盖出品"] } },

  // --- 美式系列 ---
  { id: 'a1', name: '意式浓缩', price: 5, category: '美式系列', subCategory: '纯咖', options: { temps: ['热'], rules: RULES.AMERICANO } },
  { id: 'a2', name: '普通美式', price: 8, category: '美式系列', subCategory: '纯咖', options: { temps: ['热', '冷'], rules: RULES.AMERICANO }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 热水注满，盖盖出品"], cold: ["1. 取冷饮杯，加入适量冰", "2. 接一份浓缩", "3. 冷水注满，盖盖出品"] } },
  { id: 'af1', name: '葡萄美式', price: 10, category: '美式系列', subCategory: '果汁美式', options: { temps: ['冷'], rules: RULES.AMERICANO }, instructions: { cold: ["1. 取冷饮杯，加适量冰，接一份浓缩", "2. 葡萄汁注满，盖盖出品"] } },
  { id: 'af2', name: '菠萝美式', price: 10, category: '美式系列', subCategory: '果汁美式', options: { temps: ['冷'], rules: RULES.AMERICANO }, instructions: { cold: ["1. 取冷饮杯，加适量冰，接一份浓缩", "2. 菠萝汁注满，盖盖出品"] } },
  { id: 'af3', name: '柚C美式', price: 10, category: '美式系列', subCategory: '果汁美式', options: { temps: ['冷'], rules: RULES.AMERICANO }, instructions: { cold: ["1. 取冷饮杯，加适量冰，接一份浓缩", "2. 柚子汁注满，盖盖出品"] } },
  { id: 'af4', name: '橙C美式', price: 10, category: '美式系列', subCategory: '果汁美式', options: { temps: ['冷'], rules: RULES.AMERICANO }, instructions: { cold: ["1. 取冷饮杯，加适量冰，接一份浓缩", "2. 橙汁注满，盖盖出品"] } },
  { id: 'af5', name: '北冰洋美式', price: 14, category: '美式系列', subCategory: '果汁美式', options: { temps: ['冷'], rules: RULES.AMERICANO }, instructions: { cold: ["1. 取冷饮杯，加适量冰，接一份浓缩", "2. 北冰洋注满，盖盖出品"] } },
  { id: 'as1', name: '橙C气泡美式', price: 12, category: '美式系列', subCategory: '果汁气泡美式', options: { temps: ['冷'], rules: RULES.AMERICANO }, instructions: { cold: ["1. 取冷饮杯，加适量冰，接一份浓缩", "2. 加入橙汁和气泡水（1：1），盖盖出品"], tips: ["！气泡类美式不能完全去冰，不然高温浓缩会使气泡水扑出"] } },
  { id: 'as2', name: '菠萝柚气泡美式', price: 12, category: '美式系列', subCategory: '果汁气泡美式', options: { temps: ['冷'], rules: RULES.AMERICANO }, instructions: { cold: ["1. 取冷饮杯，加适量冰，接一份浓缩", "2. 加入菠萝柚和气泡水（1：1），盖盖出品"], tips: ["！气泡类美式不能完全去冰，不然高温浓缩会使气泡水扑出"] } },
  { id: 'as3', name: '冰葡气泡美式', price: 12, category: '美式系列', subCategory: '果汁气泡美式', options: { temps: ['冷'], rules: RULES.AMERICANO }, instructions: { cold: ["1. 取冷饮杯，加适量冰，接一份浓缩", "2. 加入葡萄汁和气泡水（1：1），盖盖出品"], tips: ["！气泡类美式不能完全去冰，不然高温浓缩会使气泡水扑出"] } },
  { id: 'as4', name: '黄杏气泡美式', price: 12, category: '美式系列', subCategory: '果汁气泡美式', options: { temps: ['冷'], rules: RULES.AMERICANO }, instructions: { cold: ["1. 取冷饮杯，加适量冰，接一份浓缩", "2. 加入黄杏酱(30g)和气泡水（1：1），搅一搅，盖盖出品"], tips: ["！气泡类美式不能完全去冰，不然高温浓缩会使气泡水扑出"] } },
  { id: 'ah1', name: '手冲', price: 24, category: '美式系列', subCategory: '纯咖', options: { temps: ['热'], rules: RULES.HAND_POUR } },

  // --- 拿铁系列 ---
  { id: 'l1', name: '拿铁', price: 10, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，加入适量冰", "2. 接一份浓缩", "3. 牛奶注满，盖盖出品"], tips: ["ps: 如果客人换燕麦奶/椰乳，将牛奶换成对应乳品即可"] } },
  { id: 'l2', name: '卡布奇诺', price: 10, category: '拿铁系列', options: { temps: ['热'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入打发的牛奶(200g)（奶泡需要更厚更烫），盖盖出品"] } },
  { id: 'l3', name: '榛果拿铁', price: 12, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入榛果糖浆(15g)，搅拌均匀", "3. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，接一份浓缩", "2. 加入榛果糖浆(15g)，搅拌均匀", "3. 加入适量冰", "4. 牛奶注满，盖盖出品"], tips: ["冷饮！先将浓缩和糖浆搅拌均匀再加冰", "ps: 如果客人换燕麦奶/椰乳，将牛奶换成对应乳品即可"] } },
  { id: 'l4', name: '香草拿铁', price: 12, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入香草糖浆(15g)，搅拌均匀", "3. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，接一份浓缩", "2. 加入香草糖浆(15g)，搅拌均匀", "3. 加入适量冰", "4. 牛奶注满，盖盖出品"], tips: ["冷饮！先将浓缩和糖浆搅拌均匀再加冰"] } },
  { id: 'l5', name: '桃花拿铁', price: 12, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入桃花糖浆(15g)，搅拌均匀", "3. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，接一份浓缩", "2. 加入桃花糖浆(15g)，搅拌均匀", "3. 加入适量冰", "4. 牛奶注满，盖盖出品"] } },
  { id: 'l6', name: '焦糖拿铁', price: 12, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入焦糖糖浆(15g)，搅拌均匀", "3. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，接一份浓缩", "2. 加入焦糖糖浆(15g)，搅拌均匀", "3. 加入适量冰", "4. 牛奶注满，盖盖出品"] } },
  { id: 'l7', name: '薄荷拿铁', price: 12, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入薄荷糖浆(15g)，搅拌均匀", "3. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，接一份浓缩", "2. 加入薄荷糖浆(15g)，搅拌均匀", "3. 加入适量冰", "4. 牛奶注满，盖盖出品"] } },
  { id: 'l8', name: '玫瑰拿铁', price: 12, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入玫瑰糖浆(15g)，搅拌均匀", "3. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，接一份浓缩", "2. 加入玫瑰糖浆(15g)，搅拌均匀", "3. 加入适量冰", "4. 牛奶注满，盖盖出品"] } },
  { id: 'l9', name: '爆米花拿铁', price: 12, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入爆米花糖浆(15g)，搅拌均匀", "3. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，接一份浓缩", "2. 加入爆米花糖浆(15g)，搅拌均匀", "3. 加入适量冰", "4. 牛奶注满，盖盖出品"] } },
  { id: 'l10', name: '生椰拿铁', price: 12, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入打发的椰奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，加入适量冰，接一份浓缩", "2. 加入椰奶(200g)，盖盖出品"] } },
  { id: 'l11', name: '可可拿铁', price: 14, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，倒入巧克力酱(15g)，接一份浓缩，搅拌均匀", "2. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，倒入巧克力酱(15g)，接一份浓缩，搅拌均匀", "2. 加入适量冰块", "3. 加入冰牛奶(200g)，盖盖出品"] } },
  { id: 'l12', name: '桂花拿铁', price: 12, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入香草糖浆(15g)，搅拌均匀", "3. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，接一份浓缩", "2. 加入香草糖浆(15g)，搅拌均匀", "3. 加入适量冰", "4. 牛奶注满，盖盖出品"] } },
  { id: 'l13', name: '红枣拿铁', price: 14, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩，加入红枣浓浆(10g)，搅拌均匀", "2. 加入打发的牛奶(200g)"], cold: ["1. 取冷饮杯，接一份浓缩，加入红枣浓浆(10g)，搅拌均匀", "2. 加入适量冰块", "3. 加入冰牛奶(200g)"], tips: ["红枣偏甜，用燕麦奶可能会导致口感变化"] } },
  { id: 'l14', name: '花生拿铁', price: 14, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入花生酱(15g)和蔗糖糖浆(5g)，搅拌均匀", "3. 加入打发的牛奶(200g)", "4. 撒可可粉进行装饰"] } },
  { id: 'l15', name: '薄巧拿铁', price: 14, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入薄荷糖浆(15g)和巧克力酱(15g)，搅拌均匀", "3. 加入打发的牛奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，加入薄荷糖浆(15g)", "2. 倒入少量牛奶，搅拌均匀", "3. 加适量冰", "4. 加入牛奶(200g)", "5. 15g巧克力酱和浓缩搅拌均匀后倒入杯中"] } },
  { id: 'l16', name: '黑巧生椰拿铁', price: 14, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入巧克力酱(15g)，搅拌均匀", "3. 加入打发的椰乳和牛奶(2：1)，盖盖出品"], cold: ["1. 取冷饮杯，少量巧克力酱挂壁", "2. 加冰", "3. 加入椰乳和牛奶(2：1)", "4. 15g巧克力酱和浓缩搅拌均匀倒入杯中"] } },
  { id: 'l17', name: '黑巧燕麦拿铁', price: 16, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入巧克力酱(15g)，搅拌均匀", "3. 加入打发的燕麦奶(200g)，盖盖出品"], cold: ["1. 取冷饮杯，少量巧克力酱挂壁", "2. 加冰", "3. 加入冰燕麦奶(200g)", "4. 15g巧克力酱和浓缩搅拌均匀倒入杯中"] } },
  { id: 'l18', name: '黄油厚乳拿铁', price: 16, category: '拿铁系列', options: { temps: ['热', '冷'], rules: RULES.LATTE_GENERAL }, instructions: { hot: ["1. 取热饮杯，接一份浓缩", "2. 加入打发后的黄油厚乳和牛奶（各100ml），盖盖出品"], cold: ["1. 取冷饮杯，加适量冰，接一份浓缩", "2. 加入黄油厚乳和牛奶（各100ml）"] } },
  { id: 'l19', name: 'Dirty', price: 18, category: '拿铁系列', options: { temps: ['冷'], rules: RULES.DIRTY }, instructions: { cold: ["1. 取冰杯（！并非冷饮杯，冰箱冷冻区存有dirty专用冰杯）", "2. 加入黄油厚乳和牛奶（各100ml）", "3. 速速加入一份浓缩咖啡（萃取时注意抬高玻璃杯实现分层）"], tips: ["提醒客人速速喝掉（40s内是最佳饮用时间）"] } },

  // --- 限定特调 ---
  { id: 'sp1', name: '玫瑰培茶拿铁', price: 16, category: '限定特调', options: { temps: ['热', '冷'], rules: RULES.NON_COFF_LATTE }, instructions: { hot: ["1. 取热饮杯，加入一袋焙茶粉(2g)、玫瑰糖浆(5g)和少量热水，搅匀", "2. 加入打发的牛奶(200g)"], cold: ["1. 取冷饮杯，加入一袋焙茶粉(2g)、玫瑰糖浆(5g)和少量热水，搅匀", "2. 加入冰牛奶(200g)"] } },
  { id: 'sp2', name: '苹果奶油派', price: 16, category: '限定特调', options: { temps: ['冷'], rules: RULES.SPECIALTY }, instructions: { cold: ["1. 取摇酒壶，加入苹果汁(100g)、蔗糖糖浆(8g)、奶油(30ml)、牛奶(70ml)、浓缩液(30g)和冰", "2. shake!!!", "3. 倒入冷饮杯，撒肉桂粉，出品"] } },
  { id: 'sp3', name: '葡萄奶油派', price: 16, category: '限定特调', options: { temps: ['冷'], rules: RULES.SPECIALTY }, instructions: { cold: ["1. 取冷饮杯，倒入葡萄汁(200ml)", "2. 另找一个杯子接一份浓缩，加入奶油(30ml)打发", "3. 倒入冷饮杯，盖盖出品"] } },
  { id: 'sp4', name: '秋梨桂花拿铁', price: 16, category: '限定特调', options: { temps: ['热', '冷'], rules: RULES.SPECIALTY }, instructions: { hot: ["1. 取热饮杯，加入秋梨酱(10g)、桂花液(10g)和一份浓缩，搅匀", "2. 加入打发的牛奶(200g)"], cold: ["1. 取冷饮杯，加入秋梨酱(10g)、桂花液(10g)和一份浓缩，搅匀", "2. 加入冰牛奶(200g)"] } },
  { id: 'sp5', name: '姜黄肉桂燕麦奶', price: 18, category: '限定特调', options: { temps: ['热', '冷'], rules: { perks: ['cup', 'barista', 'duty'] } }, instructions: { hot: ["1. 取热饮杯，加入姜黄汁(15g)", "2. 加入打发的燕麦奶(200g)，搅匀", "3. 撒肉桂粉进行装饰"], cold: ["1. 取冷饮杯，加入姜黄汁(15g)", "2. 加入燕麦奶(200g)，搅匀", "3. 撒肉桂粉进行装饰"] } },
  { id: 'sp6', name: '百利甜椰香拿铁', price: 18, category: '限定特调', options: { temps: ['热', '冷'], rules: { hasExtraEspresso: true, perks: ['milk', 'cup', 'barista', 'duty'] } }, instructions: { hot: ["1. 取热饮杯，接一份浓缩，加百利甜酒(30ml)搅匀", "2. 加入打发的椰乳(150ml)"], cold: ["1. 取冷饮杯，加入适量冰块", "2. 倒入百利甜酒(30ml)、椰乳(150ml)，搅匀", "3. 接一份浓缩从顶部缓慢倒入"] } },
  { id: 'sp7', name: '蔓越莓香草顶拿铁', price: 18, category: '限定特调', options: { temps: ['冷'], rules: RULES.SPECIALTY }, instructions: { cold: ["1. 取冷饮杯，加入蔓越莓酱(30g)和香草糖浆(15g)", "2. 加入适量冰块", "3. 倒入牛奶(150g)", "4. 加入一份已降温的浓缩", "5. 顶部挤喷射奶油，撒上装饰糖果"] } },
  { id: 'sp8', name: '抹茶拿铁甜甜圈', price: 18, category: '限定特调', options: { temps: ['热', '冷'], rules: RULES.SPECIALTY }, instructions: { hot: ["1. 奶缸中加入一包抹茶粉(2g)、牛奶(250g)、蔗糖糖浆(10ml)，打发（厚）", "2. 倒入热饮杯，顶部撒抹茶粉", "3. 取淡奶油(30ml)打发（酸奶状）", "4. 将奶油由中间注入，撒上装饰糖果"] } },

  // --- 酒品 ---
  { id: 'al1', name: '威士忌酸', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 波本威士忌 50ml、黄柠汁 20ml、蔗糖糖浆 13ml", "2. 加冰摇和，出品"] } },
  { id: 'al2', name: '帕洛玛', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 龙舌兰 60ml、浓缩柚子汁 15ml、青柠汁 10ml，加冰摇和", "2. 加入苏打水 120ml，出品"] } },
  { id: 'al3', name: '吉姆雷特', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 金酒 55ml、青柠汁 22ml、蔗糖糖浆 10ml", "2. 加冰摇和，出品"] } },
  { id: 'al4', name: '大都会', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 伏特加 30ml、蔓越莓汁 30ml、君度 15ml、青柠 15ml、糖浆 1-2ml", "2. 加冰摇和，出品"] } },
  { id: 'al5', name: '雪白佳人', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 金酒 50ml、君度 22ml、黄柠汁 20ml、糖浆 1-2ml", "2. 加冰摇和，出品"] } },
  { id: 'al6', name: '莫吉托', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 白朗姆 45ml、青柠汁 20ml、糖浆 10ml、薄荷浆 5ml，碎冰七八分满", "2. 搅匀，补苏打水 70ml，补满碎冰，出品"] } },
  { id: 'al7', name: '金汤力', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 金酒 60ml、青柠汁 10ml，加满杯冰", "2. 汤力水补满，轻轻搅动，出品"] } },
  { id: 'al8', name: '咖啡马天尼', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 伏特加 45ml、咖啡利口酒 20ml、浓缩 30ml", "2. 加冰摇和，出品"] } },
  { id: 'al9', name: '长岛冰茶', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 金酒/朗姆/伏特加/龙舌兰/君度/黄柠各15ml，糖浆 8-10ml", "2. 狠狠搅匀，加冰满杯，可乐补满"] } },
  { id: 'al10', name: '椰林飘香', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 白朗姆 45ml、椰奶 30ml、菠萝汁 90ml", "2. 加冰摇和，出品"] } },
  { id: 'al11', name: '玛格丽特', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 龙舌兰 40ml、君度 20ml、青柠 20ml", "2. 加冰摇和，出品"] } },
  { id: 'al12', name: '边车', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 白兰地 45ml、君度 25ml、黄柠汁 20ml、糖浆 2-3ml", "2. 加冰摇和，出品"] } },
  { id: 'al13', name: '大吉利', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 白朗姆 50ml、青柠汁 22ml、糖浆 8ml", "2. 加冰摇和，出品"] } },
  { id: 'al14', name: '盲盒', price: 28, category: '酒品', options: { temps: ['冷'], rules: RULES.ALCOHOL }, instructions: { cold: ["1. 根据当日物料和心情进行即兴特调"] } },

  // --- 库房 ---
  { id: 'st1', name: '芭莉茉乐', price: 16, category: '库房' },
];

export const MENU_CATEGORIES = [
  '无咖啡因',
  '美式系列',
  '拿铁系列',
  '限定特调',
  '酒品',
  '美味小食和其他',
  '库房'
];
