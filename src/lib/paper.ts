import {
  QUESTION_POOL,
  QUESTIONS_PER_TEST,
  TOPIC_QUOTAS,
  TOPICS,
  type Question,
  type Topic,
} from '../data/questions';

/** 一份试卷就是按顺序排好的题目数组 */
export type Paper = Question[];

/**
 * 可复现的伪随机数生成器（mulberry32）。
 * 同一 seed 永远产生同一序列，因此「刷新恢复」不会把试卷抽成另一份。
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 生成一个新的随机种子（0 ~ 2^32-1） */
export function newSeed(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

function shuffle<T>(list: T[], rng: () => number): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 按主题配额抽取一份试卷。
 * 每个主题从自己的题池里随机取 TOPIC_QUOTAS[topic] 道，再整体打乱顺序。
 * 因为配额之和等于题量，所以每份试卷都覆盖全部 7 个主题。
 */
export function buildPaper(seed: number = newSeed()): Paper {
  const rng = createRng(seed);
  const picked: Question[] = [];

  for (const topic of TOPICS) {
    const quota = TOPIC_QUOTAS[topic as Topic];
    const pool = QUESTION_POOL.filter((q) => q.topic === topic);
    const take = Math.min(quota, pool.length);
    picked.push(...shuffle(pool, rng).slice(0, take));
  }

  const ordered = shuffle(picked, rng);

  // 兜底：若某主题题池不足导致总数不够，从剩余题里补齐
  if (ordered.length < QUESTIONS_PER_TEST) {
    const used = new Set(ordered.map((q) => q.id));
    const rest = shuffle(
      QUESTION_POOL.filter((q) => !used.has(q.id)),
      rng,
    );
    ordered.push(...rest.slice(0, QUESTIONS_PER_TEST - ordered.length));
  }

  return ordered.slice(0, QUESTIONS_PER_TEST);
}

/**
 * 打乱单题的选项顺序。
 * 选项本身带分值，顺序打乱不改变评分，只是避免「无脑选第一个」总是同一种结果。
 */
export function shuffleOptions(question: Question, seed: number): Question {
  let h = seed >>> 0;
  for (let i = 0; i < question.id.length; i += 1) {
    h = Math.imul(h ^ question.id.charCodeAt(i), 16777619) >>> 0;
  }
  const rng = createRng(h);
  return { ...question, options: shuffle(question.options, rng) };
}

/** 一份带乱序选项的试卷（展示用） */
export function buildDisplayPaper(seed: number): Paper {
  return buildPaper(seed).map((q, i) => shuffleOptions(q, seed + i * 104729));
}

/** 校验：配额之和必须等于题量，且每个主题题池够用 */
export function validateQuotas(): string[] {
  const problems: string[] = [];
  const sum = TOPICS.reduce((acc, t) => acc + TOPIC_QUOTAS[t], 0);
  if (sum !== QUESTIONS_PER_TEST) {
    problems.push(`主题配额之和 ${sum} ≠ 题量 ${QUESTIONS_PER_TEST}`);
  }
  for (const topic of TOPICS) {
    const available = QUESTION_POOL.filter((q) => q.topic === topic).length;
    if (available < TOPIC_QUOTAS[topic]) {
      problems.push(`主题「${topic}」题池只有 ${available} 道，少于配额 ${TOPIC_QUOTAS[topic]}`);
    }
  }
  return problems;
}
