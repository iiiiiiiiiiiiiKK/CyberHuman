import type { DimensionScore } from '../lib/scoring';

interface RadarChartProps {
  dimensions: DimensionScore[];
  size?: number;
}

const HUES: Record<string, string> = {
  green: '#6dffb0',
  violet: '#a97bff',
  cyan: '#5ce1ff',
  amber: '#ffc45c',
};

/**
 * 六维雷达图：纯 SVG，无第三方图表依赖。
 * 使用固定 viewBox，靠 CSS 宽度自适应。
 */
export default function RadarChart({ dimensions, size = 320 }: RadarChartProps) {
  const count = dimensions.length;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.31;
  const rings = [0.25, 0.5, 0.75, 1];

  const angleFor = (i: number) => (Math.PI * 2 * i) / count - Math.PI / 2;

  const pointFor = (i: number, ratio: number) => {
    const angle = angleFor(i);
    return {
      x: cx + Math.cos(angle) * radius * ratio,
      y: cy + Math.sin(angle) * radius * ratio,
    };
  };

  const polygonFor = (ratios: number[]) =>
    ratios
      .map((ratio, i) => {
        const p = pointFor(i, ratio);
        return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      })
      .join(' ');

  const dataRatios = dimensions.map((d) => Math.max(0.02, Math.min(1, d.value / 100)));
  const dataPolygon = polygonFor(dataRatios);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`六维属性雷达图：${dimensions.map((d) => `${d.label} ${d.value}`).join('，')}`}
    >
      <defs>
        <radialGradient id="radar-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6dffb0" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#a97bff" stopOpacity="0.14" />
        </radialGradient>
      </defs>

      {/* 网格环 */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={polygonFor(dimensions.map(() => ring))}
          fill="none"
          stroke="rgba(109, 255, 176, 0.14)"
          strokeWidth={1}
        />
      ))}

      {/* 轴线 */}
      {dimensions.map((d, i) => {
        const p = pointFor(i, 1);
        return (
          <line
            key={d.key}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(109, 255, 176, 0.13)"
            strokeWidth={1}
          />
        );
      })}

      {/* 数据面 */}
      <polygon
        points={dataPolygon}
        fill="url(#radar-fill)"
        stroke="#6dffb0"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />

      {/* 数据点 */}
      {dimensions.map((d, i) => {
        const p = pointFor(i, dataRatios[i]);
        return (
          <circle
            key={d.key}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={HUES[d.hue] ?? '#6dffb0'}
            stroke="#05080a"
            strokeWidth={1.2}
          />
        );
      })}

      {/* 轴标签 */}
      {dimensions.map((d, i) => {
        const angle = angleFor(i);
        const labelRadius = radius + size * 0.105;
        const x = cx + Math.cos(angle) * labelRadius;
        const y = cy + Math.sin(angle) * labelRadius;
        const cos = Math.cos(angle);
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
        return (
          <g key={`l-${d.key}`}>
            <text
              x={x}
              y={y - 2}
              textAnchor={anchor}
              className="radar-axis-label"
              style={{ fill: HUES[d.hue] ?? '#8ba79b' }}
            >
              {d.short}
            </text>
            <text x={x} y={y + 10} textAnchor={anchor} className="radar-value-label">
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
