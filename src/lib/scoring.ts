import {
  BASE_SCORE,
  DIMENSIONS,
  DIMENSION_KEYS,
  DIMENSION_MAP,
  gaugeLabel,
  type DimensionKey,
} from '../data/dimensions';
import { ARCHETYPES, type Archetype, type MatchCondition } from '../data/archetypes';
import {
  OPTION_MAP,
  QUESTION_POOL,
  QUESTION_SET_VERSION,
  QUESTIONS_PER_TEST,
  type Question,
} from '../data/questions';

export type Answers = Record<string, string>;

export interface DimensionScore {
  key: DimensionKey;
  label: string;
  short: string;
  desc: string;
  hue: 'green' | 'violet' | 'cyan' | 'amber';
  value: number;
  gauge: string;
  weight: number;
}

export interface RawResult {
  /** 个人鉴定编号 */
  serial: string;
  purity: number;
  purityLabel: string;
  dimensions: DimensionScore[];
  archetype: Archetype;
  tags: string[];
  /** 命中的标签来源（题目 id 列表），用于「哪几题决定的」这类展示 */
  answeredCount: number;
  /** 用于结果页展示的附加趣味指标 */
  extras: ExtraMetric[];
  /** 复现同一份报告用的种子 */
  seed: string;
  version: number;
  /** 本次试卷的随机种子（同一种子 + 同样答案 = 同一份报告） */
  paperSeed: number;
  /** 本次试卷的题量 */
  paperSize: number;
}

export interface ExtraMetric {
  label: string;
  value: string;
  hint: string;
}

