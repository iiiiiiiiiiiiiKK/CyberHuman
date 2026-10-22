import type { Question } from '../data/questions';
import type { Answers } from '../lib/scoring';

interface ReviewPageProps {
  paper: Question[];
  answers: Answers;
  onBack: () => void;
  onRestart: () => void;
  onEditQuestion: (index: number) => void;
}

export default function ReviewPage({ paper, answers, onBack, onRestart, onEditQuestion }: ReviewPageProps) {
  return (
    <div className="shell">
      <div className="result-head">
        <span className="serial">回看答案 · 本次共 {paper.length} 题</span>
        <span className="stamp">点击任意一题可修改</span>
      </div>

      <div className="panel" style={{ marginBottom: 22 }}>
        <div className="panel-label">
          <span>答案清单 / ANSWER LOG</span>
        </div>

        <ol style={{ display: 'grid', gap: 10 }}>
          {paper.map((q, i) => {
            const optionId = answers[q.id];
            const option = q.options.find((o) => o.id === optionId);
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => onEditQuestion(i)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: 14,
                    width: '100%',
                    textAlign: 'left',
                    padding: '13px 15px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(255,255,255,0.018)',
                    alignItems: 'start',
                  }}
                >
                  <span className="mono" style={{ fontSize: 11, color: 'var(--green)', paddingTop: 2 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 4 }}>
                      {q.text}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 12,
                        color: option ? 'var(--green-soft)' : 'var(--danger)',
                      }}
                    >
                      {option ? `→ ${option.label}` : '→ 未作答（按基准分计算）'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="btn-row" style={{ marginTop: 22 }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={onBack}>
            ← 返回报告
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onRestart}>
            重新测试
          </button>
        </div>
      </div>
    </div>
  );
}
