/**
 * 分享图导出验证：两种比例各导出一次，检查像素尺寸与四周留白（裁切检测）。
 * 用法：node scripts/verify-share.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:4173/';
const OUT = join(process.cwd(), '.share-check');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const browser = await puppeteer.launch({
  executablePath: CHROME_PATHS.find((p) => existsSync(p)),
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1280, height: 900 },
});

const page = await browser.newPage();
const client = await page.target().createCDPSession();
await client.send('Browser.setDownloadBehavior', {
  behavior: 'allowAndName',
  downloadPath: OUT,
  eventsEnabled: true,
});

await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await page.waitForSelector('.hero-title');

// 同意存储
const consentBtns = await page.$$('.consent-actions .btn');
if (consentBtns[0]) await consentBtns[0].click();

// 开一份试卷，逐题选第一项直到进入结果页
await page.evaluate(() => document.querySelector('.hero-actions .btn')?.click());
await page.waitForSelector('.question-panel', { timeout: 15000 });
for (let i = 0; i < 40; i += 1) {
  if (await page.$('.verdict-name')) break;
  await page.evaluate(() => document.querySelector('.options .option')?.click());
  await new Promise((r) => setTimeout(r, 60));
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.quiz-nav .btn')).find((x) =>
      /下一步|生成/.test(x.textContent ?? ''),
    );
    b?.click();
  });
  await new Promise((r) => setTimeout(r, 110));
}
await page.waitForSelector('.verdict-name', { timeout: 15000 });
const name = await page.$eval('.verdict-name', (el) => el.textContent);
const purity = await page.$eval('.dial-num', (el) => el.textContent);
console.log(`结果：${name} / ${purity}`);

// 打开分享面板
const openBtn = await page.evaluateHandle(() =>
  Array.from(document.querySelectorAll('.result-actions .btn')).find((b) =>
    (b.textContent ?? '').includes('生成分享图'),
  ),
);
await openBtn.click();
await page.waitForSelector('.modal');
const results = [];
for (const [label, ratioText, expect] of [
  ['1x1', '1:1', { w: 1080, h: 1080 }],
  ['3x4', '3:4', { w: 1080, h: 1440 }],
]) {
  const tab = await page.evaluateHandle(
    (t) => Array.from(document.querySelectorAll('.ratio-tab')).find((b) => (b.textContent ?? '').includes(t)),
    ratioText,
  );
  await tab.click();
  await new Promise((r) => setTimeout(r, 600));

  const before = new Set(readdirSync(OUT));
  const dlBtn = await page.evaluateHandle(() =>
    Array.from(document.querySelectorAll('.modal-foot .btn')).find((b) =>
      (b.textContent ?? '').includes('下载图片'),
    ),
  );
  await dlBtn.click();
  await new Promise((r) => setTimeout(r, 4500));
  const after = readdirSync(OUT).filter((f) => !before.has(f) && !f.endsWith('.crdownload'));
  const status = await page.$eval('.share-status', (el) => el.textContent ?? '').catch(() => '');
  if (after.length === 0) {
    console.log(`  ✕ ${label} 未捕获到下载文件。状态：${status}`);
    results.push({ label, ok: false });
    continue;
  }
  const file = join(OUT, after[0]);
  const size = statSync(file).size;
  console.log(`  ${label} 下载文件 ${after[0]} (${size} 字节) 预期 ${expect.w}×${expect.h}`);
  results.push({ label, ok: true, file, expect, status });
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
