/**
 * 分享卡压力测试：把全部结果类型 × 两种比例渲染出来，逐张检测文字裁切。
 * 用法：node scripts/share-stress.mjs [baseUrl]
 * 需要 dev server（脚本页只在开发服务器可用）。
 */
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:5173/share-stress.html';
const OUT = join(process.cwd(), '.stress-out');
mkdirSync(OUT, { recursive: true });

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const browser = await puppeteer.launch({
  executablePath: CHROME_PATHS.find((p) => existsSync(p)),
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1400, height: 1200 },
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.waitForSelector('.share-card', { timeout: 15000 });
await new Promise((r) => setTimeout(r, 600));

const report = await page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('.stress-item'));
  return items.map((item) => {
    const card = item.querySelector('.share-card');
    const cardRect = card.getBoundingClientRect();
    const problems = [];

    // 1) 溢出裁切检测
    for (const el of card.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const isScrollHidden = cs.overflow === 'hidden' || cs.overflowY === 'hidden';
      if (isScrollHidden) {
        const dh = el.scrollHeight - el.clientHeight;
        const dw = el.scrollWidth - el.clientWidth;
        if (dh > 1 || dw > 1) {
          // -webkit-line-clamp 的省略是设计行为，允许（但记录）
          problems.push({
            kind: cs.webkitLineClamp !== 'none' ? 'clamp' : 'clip',
            cls: String(el.className || el.tagName),
            text: (el.textContent ?? '').trim().slice(0, 26),
            dh,
            dw,
          });
        }
      }
    }

    // 2) 出界检测（叶子文本节点）
    for (const el of card.querySelectorAll('*')) {
      if (el.children.length > 0) continue;
      const t = (el.textContent ?? '').trim();
      if (!t) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (
        r.bottom > cardRect.bottom + 0.5 ||
        r.right > cardRect.right + 0.5 ||
        r.top < cardRect.top - 0.5 ||
        r.left < cardRect.left - 0.5
      ) {
        problems.push({
          kind: 'out-of-bounds',
          cls: String(el.className || el.tagName),
          text: t.slice(0, 26),
          box: [r.left - cardRect.left, r.top - cardRect.top, r.right - cardRect.left, r.bottom - cardRect.top].map((n) => Math.round(n)),
        });
      }
    }

    // 3) 主体内容是否超出可用高度（sc-main 内部）
    const main = card.querySelector('.sc-main');
    const inner = card.querySelector('.sc-inner');
    if (main && inner) {
      if (main.scrollHeight > main.clientHeight + 1) {
        problems.push({ kind: 'main-overflow', dh: main.scrollHeight - main.clientHeight });
      }
      if (inner.scrollHeight > inner.clientHeight + 1) {
        problems.push({ kind: 'inner-overflow', dh: inner.scrollHeight - inner.clientHeight });
      }
    }

    return {
      archetype: item.getAttribute('data-archetype'),
      ratio: item.getAttribute('data-ratio'),
      size: [Math.round(cardRect.width), Math.round(cardRect.height)],
      problems,
    };
  });
});

let hard = 0;
let soft = 0;
for (const r of report) {
  const hardProblems = r.problems.filter((p) => p.kind !== 'clamp');
  const softProblems = r.problems.filter((p) => p.kind === 'clamp');
  if (hardProblems.length) {
    hard += 1;
    console.log(`✕ ${r.archetype} ${r.ratio} ${r.size.join('×')}`);
    for (const p of hardProblems) console.log(`    ${p.kind} ${p.cls} ${JSON.stringify(p)}`);
  }
  if (softProblems.length) soft += 1;
}

// 截一张总览图便于人工核对
await page.screenshot({ path: join(OUT, 'stress-overview.png'), fullPage: false });

console.log(`\n共检测 ${report.length} 张卡片（${report.length / 2} 种类型 × 2 种比例）`);
console.log(`硬性问题（裁切/溢出/出界）: ${hard}`);
console.log(`软性问题（行数省略）: ${soft}`);
if (errors.length) {
  console.log('页面错误:', errors);
}

// 单独导出最长名称的一张，人工可看
const longest = await page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('.stress-item'));
  let best = null;
  for (const it of items) {
    const name = it.querySelector('.sc-title')?.textContent ?? '';
    if (!best || name.length > best.name.length) best = { id: it.getAttribute('data-archetype'), name };
  }
  return best;
});
console.log(`最长类型名：${longest?.name} (${longest?.id})`);

await browser.close();
process.exit(hard ? 1 : 0);
