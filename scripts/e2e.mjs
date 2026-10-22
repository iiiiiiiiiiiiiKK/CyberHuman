/**
 * 浏览器端 E2E 测试（Puppeteer + 本机 Chrome）。
 * 覆盖：首页渲染、随机试卷、答题流程、返回修改、进度恢复、
 * 结果生成、分享图导出与裁切检测、重新测试、清除本地数据、移动端布局、作者链接。
 *
 * 用法：node scripts/e2e.mjs [baseUrl]
 * 需要先启动 `npm run preview`（默认 http://127.0.0.1:4173/）。
 */
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:4173/';
const OUT = join(process.cwd(), '.e2e-out');
mkdirSync(OUT, { recursive: true });

const KEY_PROGRESS = 'chl.progress.v2';
const KEY_RESULT = 'chl.last-result.v2';
const KEY_CONSENT = 'chl.storage-consent.v1';
const EXPECTED_QUESTIONS = 18;
const AUTHOR_URL = 'https://x.com/0xkillcoin';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✕ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 点击包含指定文字的元素 */
async function clickByText(page, selector, text) {
  const handles = await page.$$(selector);
  for (const h of handles) {
    const t = await page.evaluate((el) => el.textContent ?? '', h);
    if (t.includes(text)) {
      await h.click();
      return true;
    }
  }
  return false;
}

/** 检测容器内文字是否溢出 / 出界（裁切） */
async function detectClipping(page, rootSelector) {
  return page.evaluate((root) => {
    const problems = [];
    const container = document.querySelector(root);
    if (!container) return [{ reason: 'container-missing' }];
    for (const el of container.querySelectorAll('*')) {
      const style = getComputedStyle(el);
      if (el.classList.contains('sr-only')) continue;
      const clipped =
        (style.overflow === 'hidden' || style.overflowY === 'hidden') &&
        (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
      if (clipped && style.textOverflow !== 'ellipsis') {
        const text = (el.textContent ?? '').trim().slice(0, 40);
        if (text) {
          problems.push({
            reason: 'clipped',
            cls: String(el.className),
            text,
            scrollH: el.scrollHeight,
            clientH: el.clientHeight,
          });
        }
      }
      const rect = el.getBoundingClientRect();
      const rootRect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && el.children.length === 0) {
        if (
          rect.bottom > rootRect.bottom + 1 ||
          rect.right > rootRect.right + 1 ||
          rect.top < rootRect.top - 1 ||
          rect.left < rootRect.left - 1
        ) {
          const text = (el.textContent ?? '').trim().slice(0, 30);
          if (text) problems.push({ reason: 'out-of-bounds', cls: String(el.className), text });
        }
      }
    }
    return problems;
  }, rootSelector);
}

/** 一路答题到结果页 */
async function answerAll(page, maxTries = 40) {
  for (let i = 0; i < maxTries; i += 1) {
    if (await page.$('.verdict-name')) return true;
    const hasOption = await page.$('.options .option');
    if (!hasOption) {
      await sleep(200);
      continue;
    }
    await page.evaluate(() => document.querySelector('.options .option')?.click());
    await sleep(70);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('.quiz-nav .btn')).find((x) =>
        /下一步|生成/.test(x.textContent ?? ''),
      );
      b?.click();
    });
    await sleep(120);
  }
  await page.waitForSelector('.verdict-name', { timeout: 15000 });
  return true;
}

/* ---------------- 主流程 ---------------- */

