/**
 * 视觉/布局体检：多个视口尺寸下检查横向溢出、元素重叠、最小点击区域。
 * 用法：node scripts/layout-audit.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:4173/';
const OUT = join(process.cwd(), '.layout-out');
mkdirSync(OUT, { recursive: true });

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const VIEWPORTS = [
  { name: '320x640', width: 320, height: 640, mobile: true },
  { name: '390x844', width: 390, height: 844, mobile: true },
  { name: '768x1024', width: 768, height: 1024, mobile: false },
  { name: '1440x900', width: 1440, height: 900, mobile: false },
];

const browser = await puppeteer.launch({
  executablePath: CHROME_PATHS.find((p) => existsSync(p)),
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let problems = 0;

async function auditPage(page, label) {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const issues = [];

    // 1) 横向溢出
    if (doc.scrollWidth > window.innerWidth + 1) {
      issues.push(`横向溢出 ${doc.scrollWidth} > ${window.innerWidth}`);
    }

    // 2) 可点元素最小尺寸（仅可见按钮）
    for (const btn of document.querySelectorAll('button, a, [role="radio"], input[type="checkbox"]')) {
      const r = btn.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(btn);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      // 内联链接/页脚链接允许更小
      if (btn.closest('.site-foot') || btn.classList.contains('foot-link')) continue;
      if (r.height < 32) {
        issues.push(`点击区过小 ${Math.round(r.width)}×${Math.round(r.height)} :: ${(btn.textContent ?? '').trim().slice(0, 16)}`);
      }
    }

    // 3) 文字溢出容器
    for (const el of document.querySelectorAll('.shell *')) {
      const cs = getComputedStyle(el);
      // 屏幕阅读器专用元素天然是 1px 裁剪，不算问题
      if (el.classList.contains('sr-only')) continue;
      if (cs.overflow === 'hidden' && el.scrollWidth > el.clientWidth + 1) {
        const t = (el.textContent ?? '').trim().slice(0, 24);
        // 设计上的省略（text-overflow: ellipsis）允许
        if (cs.textOverflow !== 'ellipsis' && t) {
          issues.push(`内容溢出 ${el.tagName}.${el.className} :: ${t}`);
        }
      }
    }
    return issues;
  });

  if (result.length) {
    problems += result.length;
    console.log(`  ✕ ${label}`);
    for (const issue of result.slice(0, 6)) console.log(`      ${issue}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
  return result;
}

const page = await browser.newPage();

for (const vp of VIEWPORTS) {
  console.log(`\n视口 ${vp.name}`);
  await page.setViewport({
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });

  // 首页
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.hero-title');
  await new Promise((r) => setTimeout(r, 500));
  await auditPage(page, `${vp.name} 首页`);
  await page.screenshot({ path: join(OUT, `home-${vp.name}.png`), fullPage: true });

  // 答题页
  await page.evaluate(() =>
    document.querySelector('.hero-actions .btn')?.click(),
  );
  await page.waitForSelector('.question-panel');
  await page.evaluate(() => document.querySelector('.options .option')?.click());
  await new Promise((r) => setTimeout(r, 300));
  await auditPage(page, `${vp.name} 答题页`);
  await page.screenshot({ path: join(OUT, `quiz-${vp.name}.png`), fullPage: true });

  // 结果页：直接点答完（每次都抽不同试卷，所以不能注入固定答案）
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
  await new Promise((r) => setTimeout(r, 700));
  await auditPage(page, `${vp.name} 结果页`);
  await page.screenshot({ path: join(OUT, `result-${vp.name}.png`), fullPage: true });

  // 分享面板
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.result-actions .btn')).find((x) =>
      (x.textContent ?? '').includes('生成分享图'),
    );
    b?.click();
  });
  await page.waitForSelector('.modal');
  await new Promise((r) => setTimeout(r, 700));
  await auditPage(page, `${vp.name} 分享面板`);
  await page.screenshot({ path: join(OUT, `share-${vp.name}.png`) });
  await page.evaluate(() => document.querySelector('.modal-close')?.click());
}

await browser.close();
console.log(`\n共发现问题 ${problems} 处`);
process.exit(problems ? 1 : 0);
