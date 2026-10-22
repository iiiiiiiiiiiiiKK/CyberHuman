/**
 * 维度定义：评分体系与展示文案的唯一来源。
 * 修改档位或文案只改这里，不影响题目与人格数据。
 */

export type DimensionKey =
  | 'attention'
  | 'emotion'
  | 'social'
  | 'execution'
  | 'wallet'
  | 'reality';

export interface GaugeTier {
  /** 达到该分值即显示此文案（从高到低匹配） */
  min: number;
  label: string;
}

export interface DimensionDef {
  key: DimensionKey;
  /** 雷达图与进度条上的短标签 */
  short: string;
  /** 完整名称，例如「注意力余额」 */
  label: string;
  /** 一句话说明这个维度在测什么 */
  desc: string;
  /** 计算人类纯度时的权重 */
  weight: number;
  /** 结果页展示的颜色（荧光绿系 / 紫色系交替） */
  hue: 'green' | 'violet' | 'cyan' | 'amber';
  tiers: GaugeTier[];
}

export const DIMENSIONS: DimensionDef[] = [
  {
    key: 'attention',
    short: '注意力',
    label: '注意力余额',
    desc: '你还能连续专注多久，以及被打断后多久能回来。',
    weight: 0.2,
    hue: 'green',
    tiers: [
      { min: 85, label: '余额充足' },
      { min: 65, label: '正常可用' },
      { min: 45, label: '偏低' },
      { min: 25, label: '告急' },
      { min: 0, label: '负数' },
    ],
  },
  {
    key: 'emotion',
    short: '情绪',
    label: '情绪稳定性',
    desc: '外界一点风吹草动，能在你这里掀起多大的浪。',
    weight: 0.2,
    hue: 'violet',
    tiers: [
      { min: 85, label: '稳定' },
      { min: 65, label: '基本稳定' },
      { min: 45, label: '看情况' },
      { min: 25, label: '取决于行情' },
      { min: 0, label: '过山车型' },
    ],
  },
  {
    key: 'social',
    short: '社交',
    label: '社交进程',
    desc: '你发出和接住社交信号的能力，以及愿不愿意发出。',
    weight: 0.15,
    hue: 'cyan',
    tiers: [
      { min: 85, label: '满速连接' },
      { min: 65, label: '正常连接' },
      { min: 45, label: '轻微延迟' },
      { min: 25, label: '连接超时' },
      { min: 0, label: '无响应' },
    ],
  },
  {
    key: 'execution',
    short: '执行',
    label: '执行力',
    desc: '从「想做」到「开始做」之间，你隔了几个小时。',
    weight: 0.2,
    hue: 'green',
    tiers: [
      { min: 85, label: '工业级' },
      { min: 65, label: '稳定输出' },
      { min: 45, label: '需要预热' },
      { min: 25, label: '待启动' },
      { min: 0, label: '未安装' },
    ],
  },
  {
    key: 'wallet',
    short: '消费',
    label: '消费理性',
    desc: '深夜、情绪波动和限时折扣下的钱包防护等级。',
    weight: 0.1,
    hue: 'amber',
    tiers: [
      { min: 85, label: '冷静克制' },
      { min: 65, label: '基本理性' },
      { min: 45, label: '偶发失控' },
      { min: 25, label: '高危' },
      { min: 0, label: '无底洞' },
    ],
  },
  {
    key: 'reality',
    short: '现实',
    label: '现实锚定',
    desc: '你的身体和意识，有多大比例还留在线下世界。',
    weight: 0.15,
    hue: 'violet',
    tiers: [
      { min: 85, label: '锚定良好' },
      { min: 65, label: '现实在线' },
      { min: 45, label: '来回游荡' },
      { min: 25, label: '半离线' },
      { min: 0, label: '已离线' },
    ],
  },
];

export const DIMENSION_KEYS: DimensionKey[] = DIMENSIONS.map((d) => d.key);

export const DIMENSION_MAP: Record<DimensionKey, DimensionDef> = DIMENSIONS.reduce(
  (acc, d) => {
    acc[d.key] = d;
    return acc;
  },
  {} as Record<DimensionKey, DimensionDef>,
);

/** 所有维度初始基准分 */
export const BASE_SCORE = 50;

export function gaugeLabel(key: DimensionKey, value: number): string {
  const def = DIMENSION_MAP[key];
  for (const tier of def.tiers) {
    if (value >= tier.min) return tier.label;
  }
  return def.tiers[def.tiers.length - 1].label;
}
