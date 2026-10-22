import { useMemo, useState } from 'react';
import RadarChart from '../components/RadarChart';
import ShareModal from '../components/ShareModal';
import { SITE_DISCLAIMER, SITE_NAME } from '../data/site';
import { copyText } from '../lib/image';
import type { RawResult } from '../lib/scoring';
import { formatResultMarkdown, resultToPlainText } from '../lib/share';

interface ResultPageProps {
  result: RawResult;
  onRestart: () => void;
  onHome: () => void;
  onReviewAnswers: () => void;
}

const HUE_VAR: Record<string, string> = {
  green: 'var(--green)',
  violet: 'var(--violet)',
  cyan: 'var(--cyan)',
  amber: 'var(--amber)',
};

function PurityDial({ value }: { value: number }) {
  const size = 240;
  const r = 96;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * r; // 半圆
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;

  return (
    <div className="purity-dial">
      <svg viewBox={`0 0 ${size} ${size * 0.62}`} role="img" aria-label={`人类纯度 ${value}%`}>
        <defs>
          <linearGradient id="dial-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a97bff" />
            <stop offset="55%" stopColor="#6dffb0" />
            <stop offset="100%" stopColor="#6dffb0" />
          </linearGradient>
        </defs>

        {/* 背景半圆 */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(109, 255, 176, 0.13)"
          strokeWidth={10}
          strokeLinecap="butt"
        />

        {/* 刻度 */}
        {Array.from({ length: 11 }).map((_, i) => {
          const angle = Math.PI - (Math.PI * i) / 10;
          const outer = r + 12;
          const inner = r + (i % 5 === 0 ? 4 : 7);
          return (
            <line
              key={i}
              x1={cx + Math.cos(angle) * inner}
              y1={cy - Math.sin(angle) * inner}
              x2={cx + Math.cos(angle) * outer}
              y2={cy - Math.sin(angle) * outer}
              stroke={i % 5 === 0 ? 'rgba(109, 255, 176, 0.45)' : 'rgba(109, 255, 176, 0.2)'}
              strokeWidth={1}
            />
          );
        })}

        {/* 值弧 */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#dial-grad)"
          strokeWidth={10}
          strokeDasharray={`${dash} ${circumference}`}
          style={{ filter: 'drop-shadow(0 0 8px rgba(109,255,176,0.5))' }}
        />

        {/* 端点 */}
        {(() => {
          const angle = Math.PI - (Math.PI * clamped) / 100;
          return (
            <circle
              cx={cx + Math.cos(angle) * r}
              cy={cy - Math.sin(angle) * r}
              r={4.5}
              fill="#eafff2"
            />
          );
        })()}
      </svg>

      <div className="dial-center" style={{ paddingTop: 8 }}>
        <div className="dial-num">
          {value}
          <sup>%</sup>
        </div>
        <div className="dial-cap">人类纯度</div>
      </div>
    </div>
  );
}

export default function ResultPage({
  result,
  onRestart,
  onHome,
  onReviewAnswers,
}: ResultPageProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'error'>('idle');
  const [mdMode, setMdMode] = useState(false);

  const plainText = useMemo(
    () => (mdMode ? formatResultMarkdown(result) : resultToPlainText(result)),
    [result, mdMode],
  );

  const handleCopy = async () => {
    const ok = await copyText(plainText);
    setCopyState(ok ? 'ok' : 'error');
    window.setTimeout(() => setCopyState('idle'), 3200);
  };

  return (
    <div className="shell">
      <div className="result-head">
        <span className="serial">
          鉴定编号 <b>{result.serial}</b> · 已作答 {result.answeredCount} 题
        </span>
        <span className="stamp">娱乐内容 · 非诊断</span>
      </div>

      {/* 判定主体 */}
      <section className="verdict">
        <div>
          <h1 className="verdict-name">{result.archetype.name}</h1>
          <p className="verdict-sub">{result.archetype.subtitle}</p>
          <div className="tag-row">
            {result.tags.map((tag, i) => (
              <span className={`tag ${i % 2 === 1 ? 'violet' : ''}`} key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: 18 }}>
          <PurityDial value={result.purity} />
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <div className="dial-verdict">{result.purityLabel}</div>
            <div
              className="mono"
              style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--muted-2)', marginTop: 8 }}
            >
              {result.archetype.rarity}
            </div>
          </div>
        </div>
      </section>

      <p className="verdict-desc" style={{ marginBottom: 30, maxWidth: '72ch' }}>
        {result.archetype.description}
      </p>

      {/* 数据区 */}
      <section className="result-grid">
        <div className="panel">
          <div className="panel-label">
            <span>属性读数 / GAUGES</span>
          </div>
          <div className="gauge-list">
            {result.dimensions.map((dim) => (
              <div
                className="gauge"
                key={dim.key}
                style={{ ['--hue' as string]: HUE_VAR[dim.hue] }}
              >
                <div className="gauge-head">
                  <span className="gauge-name">{dim.label}</span>
                  <span className="gauge-read">
                    {dim.gauge}
                    <em>{dim.value}/100</em>
                  </span>
                </div>
                <div className="gauge-track">
                  <i style={{ width: `${Math.max(2, dim.value)}%` }} />
                </div>
                <div className="gauge-desc">{dim.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-label">
            <span>维度分布 / RADAR</span>
          </div>
          <div className="radar-wrap">
            <RadarChart dimensions={result.dimensions} />
          </div>
        </div>
      </section>

      {/* 附加指标 */}
      <dl className="extras-grid">
        {result.extras.map((extra) => (
          <div className="extra-cell" key={extra.label}>
            <dt>{extra.label}</dt>
            <dd>
              {extra.value}
              <span className="extra-hint">{extra.hint}</span>
            </dd>
          </div>
        ))}
      </dl>

      {/* 优缺点 */}
      <section className="dual">
        <div className="dual-col">
          <h4>优势模块</h4>
          <ul>
            {result.archetype.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="dual-col bad">
          <h4>待修缺陷</h4>
          <ul>
            {result.archetype.weaknesses.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 语录 */}
      <section className="quote-block">
        <p className="quote-text">{result.archetype.quote}</p>
        <span className="quote-label">Classic Quote · 经典语录</span>
      </section>

      {/* 建议 */}
      <section className="panel" style={{ marginBottom: 26 }}>
        <div className="panel-label">
          <span>行动建议 / RECOMMENDED PATCH</span>
        </div>
        <ul className="advice-list">
          {result.archetype.advice.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>

      {/* 操作区 */}
      <section className="result-actions">
        <button type="button" className="btn btn-primary" onClick={() => setShareOpen(true)}>
          生成分享图
        </button>
        <button type="button" className="btn" onClick={handleCopy}>
          {copyState === 'ok' ? '✓ 已复制' : copyState === 'error' ? '✕ 复制失败' : '复制结果'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onReviewAnswers}>
          回看答案
        </button>
        <button type="button" className="btn btn-ghost" onClick={onRestart}>
          重新测试
        </button>
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          返回首页
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={mdMode}
          className={`btn btn-ghost btn-sm ${mdMode ? 'is-on' : ''}`}
          onClick={() => setMdMode((v) => !v)}
          style={{ marginLeft: 'auto' }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              border: '1px solid currentColor',
              background: mdMode ? 'currentColor' : 'transparent',
              display: 'inline-block',
            }}
          />
          Markdown 格式
        </button>
      </section>

      <div className="disclaimer-box">
        <strong>免责声明</strong>
        <ul>
          <li>{SITE_DISCLAIMER}</li>
          <li>
            本报告由本地固定规则计算，同一组答案永远得到同一结果；不同答案会得到不同结果，
            但类型名称与文案都是写死的娱乐内容。
          </li>
          <li>分享图与复制结果中同样标注了娱乐属性，请勿当作心理测评结论传播。</li>
          <li>如需清除本机保存的这份结果，请使用页面底部的「清除本地数据」。</li>
        </ul>
      </div>

      {shareOpen ? <ShareModal result={result} onClose={() => setShareOpen(false)} /> : null}

      <p className="sr-only">
        {SITE_NAME} 鉴定结果页面，当前类型 {result.archetype.name}，人类纯度 {result.purity}%。
      </p>
    </div>
  );
}
