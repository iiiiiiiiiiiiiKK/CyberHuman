/**
 * 测试专用聚合导出：让 Node 端自测脚本可以一次拿到评分相关的全部符号。
 * 不参与生产构建（只被 scripts/*.mjs 引用）。
 */
export {
  QUESTION_POOL,
  QUESTION_MAP,
  OPTION_MAP,
  QUESTION_SET_VERSION,
  QUESTIONS_PER_TEST,
  TOPIC_QUOTAS,
  TOPICS,
  TOPIC_POOL_SIZES,
} from '../data/questions';
export { ARCHETYPES, ARCHETYPE_MAP } from '../data/archetypes';
export { DIMENSIONS, DIMENSION_KEYS, gaugeLabel, BASE_SCORE } from '../data/dimensions';
export {
  computeResult,
  computeDimensionRawScores,
  computeDimensionScores,
  computePurity,
  pickArchetype,
  collectTags,
  makeSerial,
  hashString,
  questionProgress,
  QUESTION_COUNT,
} from './scoring';
export {
  buildPaper,
  buildDisplayPaper,
  newSeed,
  createRng,
  shuffleOptions,
  validateQuotas,
} from './paper';
export { resultToPlainText, formatResultMarkdown } from './share';
