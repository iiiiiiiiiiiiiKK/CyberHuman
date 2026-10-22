import { toBlob, toPng } from 'html-to-image';
import type { RefObject } from 'react';

export interface ExportOptions {
  pixelRatio?: number;
  backgroundColor?: string;
}

/**
 * 把 DOM 节点导出为 PNG Blob。
 * html-to-image 使用 SVG foreignObject 渲染，避免 Canvas 手绘文字排版问题。
 */
export async function nodeToBlob(
  node: HTMLElement,
  options: ExportOptions = {},
): Promise<Blob> {
  await waitForFonts();
  // 首次调用时 html-to-image 需要预热（加载内联资源），失败一次重试可显著提升成功率
  const opts = {
    pixelRatio: options.pixelRatio ?? 3,
    backgroundColor: options.backgroundColor ?? '#05080a',
    cacheBust: true,
    skipFonts: false,
  };

  let blob: Blob | null = null;
  try {
    blob = await toBlob(node, opts);
  } catch {
    blob = null;
  }
  if (!blob) {
    blob = await toBlob(node, { ...opts, pixelRatio: Math.min(2, opts.pixelRatio) });
  }
  if (!blob) {
    throw new Error('图片渲染失败，请重试或改用手机截图。');
  }
  return blob;
}

export async function nodeToDataUrl(
  node: HTMLElement,
  options: ExportOptions = {},
): Promise<string> {
  await waitForFonts();
  const opts = {
    pixelRatio: options.pixelRatio ?? 3,
    backgroundColor: options.backgroundColor ?? '#05080a',
    cacheBust: true,
  };
  try {
    return await toPng(node, opts);
  } catch {
    return await toPng(node, { ...opts, pixelRatio: Math.min(2, opts.pixelRatio) });
  }
}

async function waitForFonts(): Promise<void> {
  try {
    if (document.fonts?.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
  } catch {
    /* 字体 API 不可用时直接继续 */
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 给浏览器一点时间开始下载后再释放
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(ua) || touch;
}

export function canShareFiles(file: File): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      typeof navigator.share === 'function' &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
}

export async function shareFile(file: File, text: string, title: string): Promise<'shared' | 'aborted'> {
  try {
    await navigator.share({ files: [file], text, title });
    return 'shared';
  } catch (error) {
    // 用户主动取消不算失败
    if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotAllowedError')) {
      return 'aborted';
    }
    throw error;
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 继续走降级方案 */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export async function copyBlobImage(blob: Blob): Promise<boolean> {
  try {
    const ClipboardItemCtor = window.ClipboardItem;
    if (!navigator.clipboard?.write || !ClipboardItemCtor) return false;
    const item = new ClipboardItemCtor({ [blob.type || 'image/png']: blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}

/** 等待节点完成一次布局，确保导出前尺寸稳定 */
export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export async function captureWithRetry(
  ref: RefObject<HTMLElement | null>,
  options: ExportOptions,
): Promise<Blob> {
  const node = ref.current;
  if (!node) throw new Error('分享图尚未准备好，请稍后重试。');
  await nextFrame();
  return nodeToBlob(node, options);
}
