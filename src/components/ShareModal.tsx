import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RawResult } from '../lib/scoring';
import ShareCard, { SHARE_DIMENSIONS, type ShareRatio } from './ShareCard';
import {
  canShareFiles,
  captureWithRetry,
  copyBlobImage,
  copyText,
  downloadBlob,
  isMobileViewport,
  shareFile,
} from '../lib/image';
import { resultToPlainText } from '../lib/share';
import { SITE_NAME } from '../data/site';

interface ShareModalProps {
  result: RawResult;
  onClose: () => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; text: string }
  | { kind: 'ok'; text: string }
  | { kind: 'error'; text: string };

export default function ShareModal({ result, onClose }: ShareModalProps) {
  const [ratio, setRatio] = useState<ShareRatio>('1x1');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [scale, setScale] = useState(1);

  const exportRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const dims = SHARE_DIMENSIONS[ratio];
  const mobile = useMemo(() => isMobileViewport(), []);
  const plainText = useMemo(() => resultToPlainText(result), [result]);

  /* 预览缩放：等比缩放到容器宽度，不改变导出尺寸 */
  useLayoutEffect(() => {
    const box = previewBoxRef.current;
    if (!box) return;
    const update = () => {
      const w = box.clientWidth;
      if (w > 0) setScale(Math.min(1, w / dims.width));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, [dims.width]);

  /* Esc 关闭 + 焦点管理 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const filename = `赛博人类鉴定-${result.archetype.name}-${ratio === '1x1' ? '1080' : '1080x1440'}.png`;

  const handleDownload = useCallback(async () => {
    setStatus({ kind: 'busy', text: '正在渲染分享图…' });
    try {
      const blob = await captureWithRetry(exportRef, { pixelRatio: dims.scale });
      downloadBlob(blob, filename);
      setStatus({ kind: 'ok', text: `已生成 ${dims.width * dims.scale} × ${dims.height * dims.scale} PNG，已开始下载。` });
    } catch (error) {
      setStatus({
        kind: 'error',
        text: error instanceof Error ? error.message : '渲染失败，请改用手机截图。',
      });
    }
  }, [dims.scale, dims.width, dims.height, filename]);

  const handleCopyImage = useCallback(async () => {
    setStatus({ kind: 'busy', text: '正在复制图片…' });
    try {
      const blob = await captureWithRetry(exportRef, { pixelRatio: dims.scale });
      const ok = await copyBlobImage(blob);
      if (ok) {
        setStatus({ kind: 'ok', text: '分享图已复制到剪贴板，可以直接粘贴到聊天窗口。' });
      } else {
        const copiedText = await copyText(plainText);
        setStatus({
          kind: copiedText ? 'ok' : 'error',
          text: copiedText
            ? '当前浏览器不支持复制图片，已改为复制文字结果。'
            : '当前浏览器不支持复制图片，请改用「下载图片」。',
        });
      }
    } catch (error) {
      setStatus({
        kind: 'error',
        text: error instanceof Error ? error.message : '复制失败，请改用「下载图片」。',
      });
    }
  }, [dims.scale, plainText]);

  const handleSystemShare = useCallback(async () => {
    setStatus({ kind: 'busy', text: '正在准备系统分享…' });
    try {
      const blob = await captureWithRetry(exportRef, { pixelRatio: dims.scale });
      const file = new File([blob], filename, { type: 'image/png' });
      if (!canShareFiles(file)) {
        downloadBlob(blob, filename);
        setStatus({
          kind: 'ok',
          text: '此环境不支持系统分享，已自动改为下载图片。',
        });
        return;
      }
      const r = await shareFile(file, `${SITE_NAME}：${result.archetype.name}，人类纯度 ${result.purity}%`, SITE_NAME);
      setStatus(
        r === 'shared'
          ? { kind: 'ok', text: '已调起系统分享。' }
          : { kind: 'idle' },
      );
    } catch (error) {
      setStatus({
        kind: 'error',
        text: error instanceof Error ? error.message : '系统分享失败，请改用「下载图片」。',
      });
    }
  }, [dims.scale, filename, result.archetype.name, result.purity]);

  const handleCopyText = useCallback(async () => {
    const ok = await copyText(plainText);
    setStatus(
      ok
        ? { kind: 'ok', text: '结果文字已复制，可直接粘贴分享。' }
        : { kind: 'error', text: '复制失败，请手动选择文字复制。' },
    );
  }, [plainText]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <div className="modal-head">
          <span className="modal-title" id="share-modal-title">
            生成分享图
          </span>
          <button
            ref={closeRef}
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="关闭分享面板"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="ratio-tabs" role="tablist" aria-label="分享图比例">
            <button
              type="button"
              role="tab"
              aria-selected={ratio === '1x1'}
              className="ratio-tab"
              onClick={() => setRatio('1x1')}
            >
              1:1 方图
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={ratio === '3x4'}
              className="ratio-tab"
              onClick={() => setRatio('3x4')}
            >
              3:4 竖图
            </button>
          </div>

          <div
            ref={previewBoxRef}
            className="share-preview-frame"
            style={{ height: dims.height * scale }}
          >
            <div
              className="share-preview-inner"
              style={{ transform: `scale(${scale})`, width: dims.width, height: dims.height }}
            >
              <ShareCard result={result} ratio={ratio} />
            </div>
          </div>

          <p className="share-hint">
            导出尺寸 {dims.width * dims.scale} × {dims.height * dims.scale} px。
            {mobile
              ? '手机上可用系统分享直接发到微信等应用，也可以长按图片保存。'
              : '桌面端可下载 PNG 或复制图片后粘贴。'}
          </p>

          {status.kind !== 'idle' ? (
            <div className={`share-status ${status.kind === 'error' ? 'error' : ''}`} role="status">
              {status.kind === 'busy' ? '▸ ' : status.kind === 'ok' ? '✓ ' : '✕ '}
              {status.text}
            </div>
          ) : null}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleDownload}>
            下载图片
          </button>
          <button type="button" className="btn btn-sm" onClick={handleCopyImage}>
            复制图片
          </button>
          {mobile ? (
            <button type="button" className="btn btn-violet btn-sm" onClick={handleSystemShare}>
              系统分享
            </button>
          ) : null}
          <span className="grow" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleCopyText}>
            复制文字
          </button>
        </div>
      </div>

      {/* 离屏渲染宿主：保证导出尺寸不受预览缩放影响 */}
      <div className="share-render-host" aria-hidden="true">
        <ShareCard ref={exportRef} result={result} ratio={ratio} />
      </div>
    </div>
  );
}
