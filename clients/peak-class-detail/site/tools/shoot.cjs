// Usage: node tools/shoot.cjs <width> <height> <outPrefix> <target...>
// target: a CSS selector (scrolls to it) or "y:<px>" or "hero:<0..1>" (fraction through the hero)
const { chromium } = require('playwright');
(async () => {
  const [w, h, out, ...targets] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: +w < 700, hasTouch: +w < 700 });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(process.env.URL || 'http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  let i = 0;
  for (const t of targets) {
    if (t.startsWith('y:')) await page.evaluate((y) => window.scrollTo(0, y), +t.slice(2));
    else if (t.startsWith('hero:')) await page.evaluate((f) => { const h = document.querySelector('[data-hero]'); window.scrollTo(0, (h.offsetHeight - innerHeight) * f); }, +t.slice(5));
    else await page.evaluate((s) => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + scrollY); }, t);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${out}-${String(++i).padStart(2, '0')}.png` });
  }
  if (process.env.FULL) await page.screenshot({ path: `${out}-full.png`, fullPage: true });
  console.log(errs.length ? errs.join('\n') : 'no console errors');
  await browser.close();
})();