/** 把原始分裁到 0-100 */
function clampScore(raw: number): number {
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * 每份试卷的维度方差不同（题目是随机抽的），所以归一化参数必须按实际抽到的题计算。
 * 这里把每题选项的 delta 视为等概率，累加方差后取标准差。
 */
function computeSigma(paper: Question[]): Record<DimensionKey, number> {
  const result = {} as Record<DimensionKey, number>;
  for (const key of DIMENSION_KEYS) {
    let variance = 0;
    for (const question of paper) {
      const deltas = question.options.map((o) => o.effects[key] ?? 0);
      const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      variance += deltas.reduce((a, b) => a + (b - mean) ** 2, 0) / deltas.length;
    }
    result[key] = Math.sqrt(variance);
  }
  return result;
}

/** 归一化后的目标标准差：让各维度读数在 50 附近自然展开到 10~90 */
const TARGET_SIGMA = 17;

/**
 * 把原始累加分归一化到统一量表。
 * 偏差按 sigma 比例放大，再裁到 0~100；没有偏差时保持基准分。
 */
function normalizeScore(raw: number, sigma: number): number {
  const deviation = raw - BASE_SCORE;
  const scaled = sigma > 0 ? (deviation * TARGET_SIGMA) / sigma : deviation;
  return clampScore(BASE_SCORE + scaled);
}

/**
 * 计算各维度原始分。纯函数，不依赖随机数。
 */
export function computeDimensionRawScores(answers: Answers): Record<DimensionKey, number> {
  const scores = DIMENSION_KEYS.reduce(
    (acc, key) => {
      acc[key] = BASE_SCORE;
      return acc;
    },
    {} as Record<DimensionKey, number>,
  );

  for (const [questionId, optionId] of Object.entries(answers)) {
    const entry = OPTION_MAP[optionId];
    // 答案必须属于对应题目，防止脏数据影响评分
    if (!entry || entry.question.id !== questionId) continue;
    for (const [dim, delta] of Object.entries(entry.option.effects)) {
      const key = dim as DimensionKey;
      if (key in scores) scores[key] += delta as number;
    }
  }

  return scores;
}

/**
 * 计算各维度最终读数（已归一化到 0~100）。
 * sigma 基于本次实际抽到的题目计算，因此不同试卷之间的读数仍然可比。
 */
export function computeDimensionScores(
  answers: Answers,
  paper: Question[] = QUESTION_POOL,
): Record<DimensionKey, number> {
  const raw = computeDimensionRawScores(answers);
  const sigma = computeSigma(paper);
  return DIMENSION_KEYS.reduce(
    (acc, key) => {
      acc[key] = normalizeScore(raw[key], sigma[key]);
      return acc;
    },
    {} as Record<DimensionKey, number>,
  );
}

/** 加权计算「人类纯度」 */
export function computePurity(scores: Record<DimensionKey, number>): number {
  let weighted = 0;
  let totalWeight = 0;
  for (const dim of DIMENSIONS) {
    weighted += scores[dim.key] * dim.weight;
    totalWeight += dim.weight;
  }
  return clampScore(weighted / totalWeight);
}

function purityLabel(purity: number): string {
  if (purity >= 70) return '接近出厂设置';
  if (purity >= 58) return '基本维持人形';
  if (purity >= 46) return '人类特征部分残留';
  if (purity >= 34) return '大面积数字化';
  if (purity >= 22) return '仅剩仪式性人类行为';
  return '已高度优化为非人类';
}

function conditionHolds(condition: MatchCondition, scores: Record<DimensionKey, number>, purity: number): boolean {
  const value = condition.field === 'purity' ? purity : scores[condition.field];
  switch (condition.op) {
    case '>=':
      return value >= condition.value;
    case '>':
      return value > condition.value;
    case '<=':
      return value <= condition.value;
    case '<':
      return value < condition.value;
    default:
      return false;
  }
}

/**
 * 结果类型匹配：按 ARCHETYPES 顺序，第一个所有条件都满足的类型胜出。
 * 最后一个类型的 match 为空数组，等价于兜底，因此一定会有结果。
 */
export function pickArchetype(
  scores: Record<DimensionKey, number>,
  purity: number,
): Archetype {
  for (const archetype of ARCHETYPES) {
    if (archetype.match.every((c) => conditionHolds(c, scores, purity))) {
      return archetype;
    }
  }
  // 理论上不会到这里：兜底类型无条件命中
  return ARCHETYPES[ARCHETYPES.length - 1];
}

/** 收集用户选择带来的趣味标签，去重并限制数量 */
export function collectTags(answers: Answers, archetype: Archetype): string[] {
  const tags: string[] = [];
  const push = (tag: string) => {
    if (tags.length >= 5) return;
    if (!tags.includes(tag)) tags.push(tag);
  };

  // 优先展示用户实际命中、且与结果类型不重复的标签
  for (const optionId of Object.values(answers)) {
    const entry = OPTION_MAP[optionId];
    if (!entry?.option.tags) continue;
    for (const tag of entry.option.tags) {
      if (archetype.tags.includes(tag)) continue;
      push(tag);
    }
  }
  // 剩余位置用类型自带标签补足
  for (const tag of archetype.tags) push(tag);
  return tags.slice(0, 5);
}

/** 稳定的小哈希，用于生成编号与文案变体 */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SERIAL_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** 生成形如 CHL-2026-7QK4-9F2A 的鉴定编号 */
export function makeSerial(seed: string, date = new Date()): string {
  const h = hashString(seed);
  const year = date.getFullYear();
  const part = (n: number) => {
    let s = '';
    let v = n;
    for (let i = 0; i < 4; i += 1) {
      s += SERIAL_ALPHABET[v % SERIAL_ALPHABET.length];
      v = Math.floor(v / SERIAL_ALPHABET.length);
    }
    return s;
  };
  return `CHL-${year}-${part(h)}-${part(Math.floor(h / 7) + 31)}`;
}

/** 派生趣味附加指标，全部由分数确定性推导 */
function buildExtras(
  scores: Record<DimensionKey, number>,
  purity: number,
  seed: string,
): ExtraMetric[] {
  const h = hashString(seed);
  const pick = (list: string[], offset: number) => list[(h + offset) % list.length];

  const attention = scores.attention;
  const social = scores.social;
  const emotion = scores.emotion;
  const reality = scores.reality;

  const sleepDebt = Math.max(0, Math.round((100 - attention) * 0.7 + (100 - reality) * 0.5));
  const replyLatency =
    social >= 70 ? `${(h % 5) + 1} 秒` : social >= 50 ? `${(h % 20) + 5} 分钟` : `${(h % 20) + 3} 小时`;

  return [
    {
      label: '睡眠负债',
      value: `${sleepDebt} 点`,
      hint: sleepDebt > 90 ? '已进入滚息阶段' : sleepDebt > 60 ? '每月只还最低还款' : '尚在可控区间',
    },
    {
      label: '回复延迟',
      value: replyLatency,
      hint: social >= 70 ? '存在感过强' : '对方可能已经放弃',
    },
    {
      label: '情绪波动幅度',
      value: emotion >= 70 ? '±1 档' : emotion >= 45 ? '±3 档' : '±7 档',
      hint: emotion >= 70 ? '内置减震' : '建议避免在波动期做决定',
    },
    {
      label: '本周线下签到',
      value: reality >= 70 ? '5 次以上' : reality >= 45 ? '2~3 次' : '0~1 次',
      hint: reality >= 70 ? '身体与账号同步在线' : '现实世界正在发出重连请求',
    },
    {
      label: '人类纯度评级',
      value: purityLabel(purity),
      hint: pick(
        ['检测结果仅供娱乐', '本报告不具备任何诊断效力', '请勿据此判断自己或他人'],
        3,
      ),
    },
  ];
}

export interface ComputeOptions {
  /** 生成鉴定编号时使用的日期，默认为当前时间 */
  now?: Date;
  /** 本次试卷，用于按实际抽到的题目计算归一化参数 */
  paper?: Question[];
  /** 试卷种子，写进报告便于复现 */
  paperSeed?: number;
}

/**
 * 主评分入口：输入答案，输出完整报告数据。
 * 完全确定性——同一份试卷 + 同样的答案永远得到同样的结果。
 */
export function computeResult(answers: Answers, options: ComputeOptions = {}): RawResult {
  const now = options.now ?? new Date();
  const paper = options.paper ?? QUESTION_POOL;
  const finalScores = computeDimensionScores(answers, paper);

  const dimensions: DimensionScore[] = DIMENSIONS.map((dim) => ({
    key: dim.key,
    label: dim.label,
    short: dim.short,
    desc: dim.desc,
    hue: dim.hue,
    value: finalScores[dim.key],
    gauge: gaugeLabel(dim.key, finalScores[dim.key]),
    weight: dim.weight,
  }));

  const purity = computePurity(finalScores);
  const seed = `${DIMENSION_KEYS.map((k) => `${k}:${finalScores[k]}`).join('|')}#v${QUESTION_SET_VERSION}`;
  const archetype = pickArchetype(finalScores, purity);
  const tags = collectTags(answers, archetype);

  return {
    serial: makeSerial(seed, now),
    purity,
    purityLabel: purityLabel(purity),
    dimensions,
    archetype,
    tags,
    answeredCount: Object.keys(answers).length,
    extras: buildExtras(finalScores, purity, seed),
    seed,
    version: QUESTION_SET_VERSION,
    paperSeed: options.paperSeed ?? 0,
    paperSize: paper.length,
  };
}

/** 供首页预览：随机挑一个类型 + 一组可信的数值 */
export function randomPreview(): {
  archetype: Archetype;
  purity: number;
  gauges: { label: string; value: number; gauge: string }[];
} {
  const archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  const purity = 18 + Math.floor(Math.random() * 62);
  const gauges = DIMENSIONS.slice(0, 4).map((dim) => {
    const value = Math.max(4, Math.min(96, purity + (Math.floor(Math.random() * 46) - 23)));
    return { label: dim.label, value, gauge: gaugeLabel(dim.key, value) };
  });
  return { archetype, purity, gauges };
}

export const QUESTION_COUNT = QUESTIONS_PER_TEST;

export function questionProgress(answers: Answers, paper: Question[] = QUESTION_POOL): number {
  const done = paper.filter((q) => answers[q.id]).length;
  return paper.length ? Math.round((done / paper.length) * 100) : 0;
}

export { DIMENSION_MAP };
