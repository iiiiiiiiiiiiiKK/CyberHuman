/**
 * 结果文本序列化：用于「复制结果」与分享降级方案。
 */
import type { RawResult } from './scoring';
import { SITE_AUTHOR_HANDLE, SITE_AUTHOR_URL, SITE_DISCLAIMER, SITE_NAME } from '../data/site';

export function resultToPlainText(result: RawResult): string {
  const lines: string[] = [];
  lines.push(`【${SITE_NAME} · 鉴定报告】`);
  lines.push(`鉴定编号：${result.serial}`);
  lines.push('');
  lines.push(`人格类型：${result.archetype.name}`);
  lines.push(`类型代号：${result.archetype.code}`);
  lines.push(`人类纯度：${result.purity}%（${result.purityLabel}）`);
  lines.push('');
  lines.push('—— 属性读数 ——');
  for (const dim of result.dimensions) {
    lines.push(`${dim.label}：${dim.gauge}（${dim.value}/100）`);
  }
  lines.push('');
  lines.push(`标签：${result.tags.join(' / ')}`);
  lines.push('');
  lines.push(`经典语录：${result.archetype.quote}`);
  lines.push('');
  for (const extra of result.extras) {
    lines.push(`${extra.label}：${extra.value}`);
  }
  lines.push('');
  lines.push(SITE_DISCLAIMER);
  lines.push(`作者 ${SITE_AUTHOR_HANDLE} · ${SITE_AUTHOR_URL}`);
  return lines.join('\n');
}

export function formatResultMarkdown(result: RawResult): string {
  const lines: string[] = [];
  lines.push(`# ${SITE_NAME} · ${result.archetype.name}`);
  lines.push('');
  lines.push(`> ${result.archetype.subtitle}`);
  lines.push('');
  lines.push(`- **人类纯度**：${result.purity}%（${result.purityLabel}）`);
  lines.push(`- **鉴定编号**：${result.serial}`);
  lines.push('');
  lines.push('| 属性 | 读数 | 分数 |');
  lines.push('| --- | --- | --- |');
  for (const dim of result.dimensions) {
    lines.push(`| ${dim.label} | ${dim.gauge} | ${dim.value} |`);
  }
  lines.push('');
  lines.push(`**标签**：${result.tags.map((t) => `\`${t}\``).join(' ')}`);
  lines.push('');
  lines.push(`**语录**：${result.archetype.quote}`);
  lines.push('');
  lines.push(SITE_DISCLAIMER);
  lines.push('');
  lines.push(`作者：[${SITE_AUTHOR_HANDLE}](${SITE_AUTHOR_URL})`);
  return lines.join('\n');
}
