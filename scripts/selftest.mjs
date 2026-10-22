/**
 * 评分引擎 + 抽题器自测（不依赖浏览器）。
 * 用 esbuild 把 TS 源码打包成临时 ESM，然后在 Node 里直接断言。
 *
 * 运行：node scripts/selftest.mjs
 */
import { build } from 'esbuild';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// 输出放在项目内的临时目录：部分受限环境禁止写系统临时目录
const tmp = join(process.cwd(), '.selftest-tmp');
mkdirSync(tmp, { recursive: true });
const outfile = join(tmp, 'bundle.mjs');

await build({
  entryPoints: ['src/lib/testable.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2020',
  outfile,
  logLevel: 'error',
});

const mod = await import(pathToFileURL(outfile).href);
const {
  QUESTION_POOL,
  ARCHETYPES,
  DIMENSIONS,
  TOPICS,
  TOPIC_QUOTAS,
  QUESTIONS_PER_TEST,
  buildPaper,
  buildDisplayPaper,
  shuffleOptions,
  validateQuotas,
  createRng,
  newSeed,
  computeResult,
  computeDimensionRawScores,
  computeDimensionScores,
  computePurity,
  gaugeLabel,
  pickArchetype,
} = mod;

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/* ---------- 1. 题库结构 ---------- */

check('题库总量 ≥ 30', QUESTION_POOL.length >= 30, `实际 ${QUESTION_POOL.length}`);
check('单次题量 15~20', QUESTIONS_PER_TEST >= 15 && QUESTIONS_PER_TEST <= 20, `${QUESTIONS_PER_TEST}`);
check('题库总量大于单次题量（否则每次题都一样）', QUESTION_POOL.length > QUESTIONS_PER_TEST, `${QUESTION_POOL.length} vs ${QUESTIONS_PER_TEST}`);
check('结果类型至少 10 种', ARCHETYPES.length >= 10, `实际 ${ARCHETYPES.length}`);

const ids = new Set();
let duplicateId = null;
for (const q of QUESTION_POOL) {
  if (ids.has(q.id)) duplicateId = q.id;
  ids.add(q.id);
  check(`题目 ${q.id} 选项 3~5 个`, q.options.length >= 3 && q.options.length <= 5, `${q.options.length}`);
  const optIds = new Set();
  for (const o of q.options) {
    if (optIds.has(o.id)) duplicateId = o.id;
    optIds.add(o.id);
    check(`选项 ${o.id} 至少影响一个维度`, Object.keys(o.effects).length > 0);
    for (const [k, v] of Object.entries(o.effects)) {
      check(`选项 ${o.id} 维度 ${k} 合法`, DIMENSIONS.some((d) => d.key === k));
      check(`选项 ${o.id} 分值范围合理`, Math.abs(v) <= 10, `${v}`);
    }
  }
}
check('题目与选项 id 全局唯一', duplicateId === null, duplicateId);

check('覆盖 7 个主题', new Set(QUESTION_POOL.map((q) => q.topic)).size >= 7);

for (const a of ARCHETYPES) {
  check(`${a.id} 有名称`, typeof a.name === 'string' && a.name.length > 0);
  check(`${a.id} 有描述`, a.description.length > 20);
  check(`${a.id} 有优缺点`, a.strengths.length > 0 && a.weaknesses.length > 0);
  check(`${a.id} 有语录`, typeof a.quote === 'string' && a.quote.length > 0);
  check(`${a.id} 有建议`, a.advice.length >= 2);
  check(`${a.id} 有标签`, a.tags.length > 0);
}

/* ---------- 2. 抽题器 ---------- */

check('主题配额校验通过', validateQuotas().length === 0, validateQuotas().join('; '));

const quotaSum = TOPICS.reduce((acc, t) => acc + TOPIC_QUOTAS[t], 0);
check('配额之和 = 单次题量', quotaSum === QUESTIONS_PER_TEST, `${quotaSum} vs ${QUESTIONS_PER_TEST}`);

const paperA = buildPaper(12345);
const paperA2 = buildPaper(12345);
const paperB = buildPaper(54321);

check('同一 seed 抽出同一份试卷', JSON.stringify(paperA.map((q) => q.id)) === JSON.stringify(paperA2.map((q) => q.id)));
check(`试卷题量 = ${QUESTIONS_PER_TEST}`, paperA.length === QUESTIONS_PER_TEST, `${paperA.length}`);
check('不同 seed 抽出不同试卷', JSON.stringify(paperA.map((q) => q.id)) !== JSON.stringify(paperB.map((q) => q.id)));
check('试卷内无重复题目', new Set(paperA.map((q) => q.id)).size === paperA.length);

// 主题覆盖：每份试卷都必须覆盖全部 7 个主题
let coverFail = 0;
for (let s = 0; s < 300; s += 1) {
  const p = buildPaper(s * 7919 + 13);
  const topics = new Set(p.map((q) => q.topic));
  if (topics.size !== TOPICS.length) coverFail += 1;
}
check('300 份随机试卷都覆盖全部 7 个主题', coverFail === 0, `${coverFail} 份缺主题`);

// 随机性：1000 份试卷应该出现大量不同的题目组合
const signatures = new Set();
for (let s = 0; s < 1000; s += 1) {
  signatures.add(buildPaper(s * 104729 + 7).map((q) => q.id).join(','));
}
check('1000 份随机试卷至少 900 种不同组合', signatures.size >= 900, `${signatures.size} 种`);

// 题目出现频率：题库里的题不应有从未被抽到、或几乎包场的
const appear = new Map(QUESTION_POOL.map((q) => [q.id, 0]));
for (let s = 0; s < 500; s += 1) {
  for (const q of buildPaper(s * 2654435761 + 11)) {
    appear.set(q.id, (appear.get(q.id) ?? 0) + 1);
  }
}
const neverPicked = [...appear.entries()].filter(([, c]) => c === 0).map(([id]) => id);
check('没有题目永远抽不到', neverPicked.length === 0, neverPicked.join(','));
const maxShare = Math.max(...appear.values()) / 500;
check('没有题目出现率超过 60%', maxShare <= 0.6, `${(maxShare * 100).toFixed(1)}%`);

// 选项顺序打乱：不同 seed 下同一题的选项顺序应不同
// 注意：q03 不一定出现在每份试卷里（题池 9 抽 3），所以只统计「包含该题的试卷」
const orderKey = (q) => q.options.map((o) => o.id).join('>');
const SAMPLE_PAPERS = 400;
let withQ = 0;
let orderDiff = 0;
for (let s = 0; s < SAMPLE_PAPERS; s += 1) {
  const p = buildDisplayPaper(s * 7717 + 3);
  const q = p.find((x) => x.id === 'q03');
  if (!q) continue;
  withQ += 1;
  if (orderKey(q) !== 'q03a>q03b>q03c>q03d') orderDiff += 1;
}
// 期望出现率 = 该主题配额 / 该主题题池，只要样本量够就能断言
const q03TopicQuota = TOPIC_QUOTAS[QUESTION_POOL.find((q) => q.id === 'q03').topic];
const q03TopicPool = QUESTION_POOL.filter(
  (q) => q.topic === QUESTION_POOL.find((x) => x.id === 'q03').topic,
).length;
const expectedAppear = (SAMPLE_PAPERS * q03TopicQuota) / q03TopicPool;
check(
  `包含固定题的试卷数量接近期望（≈${Math.round(expectedAppear)}）`,
  withQ >= expectedAppear * 0.6,
  `${withQ} 份`,
);
check(
  '选项顺序会被打乱（≥ 70% 的试卷）',
  withQ > 0 && orderDiff / withQ >= 0.7,
  `${orderDiff}/${withQ}`,
);

/* ---------- 2b. 维度覆盖均衡度 ---------- */

/** 统计单份试卷里「真正影响某维度的题数」 */
function effectiveQuestions(paper, dimKey) {
  return paper.filter((q) => q.options.some((o) => (o.effects[dimKey] ?? 0) !== 0)).length;
}

// 题库层面的维度触及率：每个维度都应被足够多的题覆盖
const touchRate = {};
for (const d of DIMENSIONS) {
  const n = QUESTION_POOL.filter((q) => q.options.some((o) => (o.effects[d.key] ?? 0) !== 0)).length;
  touchRate[d.key] = n / QUESTION_POOL.length;
  check(
    `维度 ${d.key} 题库触及率 ≥ 25%`,
    touchRate[d.key] >= 0.25,
    `${(touchRate[d.key] * 100).toFixed(0)}%`,
  );
}

// 试卷层面：每维度的平均有效题数，权重/题数比应尽量接近（离散度越低越均衡）
const BALANCE_SAMPLES = 600;
const effSum = {};
for (const d of DIMENSIONS) effSum[d.key] = 0;
let minWallet = Infinity;
for (let s = 0; s < BALANCE_SAMPLES; s += 1) {
  const p = buildPaper(s * 7919 + 11);
  for (const d of DIMENSIONS) effSum[d.key] += effectiveQuestions(p, d.key);
  minWallet = Math.min(minWallet, effectiveQuestions(p, 'wallet'));
}
const effAvg = {};
for (const d of DIMENSIONS) effAvg[d.key] = effSum[d.key] / BALANCE_SAMPLES;

const ratios = DIMENSIONS.map((d) => d.weight / effAvg[d.key]);
const ratioMean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
const ratioCv =
  Math.sqrt(ratios.reduce((a, b) => a + (b - ratioMean) ** 2, 0) / ratios.length) / ratioMean;

check('权重与有效题数的离散度 CV ≤ 10%', ratioCv <= 0.10, `CV=${(ratioCv * 100).toFixed(1)}%`);
check('消费维度单份试卷平均有效题数 ≥ 4.5', effAvg.wallet >= 4.5, `${effAvg.wallet.toFixed(1)}`);
check('消费维度单份试卷最少有效题数 ≥ 3', minWallet >= 3, `${minWallet}`);

/* ---------- 2c. 两次测试的重合度 ---------- */

let overlapSum = 0;
let highOverlap = 0;
const OVERLAP_RUNS = 1500;
for (let s = 0; s < OVERLAP_RUNS; s += 1) {
  const a = new Set(buildPaper(s * 104729 + 3).map((q) => q.id));
  const overlap = buildPaper(s * 7717 + 101).filter((q) => a.has(q.id)).length;
  overlapSum += overlap;
  if (overlap >= 12) highOverlap += 1;
}
const avgOverlap = overlapSum / OVERLAP_RUNS;
check(
  '两次独立测试平均重合 ≤ 6 题（避免重复感）',
  avgOverlap <= 6,
  `${avgOverlap.toFixed(1)}/18`,
);
check(
  '重合 ≥12 题的试卷组合少于 2%',
  highOverlap / OVERLAP_RUNS < 0.02,
  `${((highOverlap / OVERLAP_RUNS) * 100).toFixed(1)}%`,
);

// 直接抽样 shuffleOptions：同一题在不同 seed 下应产生多种顺序
const q03 = QUESTION_POOL.find((q) => q.id === 'q03');
const seenOrders = new Set();
for (let s = 0; s < 200; s += 1) {
  seenOrders.add(shuffleOptions(q03, s * 7717 + 3).options.map((o) => o.id).join('>'));
}
check('单题在 200 个 seed 下出现 ≥ 10 种选项顺序', seenOrders.size >= 10, `${seenOrders.size} 种`);

/* ---------- 3. 确定性 ---------- */

const sampleAnswers = {};
for (const q of paperA) sampleAnswers[q.id] = q.options[0].id;

const r1 = computeResult(sampleAnswers, { paper: paperA, paperSeed: 12345, now: new Date('2026-01-01T00:00:00Z') });
const r2 = computeResult(sampleAnswers, { paper: paperA, paperSeed: 12345, now: new Date('2026-01-01T00:00:00Z') });
check('同试卷同答案 → 同一结果对象', JSON.stringify(r1) === JSON.stringify(r2));
check('同试卷同答案 → 同一类型', r1.archetype.id === r2.archetype.id);
check('编号格式 CHL-YYYY-XXXX-XXXX', /^CHL-\d{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(r1.serial), r1.serial);
check('报告记录试卷种子', r1.paperSeed === 12345, `${r1.paperSeed}`);

/* ---------- 4. 分值范围（多份随机试卷 × 多种作答风格） ---------- */

const styles = [
  ['全选第一项', (q) => q.options[0]],
  ['全选最后一项', (q) => q.options[q.options.length - 1]],
  ['全选中位项', (q) => q.options[Math.floor(q.options.length / 2)]],
  ['随机作答', (q, rng) => q.options[Math.floor(rng() * q.options.length)]],
];

for (let pi = 0; pi < 12; pi += 1) {
  const paper = buildPaper(pi * 31 + 5);
  for (const [label, pick] of styles) {
    const rng = createRng(pi + 99);
    const answers = {};
    for (const q of paper) answers[q.id] = pick(q, rng).id;
    const res = computeResult(answers, { paper, paperSeed: pi });
    for (const d of res.dimensions) {
      if (!(d.value >= 0 && d.value <= 100)) {
        check(`试卷${pi} ${label} ${d.key} 在 0~100`, false, `${d.value}`);
      }
    }
    if (!(res.purity >= 0 && res.purity <= 100)) {
      check(`试卷${pi} ${label} 纯度在 0~100`, false, `${res.purity}`);
    }
    if (!(res.tags.length > 0 && res.tags.length <= 5)) {
      check(`试卷${pi} ${label} 标签 1~5 个`, false, `${res.tags.length}`);
    }
    if (res.extras.length !== 5) {
      check(`试卷${pi} ${label} 附加指标 5 项`, false, `${res.extras.length}`);
    }
  }
}
check('各随机试卷分值均在合法区间', true);

/* ---------- 5. 结果多样性 ---------- */

const hitTypes = new Map();
let seed = 20260101;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

for (let i = 0; i < 4000; i += 1) {
  const paper = buildPaper(Math.floor(rand() * 2147483647));
  const answers = {};
  for (const q of paper) {
    answers[q.id] = q.options[Math.floor(rand() * q.options.length)].id;
  }
  const res = computeResult(answers, { paper });
  hitTypes.set(res.archetype.id, (hitTypes.get(res.archetype.id) ?? 0) + 1);
}

check(
  '随机 4000 次至少命中 10 种结果类型',
  hitTypes.size >= 10,
  `命中 ${hitTypes.size} 种`,
);

const unreachable = ARCHETYPES.filter((a) => !hitTypes.has(a.id)).map((a) => a.id);
if (unreachable.length) {
  console.log(`  ⚠ 随机采样未命中的类型（条件较窄）：${unreachable.join(', ')}`);
}

/* 兜底类型必须存在 */
const fallback = ARCHETYPES[ARCHETYPES.length - 1];
check('最后一个类型是无条件兜底', fallback.match.length === 0);

/* ---------- 6. 脏数据容错 ---------- */

const dirty = { q01: 'not-an-option', unknownQuestion: 'q02a', q03: 'q03a' };
const dirtyResult = computeResult(dirty, { paper: paperA });
check('脏答案不会抛错', typeof dirtyResult.purity === 'number');
check('脏答案只统计合法作答', dirtyResult.answeredCount === 3);

const empty = computeResult({}, { paper: paperA });
check('空答案可生成结果（兜底）', empty.archetype.id === fallback.id, empty.archetype.id);
check('空答案纯度等于基准分 50', empty.purity === 50, `${empty.purity}`);

/* ---------- 7. gauge 文案档位 ---------- */

check('注意力 0 分显示「负数」', gaugeLabel('attention', 0) === '负数');
check('注意力 100 分显示「余额充足」', gaugeLabel('attention', 100) === '余额充足');
check('社交 30 分显示「连接超时」', gaugeLabel('social', 30) === '连接超时');

/* ---------- 8. 加权纯度与归一化 ---------- */

const flat = {};
for (const d of DIMENSIONS) flat[d.key] = 60;
check('各维度同为 60 时纯度为 60', computePurity(flat) === 60, `${computePurity(flat)}`);

const rawCheck = computeDimensionRawScores({ q03: 'q03a' });
check('单个选项加分生效', rawCheck.attention === 55, `${rawCheck.attention}`);

const norm = computeDimensionScores({ q03: 'q03a' }, paperA);
check('归一化后分数仍在 0~100', norm.attention >= 0 && norm.attention <= 100, `${norm.attention}`);

/* ---------- 输出 ---------- */

console.log(`\n题库 ${QUESTION_POOL.length} 道，单次抽 ${QUESTIONS_PER_TEST} 道，主题配额 ${JSON.stringify(TOPIC_QUOTAS)}`);
console.log(`随机试卷组合数（1000 次采样）：${signatures.size} 种不同题目组合`);
console.log(`两次独立测试平均重合：${avgOverlap.toFixed(1)} / ${QUESTIONS_PER_TEST}（${((avgOverlap / QUESTIONS_PER_TEST) * 100).toFixed(0)}%）`);
console.log(`维度均衡度（权重/有效题数 CV）：${(ratioCv * 100).toFixed(1)}%`);
console.log(
  `单份试卷各维度平均有效题数：${DIMENSIONS.map((d) => `${d.short} ${effAvg[d.key].toFixed(1)}`).join('  ')}`,
);
console.log('\n结果类型分布（随机试卷 + 随机作答 4000 次）：');
const sorted = [...hitTypes.entries()].sort((a, b) => b[1] - a[1]);
for (const [id, count] of sorted) {
  const pct = ((count / 4000) * 100).toFixed(1);
  console.log(`  ${id.padEnd(24)} ${String(count).padStart(4)}  ${pct}%`);
}

console.log(`\n通过 ${passed} 项，失败 ${failed} 项`);
if (failed) {
  console.error('\n失败明细：');
  for (const f of failures.slice(0, 20)) console.error(`  ✕ ${f}`);
}

rmSync(tmp, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