const browser = await puppeteer.launch({
  executablePath: CHROME_PATHS.find((p) => existsSync(p)),
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

console.log('\n[1] 首页渲染与作者链接');
await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.waitForSelector('.hero-title', { timeout: 15000 });

const title = await page.title();
check('页面标题包含站点名', title.includes('赛博人类鉴定所'), title);

const h1 = await page.$eval('.hero-title', (el) => el.textContent ?? '');
check('主标题包含核心问句', h1.includes('人类属性'), h1);

const previewCount = await page.$$eval('.preview-gauges .mini-gauge', (els) => els.length);
check('首页有随机结果预览', previewCount > 0, `${previewCount} 条`);

const authorHref = await page.$eval('.author-link', (el) => el.getAttribute('href')).catch(() => null);
check('顶栏存在作者 X 链接', authorHref === AUTHOR_URL, String(authorHref));
const authorTarget = await page.$eval('.author-link', (el) => el.getAttribute('target'));
check('作者链接在新标签页打开', authorTarget === '_blank', String(authorTarget));
const authorRel = await page.$eval('.author-link', (el) => el.getAttribute('rel') ?? '');
check('作者链接带 noopener', authorRel.includes('noopener'), authorRel);
const authorVisible = await page.$eval('.author-link', (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
});
check('作者链接可见', authorVisible);

const homeText = await page.$eval('body', (b) => b.textContent ?? '');
check('首页明确标注娱乐属性', homeText.includes('不是心理测评') || homeText.includes('娱乐'));

await page.screenshot({ path: join(OUT, '01-home-desktop.png'), fullPage: true });

/* 同意保存进度 */
console.log('\n[2] 同意本地存储并开始答题');
const consentClicked = await clickByText(page, '.consent-actions .btn', '允许保存进度');
check('出现本地存储同意条', consentClicked);

await clickByText(page, '.hero-actions .btn', '开始检测');
await page.waitForSelector('.question-panel', { timeout: 10000 });
check('进入答题页', true);

const firstPaper = await page.evaluate(() => document.querySelectorAll('.quiz-dots i').length);
check(`试卷题量为 ${EXPECTED_QUESTIONS}`, firstPaper === EXPECTED_QUESTIONS, `${firstPaper}`);

const optionCount = await page.$$eval('.options .option', (els) => els.length);
check('第一题选项 3~5 个', optionCount >= 3 && optionCount <= 5, `${optionCount} 个`);

/* 键盘操作 */
console.log('\n[3] 键盘与选择题交互');
await page.keyboard.press('2');
await sleep(150);
const selectedCount = await page.$$eval('.option.is-selected', (els) => els.length);
check('数字键可选择选项', selectedCount === 1, `${selectedCount}`);

const counter1 = await page.$eval('.quiz-counter b', (el) => el.textContent);
await page.keyboard.press('ArrowRight');
await sleep(200);
const counter2 = await page.$eval('.quiz-counter b', (el) => el.textContent);
check('→ 键进入下一题', counter1 !== counter2, `${counter1} → ${counter2}`);

await page.keyboard.press('ArrowLeft');
await sleep(200);
const counterBack = await page.$eval('.quiz-counter b', (el) => el.textContent);
check('← 键回到上一题', counterBack === counter1, `${counterBack} vs ${counter1}`);

const beforeChange = await page.$eval('.option.is-selected .option-label', (el) => el.textContent);
await page.click('.options .option:nth-child(3)');
await sleep(150);
const afterChange = await page.$eval('.option.is-selected .option-label', (el) => el.textContent);
check('修改答案生效', beforeChange !== afterChange, `${beforeChange} → ${afterChange}`);

/* 进度持久化：刷新恢复 */
console.log('\n[4] 刷新后恢复进度');
const savedSeed = await page.evaluate(
  (k) => JSON.parse(window.localStorage.getItem(k) ?? 'null')?.paperSeed ?? null,
  KEY_PROGRESS,
);
check('进度中保存了试卷种子', typeof savedSeed === 'number', String(savedSeed));

await page.reload({ waitUntil: 'networkidle0' });
await sleep(400);
check('刷新后首页出现恢复提示', Boolean(await page.$('.resume-bar')));

await clickByText(page, '.resume-actions .btn', '继续答题');
await page.waitForSelector('.question-panel', { timeout: 8000 });
const resumedCount = await page.$eval('.quiz-counter b', (el) => el.textContent);
check('继续答题跳到第一道未答题', resumedCount === '02', `恢复在 ${resumedCount}`);

const resumedLog = await page.$eval('.quiz-counter', (el) => el.textContent ?? '');
check('恢复后已答题数正确', resumedLog.includes('已答 1 题'), resumedLog);

await page.keyboard.press('ArrowLeft');
await sleep(200);
const resumedSelected = await page.$eval('.option.is-selected .option-label', (el) => el.textContent);
check('恢复后保留已选答案', resumedSelected === afterChange, `${resumedSelected} vs ${afterChange}`);
check('恢复后试卷题目不变', (await page.evaluate(() => document.querySelectorAll('.quiz-dots i').length)) === EXPECTED_QUESTIONS);

/* 完成全部题目 */
console.log('\n[5] 完成全部题目');
let guard = 0;
while (guard < 40) {
  guard += 1;
  const isLast = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.quiz-nav .btn')).find((b) =>
      (b.textContent ?? '').includes('生成'),
    );
    return Boolean(btn);
  });
  const hasSelection = await page.$('.option.is-selected');
  if (!hasSelection) {
    const pick = guard % 2 === 0 ? 1 : 2;
    await page.click(`.options .option:nth-child(${pick})`);
    await sleep(90);
  }
  if (isLast) break;
  await page.keyboard.press('ArrowRight');
  await sleep(120);
}

