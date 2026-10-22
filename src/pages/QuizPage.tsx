import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '../data/questions';
import type { Answers } from '../lib/scoring';

interface QuizPageProps {
  paper: Question[];
  answers: Answers;
  index: number;
  onAnswer: (questionId: string, optionId: string) => void;
  onIndexChange: (index: number) => void;
  onFinish: () => void;
  onRestart: () => void;
  onExit: () => void;
  storageOn: boolean;
}

const KEY_HINTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function QuizPage({
  paper,
  answers,
  index,
  onAnswer,
  onIndexChange,
  onFinish,
  onRestart,
  onExit,
  storageOn,
}: QuizPageProps) {
  const total = paper.length;
  const safeIndex = Math.min(Math.max(0, index), total - 1);
  const question = paper[safeIndex];
  const selected = question ? answers[question.id] : undefined;

  const answeredCount = useMemo(
    () => paper.filter((q) => answers[q.id]).length,
    [paper, answers],
  );
  const progress = total ? Math.round((answeredCount / total) * 100) : 0;
  const isLast = safeIndex === total - 1;
  const isFirst = safeIndex === 0;
  const allAnswered = answeredCount === total;

  const [restartArmed, setRestartArmed] = useState(false);
  const [log, setLog] = useState('等待输入…');
  const panelRef = useRef<HTMLDivElement>(null);

  /* 切题时更新终端日志 */
  useEffect(() => {
    if (!question) return;
    const timer = window.setTimeout(() => {
      setLog(
        `Q${String(safeIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')} 已载入 · 主题：${question.topic}`,
      );
    }, 120);
    return () => window.clearTimeout(timer);
  }, [safeIndex, question, total]);

  useEffect(() => {
    if (window.scrollY > 120) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [safeIndex]);

  /* 键盘操作：数字键选择，← → 翻页，Enter 下一题 */
  useEffect(() => {
    if (!question) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const num = Number(e.key);
      if (Number.isInteger(num) && num >= 1 && num <= question.options.length) {
        e.preventDefault();
        onAnswer(question.id, question.options[num - 1].id);
        setLog(`已记录：选项 ${KEY_HINTS[num - 1]}`);
        return;
      }
      if (e.key === 'ArrowLeft' && !isFirst) {
        e.preventDefault();
        onIndexChange(safeIndex - 1);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (!selected) return;
        e.preventDefault();
        if (isLast) onFinish();
        else onIndexChange(safeIndex + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, safeIndex, isFirst, isLast, selected, onAnswer, onIndexChange, onFinish]);

  const handleNext = useCallback(() => {
    if (isLast) onFinish();
    else onIndexChange(safeIndex + 1);
  }, [isLast, safeIndex, onFinish, onIndexChange]);

  const handleRestart = useCallback(() => {
    if (!restartArmed) {
      setRestartArmed(true);
      window.setTimeout(() => setRestartArmed(false), 4000);
      return;
    }
    setRestartArmed(false);
    onRestart();
  }, [restartArmed, onRestart]);

  /* 空状态：试卷没有内容时给出明确提示，而不是白屏 */
  if (!question) {
    return (
      <div className="shell">
        <div className="panel">
          <div className="panel-label">
            <span>NO QUERIES</span>
          </div>
          <p style={{ color: 'var(--text-soft)', marginBottom: 18 }}>
            试卷加载失败（题库为空）。请重新开始一次检测。
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-primary btn-sm" onClick={onRestart}>
              重新生成试卷
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onExit}>
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="quiz-head">
        <div className="quiz-counter mono">
          <b>{String(safeIndex + 1).padStart(2, '0')}</b>
          <span className="of"> / {String(total).padStart(2, '0')}</span>
          <span style={{ marginLeft: 12, fontSize: 11, letterSpacing: '0.12em' }}>
            已答 {answeredCount} 题
          </span>
        </div>
        <div className="quiz-topic">主题 // {question.topic}</div>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`答题进度 ${progress}%`}
      >
        <div className="progress-fill" style={{ width: `${Math.max(2, progress)}%` }} />
      </div>

      <div className="panel question-panel" ref={panelRef}>
        <div className="panel-label">
          <span>DETECTION IN PROGRESS</span>
        </div>

        <h2 className="q-text" id="question-text">
          {question.text}
        </h2>
        {question.hint ? <p className="q-hint">{question.hint}</p> : null}

        <div className="options" role="radiogroup" aria-labelledby="question-text">
          {question.options.map((option, i) => {
            const isSelected = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  onAnswer(question.id, option.id);
                  setLog(`已记录：选项 ${KEY_HINTS[i] ?? i + 1}`);
                }}
              >
                <span className="option-key mono" aria-hidden="true">
                  {KEY_HINTS[i] ?? i + 1}
                </span>
                <span className="option-body">
                  <span className="option-label">{option.label}</span>
                  {option.note ? <span className="option-note">{option.note}</span> : null}
                </span>
                <span className="option-check" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className="quiz-nav">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onIndexChange(safeIndex - 1)}
            disabled={isFirst}
          >
            ← 上一步
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!selected}
          >
            {isLast ? (allAnswered ? '生成鉴定报告 →' : '生成报告（有未答题）→') : '下一步 →'}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm reset"
            onClick={handleRestart}
            style={restartArmed ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : undefined}
          >
            {restartArmed ? '再点一次确认重来' : '重新开始'}
          </button>

          <span className="spacer" />

          {allAnswered && !isLast ? (
            <button type="button" className="btn btn-violet btn-sm" onClick={onFinish}>
              直接查看报告
            </button>
          ) : null}

          <button type="button" className="btn btn-ghost btn-sm" onClick={onExit}>
            返回首页
          </button>
        </div>

        {!allAnswered && isLast ? (
          <p className="q-hint" style={{ marginTop: 16, marginBottom: 0, color: 'var(--amber)' }}>
            还有 {total - answeredCount} 题未作答，直接生成会按基准分计算，结果仅供参考。
          </p>
        ) : null}

        <div className="quiz-log" aria-live="polite">
          <span className="lamp" aria-hidden="true" />
          <span>{log}</span>
          <span style={{ marginLeft: 'auto', color: 'var(--muted-2)' }}>
            {storageOn ? '进度已本地保存' : '进度不保存'}
          </span>
        </div>
      </div>

      <div className="quiz-dots" aria-hidden="true">
        {paper.map((q, i) => (
          <i key={q.id} className={i === safeIndex ? 'now' : answers[q.id] ? 'done' : ''} />
        ))}
      </div>
    </div>
  );
}
