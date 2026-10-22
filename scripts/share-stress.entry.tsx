import { createRoot } from 'react-dom/client';
import { ARCHETYPES } from '../src/data/archetypes';
import { DIMENSIONS, gaugeLabel } from '../src/data/dimensions';
import ShareCard, { SHARE_DIMENSIONS, type ShareRatio } from '../src/components/ShareCard';
import type { RawResult } from '../src/lib/scoring';
import '../src/styles/global.css';
import '../src/styles/share.css';

/**
 * 仅用于测试的分享卡压力页：把全部结果类型 × 两种比例一次渲染出来，
 * 便于自动化脚本检测文字裁切。不会进入生产构建。
 */

function makeResult(index: number): RawResult {
  const archetype = ARCHETYPES[index];
  // 用极值构造最坏情况：长文案 + 极端分数
  const dimensions = DIMENSIONS.map((dim, i) => {
    const value = [0, 100, 8, 92, 45, 77][i % 6];
    return {
      key: dim.key,
      label: dim.label,
      short: dim.short,
      desc: dim.desc,
      hue: dim.hue,
      value,
      gauge: gaugeLabel(dim.key, value),
      weight: dim.weight,
    };
  });
  const purity = [0, 100, 37, 63][index % 4];
  return {
    serial: 'CHL-2026-9ZZZ-ZZZZ',
    purity,
    purityLabel: purity >= 70 ? '接近出厂设置' : purity >= 34 ? '大面积数字化' : '已高度优化为非人类',
    dimensions,
    archetype,
    tags: [...archetype.tags, '#测试标签一', '#测试标签二'].slice(0, 5),
    answeredCount: 18,
    extras: [],
    seed: 'stress',
    version: 3,
  };
}

function Stress() {
  const ratios: ShareRatio[] = ['1x1', '3x4'];
  return (
    <div>
      {ARCHETYPES.map((a, i) =>
        ratios.map((ratio) => (
          <div
            key={`${a.id}-${ratio}`}
            className="stress-item"
            data-archetype={a.id}
            data-ratio={ratio}
            style={{ display: 'inline-block', margin: 6 }}
          >
            <ShareCard result={makeResult(i)} ratio={ratio} />
          </div>
        )),
      )}
      <div style={{ display: 'none' }} data-meta={JSON.stringify(SHARE_DIMENSIONS)} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Stress />);