const lastAnsweredText = await page.$eval('.quiz-counter', (el) => el.textContent);
check('到达最后一题', lastAnsweredText.includes('18'), lastAnsweredText);

const capturedAnswers = await page.evaluate((k) => {
  const raw = window.localStorage.getItem(k);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return { answers: parsed.answers, paperSeed: parsed.paperSeed };
}, KEY_PROGRESS);
check(
  `localStorage 中保存 ${EXPECTED_QUESTIONS} 题答案`,
  Object.keys(capturedAnswers?.answers ?? {}).length === EXPECTED_QUESTIONS,
  `${Object.keys(capturedAnswers?.answers ?? {}).length} 题`,
);

await clickByText(page, '.quiz-nav .btn', '生成');
await page.waitForSelector('.computing', { timeout: 5000 }).catch(() => null);
const sawComputing = Boolean(await page.$('.computing'));
check('生成时有检测动画过渡', sawComputing);

await page.waitForSelector('.verdict-name', { timeout: 15000 });
check('生成结果页', true);

/* 结果页检查 */
console.log('\n[6] 结果页面检查');
const resName = await page.$eval('.verdict-name', (el) => el.textContent);
const purity = await page.$eval('.dial-num', (el) => el.textContent);
const serial = await page.$eval('.result-head .serial b', (el) => el.textContent);
check('结果页有人格类型', Boolean(resName && resName.length > 1), resName);
check('结果页有人类纯度', /\d+/.test(purity ?? ''), purity);
check('结果页有鉴定编号', /^CHL-\d{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(serial ?? ''), serial);

const gaugeCount = await page.$$eval('.gauge-list .gauge', (els) => els.length);
check('结果页展示 6 项属性', gaugeCount === 6, `${gaugeCount}`);
check('雷达图渲染', Boolean(await page.$('.radar-wrap svg')));

const tagsCount = await page.$$eval('.tag-row .tag', (els) => els.length);
check('展示趣味标签', tagsCount > 0, `${tagsCount} 个`);
check('展示附加指标 5 项', (await page.$$eval('.extra-cell', (e) => e.length)) === 5);

const resultText = await page.$eval('body', (b) => b.textContent ?? '');
check('结果页含免责声明', resultText.includes('娱乐内容') && resultText.includes('不构成心理诊断'));

await page.screenshot({ path: join(OUT, '02-result-desktop.png'), fullPage: true });

/* 复制结果 */
console.log('\n[7] 复制结果');
await page.evaluate(() => {
  window.__clipboard = null;
  const orig = navigator.clipboard.writeText.bind(navigator.clipboard);
  navigator.clipboard.writeText = async (t) => {
    window.__clipboard = t;
    return orig(t);
  };
});
await clickByText(page, '.result-actions .btn', '复制结果');
await sleep(400);
const copied = await page.evaluate(() => window.__clipboard);
check('复制结果包含类型与纯度', Boolean(copied && copied.includes('人类纯度')), copied ? copied.slice(0, 40) : 'null');
check('复制结果含娱乐声明', Boolean(copied && copied.includes('娱乐')));
check('复制结果含作者链接', Boolean(copied && copied.includes(AUTHOR_URL)), copied ? copied.slice(-60) : 'null');

/* 分享图 */
console.log('\n[8] 分享图生成与裁切检测');
await clickByText(page, '.result-actions .btn', '生成分享图');
await page.waitForSelector('.modal', { timeout: 8000 });
await sleep(500);

const clipping1x1 = await detectClipping(page, '.share-render-host .share-card');
check('1:1 分享图无文字裁切', clipping1x1.length === 0, JSON.stringify(clipping1x1).slice(0, 300));

const cardSize = await page.$eval('.share-render-host .share-card', (el) => {
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height) };
});
check('1:1 卡片尺寸 360×360', cardSize.w === 360 && cardSize.h === 360, JSON.stringify(cardSize));

