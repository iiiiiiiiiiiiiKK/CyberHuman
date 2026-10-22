import { useEffect, useMemo, useState } from 'react';
import { DIMENSIONS } from '../data/dimensions';
import { ESTIMATED_MINUTES, SITE_DISCLAIMER, SITE_SLOGAN } from '../data/site';
import { QUESTION_POOL } from '../data/questions';
import { randomPreview } from '../lib/scoring';
import type { StoredProgress } from '../lib/storage';
import type { RawResult } from '../lib/scoring';

interface HomePageProps {
  progress: StoredProgress | null;
  lastResult: RawResult | null;
  consent: 'granted' | 'denied' | 'unset';
  storageOk: boolean;
  /** 单次检测题量（从题库随机抽取） */
  paperSize: number;
  onStart: () => void;
  onResume: () => void;
  onDiscardProgress: () => void;
  onViewLastResult: () => void;
  onGrantConsent: () => void;
  onDenyConsent: () => void;
}

export default function HomePage({
  progress,
  lastResult,
  consent,
  storageOk,
  paperSize,
  onStart,
  onResume,
  onDiscardProgress,
  onViewLastResult,
  onGrantConsent,
  onDenyConsent,
}: HomePageProps) {
  const [previewSeed, setPreviewSeed] = useState(0);
  const preview = useMemo(() => randomPreview(), [previewSeed]);
  const [typed, setTyped] = useState('');

  /* 标题打字数动画：只播放一次，且尊重 prefers-reduced-motion */
  useEffect(() => {
    const text = SITE_SLOGAN;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setTyped(text);
      return;
    }
    let i = 0;
    const timer = window.setInterval(() => {
      i += 2;
      setTyped(text.slice(0, i));
      if (i >= text.length) window.clearInterval(timer);
    }, 26);
    return () => window.clearInterval(timer);
  }, []);

  const answeredCount = progress ? Object.keys(progress.answers).length : 0;

  return (
    <div className="shell">
      {progress && answeredCount > 0 ? (
        <div className="resume-bar">
          <span className="resume-text">
            {answeredCount === paperSize ? (
              <>
                检测到一份已答完但尚未生成报告的答卷（<b>{paperSize}</b> 题）。
              </>
            ) : (
              <>
                检测到上次未完成的答卷：已完成 <b>{answeredCount}</b> / {paperSize} 题。
              </>
            )}
          </span>
          <span className="resume-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={onResume}>
              {answeredCount === paperSize ? '继续并生成报告' : '继续答题'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onDiscardProgress}>
              放弃并重来
            </button>
          </span>
        </div>
      ) : null}

      {!progress && lastResult ? (
        <div className="resume-bar">
          <span className="resume-text">
            上一次的鉴定结果还在本机：<b>{lastResult.archetype.name}</b> · 人类纯度 {lastResult.purity}%
          </span>
          <span className="resume-actions">
            <button type="button" className="btn btn-sm" onClick={onViewLastResult}>
              查看上次结果
            </button>
          </span>
        </div>
      ) : null}

      <section className="hero">
        <div>
          <div className="hero-eyebrow">Cyber Human Lab · 终端 v1.1</div>

          <h1 className="hero-title">
            <span className="line">检测一下，</span>
            <span className="line">
              你还剩多少<span className="accent">人类属性</span>？
            </span>
          </h1>

          <p className="hero-lead">
            {typed}
            <span className="caret" aria-hidden="true" />
            <br />
            从 <strong>{QUESTION_POOL.length}</strong> 道题里随机抽 {paperSize} 道，
            覆盖网络生活、拖延、情绪、社交、消费与执行力，
            由本地规则计算出一份属于你的<strong>赛博人类鉴定报告</strong>。
          </p>

          <dl className="spec-row">
            <div className="spec">
              <dt>单次题量</dt>
              <dd>{paperSize} 题</dd>
            </div>
            <div className="spec">
              <dt>题库总量</dt>
              <dd>{QUESTION_POOL.length} 题</dd>
            </div>
            <div className="spec">
              <dt>预计耗时</dt>
              <dd>{ESTIMATED_MINUTES} 分钟</dd>
            </div>
            <div className="spec">
              <dt>数据上传</dt>
              <dd>无</dd>
            </div>
          </dl>

          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={onStart}>
              开始检测 →
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPreviewSeed((s) => s + 1)}
            >
              换一个结果预览
            </button>
          </div>

          <p className="hero-note">
            <span aria-hidden="true" className="mono" style={{ color: 'var(--amber)' }}>
              ⚠
            </span>
            <span>
              这是一个娱乐向的趣味测试，结果由固定规则生成，<b>不是心理测评</b>，
              不具备任何诊断效力。答题数据只保存在你自己的浏览器中，不上传服务器。
            </span>
          </p>

          {storageOk && consent === 'unset' ? (
            <div className="consent-card">
              <p>
                是否允许本站使用浏览器本地存储（localStorage）保存答题进度？
                同意后，刷新页面可以继续未完成的答卷；拒绝则完全不留痕迹，
                但你将无法恢复进度。
              </p>
              <div className="consent-actions">
                <button type="button" className="btn btn-sm btn-primary" onClick={onGrantConsent}>
                  允许保存进度
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={onDenyConsent}>
                  不用，谢谢
                </button>
              </div>
            </div>
          ) : null}

          {!storageOk ? (
            <div className="consent-card">
              <p>
                当前浏览器禁用了本地存储（可能是隐私模式）。检测仍可正常完成，
                但刷新页面后进度无法恢复。
              </p>
            </div>
          ) : null}
        </div>

        <aside className="panel preview-panel">
          <div className="preview-head">
            <span className="panel-label" style={{ marginBottom: 0 }}>
              结果预览
            </span>
            <span className="preview-chip">随机样本</span>
          </div>

          <div className="preview-name">{preview.archetype.name}</div>
          <div className="preview-code">{preview.archetype.code}</div>

          <div className="preview-purity">
            <span className="num">{preview.purity}</span>
            <span className="unit">% 人类纯度</span>
          </div>

          <div className="preview-gauges">
            {preview.gauges.map((g) => (
              <div className="mini-gauge" key={g.label}>
                <span className="name">{g.label}</span>
                <span className="mini-bar">
                  <i style={{ width: `${g.value}%` }} />
                </span>
                <span className="val">{g.gauge}</span>
              </div>
            ))}
          </div>

          <div className="preview-foot">// 预览为随机样本，与你的实际结果无关</div>
        </aside>
      </section>

      <section className="home-sections">
        <div className="home-block">
          <h3>检测什么</h3>
          <p>
            注意力余额、情绪稳定性、社交进程、执行力、消费理性、现实锚定 —— 六个维度，
            每个维度都会给出一个读数。
          </p>
          <div className="dimension-list">
            {DIMENSIONS.map((d) => (
              <span key={d.key}>{d.short}</span>
            ))}
          </div>
        </div>
        <div className="home-block">
          <h3>怎么算</h3>
          <p>
            每次开始检测都会从 {QUESTION_POOL.length} 道题库里按主题配额随机抽 {paperSize} 道，
            题目顺序和选项顺序也都会打乱。选项对维度有固定加减分，从基准分累加后折算成
            「人类纯度」，最后匹配到 16 种结果类型之一。
          </p>
        </div>
        <div className="home-block">
          <h3>隐私</h3>
          <p>
            没有账号、没有数据库、没有后端接口。答案只在你自己的浏览器里参与计算，
            任何时候都可以用页脚的「清除本地数据」一键抹掉。
          </p>
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <div className="disclaimer-box">
          <strong>免责声明</strong>
          <ul>
            <li>{SITE_DISCLAIMER}</li>
            <li>结果只是你在这套题目下的选项组合，不能用来评价自己或他人的性格与能力。</li>
            <li>如果你正在经历持续的情绪困扰，请寻求专业心理服务，本测试无法替代。</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
