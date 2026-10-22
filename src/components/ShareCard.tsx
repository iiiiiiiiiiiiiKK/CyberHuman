import { forwardRef } from 'react';
import type { RawResult } from '../lib/scoring';
import { SITE_AUTHOR_HANDLE, SITE_EN_NAME, SITE_NAME } from '../data/site';

export type ShareRatio = '1x1' | '3x4';

export const SHARE_DIMENSIONS: Record<ShareRatio, { width: number; height: number; scale: number }> = {
  '1x1': { width: 360, height: 360, scale: 3 }, // 导出 1080 × 1080
  '3x4': { width: 360, height: 480, scale: 3 }, // 导出 1080 × 1440
};

/**
 * 标题字号按字符数自适应：卡片宽度固定，长名字必须缩字号，
 * 否则换行后被裁切。这里是纯函数，同一名字永远得到同一字号。
 */
function titleFontSize(name: string, tall: boolean): number {
  const length = [...name].length;
  const max = tall ? 27 : 24;
  if (length <= 6) return max;
  if (length <= 8) return max - 2;
  if (length <= 10) return max - 4;
  if (length <= 13) return max - 6;
  if (length <= 16) return max - 8;
  return tall ? 17 : 16;
}

/** 语录字号自适应 */
function quoteFontSize(quote: string): number {
  const length = [...quote].length;
  if (length <= 14) return 11;
  if (length <= 20) return 10.5;
  if (length <= 26) return 9.5;
  return 9;
}

/** 按可用宽度估算一行能放多少字（全角按 1em，半角按 0.55em） */
function visualWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    width += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.56;
  }
  return width;
}

interface ShareCardProps {
  result: RawResult;
  ratio: ShareRatio;
}

/**
 * 分享图卡片。
 * 尺寸固定为 CSS 像素，导出时由 html-to-image 按 pixelRatio 放大。
 * 不使用 line-clamp 隐藏文字：字号随内容自适应，保证任何类型名都完整可见。
 */
const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { result, ratio },
  ref,
) {
  const isTall = ratio === '3x4';
  const gauges = result.dimensions.slice(0, isTall ? 6 : 4);
  const tags = result.tags.slice(0, isTall ? 5 : 3);
  const name = result.archetype.name;
  const titleSize = titleFontSize(name, isTall);
  // 内容区可用宽度：卡片 360 - 左右 padding 44 - 边框 2
  const availableWidth = 314;
  const charsPerLine = availableWidth / titleSize;
  const titleLines = Math.ceil(visualWidth(name) / charsPerLine);

  return (
    <div
      ref={ref}
      className={`share-card ratio-${ratio}${titleLines > 1 ? ' title-2lines' : ''}`}
      style={{ width: SHARE_DIMENSIONS[ratio].width, height: SHARE_DIMENSIONS[ratio].height }}
      data-share-card={ratio}
    >
      <div className="sc-inner">
        {/* 品牌 */}
        <div className="sc-brand">
          <div className="sc-brand-left">
            <span className="sc-logo">CH</span>
            <span className="sc-brand-name">{SITE_NAME}</span>
          </div>
          <span className="sc-brand-en">{SITE_EN_NAME}</span>
        </div>

        {/* 主体 */}
        <div className="sc-main">
          <div className="sc-eyebrow">鉴定结果 / REPORT</div>
          <h3 className="sc-title" style={{ fontSize: titleSize }}>
            {name}
          </h3>
          <p className="sc-sub">{result.archetype.subtitle}</p>

          <div className="sc-purity">
            <span className="sc-purity-num">{result.purity}%</span>
            <span className="sc-purity-label">人类纯度</span>
            <span className="sc-purity-verdict">{result.purityLabel}</span>
          </div>

          <div className="sc-gauges">
            {gauges.map((dim) => (
              <div className="sc-gauge" key={dim.key}>
                <span className="sc-gauge-name">{dim.short}</span>
                <span className="sc-gauge-track">
                  <span
                    className="sc-gauge-fill"
                    style={{ width: `${Math.max(2, Math.min(100, dim.value))}%` }}
                  />
                </span>
                <span className="sc-gauge-val">{dim.gauge}</span>
              </div>
            ))}
          </div>

          <div className="sc-tags">
            {tags.map((tag) => (
              <span className="sc-tag" key={tag}>
                #{tag}
              </span>
            ))}
          </div>

          {isTall ? (
            <>
              <p className="sc-quote" style={{ fontSize: quoteFontSize(result.archetype.quote) }}>
                {result.archetype.quote}
              </p>
              <div className="sc-advice">
                {result.archetype.advice.slice(0, 2).map((line, i) => (
                  <div className="sc-advice-item" key={line}>
                    <span>{`0${i + 1}`}</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* 页脚 */}
        <div className="sc-foot">
          <span className="sc-serial">{result.serial}</span>
          <span className="sc-author">{SITE_AUTHOR_HANDLE}</span>
          <span className="sc-disclaimer">娱乐测试 · 非心理诊断</span>
        </div>
      </div>
    </div>
  );
});

export default ShareCard;
