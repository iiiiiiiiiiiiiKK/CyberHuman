interface ScanOverlayProps {
  enabled?: boolean;
}

/**
 * 固定背景装饰层：扫描线 + 移动光束。
 * 纯装饰，全部 pointer-events: none，并在 prefers-reduced-motion 下静态化。
 */
export default function ScanOverlay({ enabled = true }: ScanOverlayProps) {
  if (!enabled) return null;
  return (
    <>
      <div className="scanlines" aria-hidden="true" />
      <div className="scanbeam" aria-hidden="true" />
    </>
  );
}