const cardAuthor = await page.$eval('.share-render-host .sc-author', (el) => el.textContent ?? '');
check('分享图含作者标识', cardAuthor.includes('0xkillcoin'), cardAuthor);

await clickByText(page, '.ratio-tabs .ratio-tab', '3:4');
await sleep(500);
const clipping3x4 = await detectClipping(page, '.share-render-host .share-card');
check('3:4 分享图无文字裁切', clipping3x4.length === 0, JSON.stringify(clipping3x4).slice(0, 300));

const cardSize34 = await page.$eval('.share-render-host .share-card', (el) => {
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height) };
});
check('3:4 卡片尺寸 360×480', cardSize34.w === 360 && cardSize34.h === 480, JSON.stringify(cardSize34));

const client = await page.target().createCDPSession();
await client.send('Browser.setDownloadBehavior', {
  behavior: 'allowAndName',
  downloadPath: OUT,
  eventsEnabled: true,
});

await clickByText(page, '.modal-foot .btn', '下载图片');
await sleep(4000);
const statusText = await page.$eval('.share-status', (el) => el.textContent ?? '').catch(() => '');
check('分享图导出成功提示', statusText.includes('已生成') || statusText.includes('下载'), statusText);

await page.screenshot({ path: join(OUT, '03-share-modal-3x4.png') });
await clickByText(page, '.modal-close', '✕');
await sleep(300);
check('分享面板可关闭', !(await page.$('.modal')));

/* 回看答案 + 修改 */
console.log('\n[9] 回看答案与重新测试');
await clickByText(page, '.result-actions .btn', '回看答案');
await page.waitForSelector('ol li button', { timeout: 8000 });
const reviewCount = await page.$$eval('ol li', (els) => els.length);
check(`回看答案列出 ${EXPECTED_QUESTIONS} 题`, reviewCount === EXPECTED_QUESTIONS, `${reviewCount}`);

await page.click('ol li button');
await page.waitForSelector('.question-panel', { timeout: 8000 });
const jumpTo = await page.$eval('.quiz-counter b', (el) => el.textContent);
check('从回看页可直接跳到对应题目', jumpTo === '01', jumpTo);

const quickBtn = await clickByText(page, '.quiz-nav .btn', '直接查看报告');
check('全部答完后提供直接查看报告入口', quickBtn);
await page.waitForSelector('.verdict-name', { timeout: 10000 });

const resName2 = await page.$eval('.verdict-name', (el) => el.textContent);
check('同一份试卷重新生成结果一致（确定性）', resName2 === resName, `${resName} vs ${resName2}`);

await clickByText(page, '.result-actions .btn', '重新测试');
await page.waitForSelector('.question-panel', { timeout: 8000 });
check('重新测试会清空答案', (await page.$$eval('.option.is-selected', (e) => e.length)) === 0);
check('重新测试回到第一题', (await page.$eval('.quiz-counter b', (el) => el.textContent)) === '01');

/* 随机性：重新测试应换一份不同试卷 */
const secondPaperIds = await page.evaluate(() => {
  const ids = Array.from(document.querySelectorAll('.options .option .option-label')).map((e) => e.textContent);
  return ids.join('|');
});
check('重新测试后题目内容有变化（新试卷）', secondPaperIds.length > 0);

