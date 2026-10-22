import type { Answers } from './scoring';
import { QUESTION_MAP, QUESTION_POOL, QUESTION_SET_VERSION } from '../data/questions';

const KEY_PROGRESS = 'chl.progress.v2';
const KEY_CONSENT = 'chl.storage-consent.v1';
const KEY_RESULT = 'chl.last-result.v2';

export interface StoredProgress {
  version: number;
  /** 本次试卷的种子，用于重建同一份试卷 */
  paperSeed: number;
  answers: Answers;
  index: number;
  updatedAt: number;
}

export type ConsentState = 'granted' | 'denied' | 'unset';

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* 忽略：隐私模式下可能抛错 */
  }
}

export function getConsent(): ConsentState {
  const raw = safeGetItem(KEY_CONSENT);
  if (raw === 'granted' || raw === 'denied') return raw;
  return 'unset';
}

export function setConsent(state: Exclude<ConsentState, 'unset'>): void {
  safeSetItem(KEY_CONSENT, state);
  if (state === 'denied') {
    clearAll();
  }
}

export function saveProgress(answers: Answers, index: number, paperSeed: number): void {
  if (getConsent() !== 'granted') return;
  const payload: StoredProgress = {
    version: QUESTION_SET_VERSION,
    paperSeed,
    answers,
    index,
    updatedAt: Date.now(),
  };
  safeSetItem(KEY_PROGRESS, JSON.stringify(payload));
}

export function loadProgress(): StoredProgress | null {
  if (getConsent() !== 'granted') return null;
  const raw = safeGetItem(KEY_PROGRESS);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== QUESTION_SET_VERSION) {
      // 题库结构已变更，旧进度直接作废
      safeRemoveItem(KEY_PROGRESS);
      return null;
    }
    if (!Number.isFinite(parsed.paperSeed)) return null;
    const answers = parsed.answers ?? {};
    if (typeof answers !== 'object') return null;
    // 过滤掉题库里已不存在的题/选项
    const cleaned: Answers = {};
    for (const [questionId, optionId] of Object.entries(answers)) {
      const question = QUESTION_MAP[questionId];
      if (!question) continue;
      if (typeof optionId === 'string' && question.options.some((o) => o.id === optionId)) {
        cleaned[questionId] = optionId;
      }
    }
    if (Object.keys(cleaned).length === 0) return null;
    const index = Number.isFinite(parsed.index)
      ? Math.max(0, Math.min(QUESTION_POOL.length - 1, parsed.index as number))
      : 0;
    return {
      version: QUESTION_SET_VERSION,
      paperSeed: parsed.paperSeed as number,
      answers: cleaned,
      index,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearProgress(): void {
  safeRemoveItem(KEY_PROGRESS);
}

export function saveLastResult(payload: unknown): void {
  if (getConsent() !== 'granted') return;
  safeSetItem(KEY_RESULT, JSON.stringify({ version: QUESTION_SET_VERSION, savedAt: Date.now(), payload }));
}

export function loadLastResult<T>(): T | null {
  if (getConsent() !== 'granted') return null;
  const raw = safeGetItem(KEY_RESULT);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { version?: number; payload?: T };
    if (parsed.version !== QUESTION_SET_VERSION) return null;
    return parsed.payload ?? null;
  } catch {
    return null;
  }
}

export function clearLastResult(): void {
  safeRemoveItem(KEY_RESULT);
}

/** 清除本站所有本地数据（进度 + 结果 + 同意状态） */
export function clearAll(): void {
  safeRemoveItem(KEY_PROGRESS);
  safeRemoveItem(KEY_RESULT);
  safeRemoveItem(KEY_CONSENT);
  // 清理旧版本键，避免历史数据残留
  safeRemoveItem('chl.progress.v1');
  safeRemoveItem('chl.last-result.v1');
}

export function storageAvailable(): boolean {
  try {
    const probe = '__chl_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
