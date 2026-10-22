import { useEffect, useMemo, useState } from 'react';
import { SITE_NAME } from '../data/site';

interface ComputingScreenProps {
  answeredCount: number;
  total: number;
  onDone: () => void;
}

/**
 * 生成报告时的短暂「检测中」终端动画。
 * 主要作用是给出明确的状态反馈，而不是让结果页突然出现。
 * 动画总长约 1.1s，点击任意位置可立即跳过。
 */
export default function ComputingScreen({ answeredCount, total, onDone }: ComputingScreenProps) {
  const steps = useMemo(
    () => [
      { at: 0, text: `载入 ${answeredCount} 条作答样本` },
      { at: 260, text: '归一化注意力 / 情绪 / 社交向量' },
      { at: 520, text: '计算人类纯度加权指数' },
      { at: 760, text: '匹配人格类型库（16 型）' },
      { at: 980, text: '生成鉴定编号与报告文本' },
    ],
    [answeredCount],
  );
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    const timers = steps.slice(1).map((step, i) =>
      window.setTimeout(() => setVisible(i + 2), step.at),
    );
    const finish = window.setTimeout(onDone, 1180);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(finish);
    };
  }, [steps, onDone]);

  return (
    <div
      className="shell computing"
      role="status"
      aria-live="polite"
      onClick={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onDone();
      }}
      tabIndex={0}
    >
      <div className="panel computing-panel">
        <div className="panel-label">
          <span>ANALYSING / 检测中</span>
        </div>

        <div className="computing-title">
          {SITE_NAME}正在解析你的
          <span className="accent">人类残留度</span>
        </div>

        <div className="computing-bar" aria-hidden="true">
          <i />
        </div>

        <ul className="computing-log mono">
          {steps.slice(0, visible).map((step) => (
            <li key={step.text}>
              <span className="ok">✓</span>
              {step.text}
            </li>
          ))}
          {visible < steps.length ? (
            <li className="pending">
              <span className="spin">▸</span>
              {steps[visible].text}…
            </li>
          ) : null}
        </ul>

        <div className="computing-foot mono">
          样本 {answeredCount} / {total} · 结果仅供娱乐，点击可跳过
        </div>
      </div>
    </div>
  );
}