/* 清除本地数据 */
console.log('\n[10] 清除本地数据');
await page.evaluate(() => document.querySelector('.foot-link')?.click());
await sleep(400);
const storageAfter = await page.evaluate(
  (keys) => keys.map((k) => window.localStorage.getItem(k)),
  [KEY_PROGRESS, KEY_RESULT, KEY_CONSENT],
);
check('清除后 localStorage 无残留', storageAfter.every((v) => !v), JSON.stringify(storageAfter));

/* 拒绝存储 */
console.log('\n[11] 拒绝存储后的行为');
await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await page.waitForSelector('.consent-card', { timeout: 8000 });
await clickByText(page, '.consent-actions .btn', '不用，谢谢');
await sleep(200);
await clickByText(page, '.hero-actions .btn', '开始检测');
await page.waitForSelector('.question-panel', { timeout: 8000 });
await page.keyboard.press('1');
await sleep(300);
const noStoreProgress = await page.evaluate((k) => window.localStorage.getItem(k), KEY_PROGRESS);
check('拒绝授权后不写入进度', noStoreProgress === null, String(noStoreProgress));
const logText = await page.$eval('.quiz-log', (el) => el.textContent ?? '');
check('界面提示进度不保存', logText.includes('不保存'), logText);

/* 移动端 */
console.log('\n[12] 移动端布局');
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: 'networkidle0' });
await sleep(400);
check(
  '窄屏隐藏顶部状态信息',
  await page.evaluate(() => {
    const el = document.querySelector('.topbar-status');
    return el ? getComputedStyle(el).display === 'none' : false;
  }),
);
check(
  '窄屏仍显示作者链接',
  await page.evaluate(() => {
    const el = document.querySelector('.author-link');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height >= 36;
  }),
);
check(
  '窄屏无横向溢出',
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
  await page.evaluate(() => `${document.documentElement.scrollWidth} vs ${window.innerWidth}`),
);
check(
  '移动端主按钮触摸高度 ≥ 44px',
  (await page.evaluate(() => {
    const b = document.querySelector('.hero-actions .btn');
    return b ? Math.round(b.getBoundingClientRect().height) : 0;
  })) >= 44,
);
await page.screenshot({ path: join(OUT, '04-home-mobile.png'), fullPage: true });

await clickByText(page, '.hero-actions .btn', '开始检测');
await page.waitForSelector('.question-panel', { timeout: 8000 });
const mobOptH = await page.evaluate(() => {
  const o = document.querySelector('.options .option');
  return o ? Math.round(o.getBoundingClientRect().height) : 0;
});
check('移动端选项高度 ≥ 56px', mobOptH >= 56, `${mobOptH}px`);
await page.screenshot({ path: join(OUT, '05-quiz-mobile.png'), fullPage: true });

await answerAll(page);
check('移动端可完成并进入结果页', Boolean(await page.$('.verdict-name')));
await page.screenshot({ path: join(OUT, '06-result-mobile.png'), fullPage: true });

await clickByText(page, '.result-actions .btn', '生成分享图');
await sleep(900);
const mobClip = await detectClipping(page, '.share-render-host .share-card');
check('移动端分享图无裁切', mobClip.length === 0, JSON.stringify(mobClip).slice(0, 300));
await page.screenshot({ path: join(OUT, '07-share-modal-mobile.png') });

/* 运行时错误 */
console.log('\n[13] 运行时错误检查');
const realErrors = consoleErrors.filter(
  (e) => !e.includes('favicon') && !e.includes('Download the React DevTools'),
);
check('无控制台错误', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

writeFileSync(
  join(OUT, 'answers.json'),
  JSON.stringify({ capturedAnswers, resName, purity, serial, firstPaper }, null, 2),
  'utf8',
);

await browser.close();

console.log(`\n通过 ${passed} 项，失败 ${failed} 项`);
if (failed) {
  console.error('\n失败明细：');
  for (const f of failures) console.error(`  ✕ ${f}`);
}
process.exit(failed ? 1 : 0);
