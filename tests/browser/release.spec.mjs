import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const widths = [320, 360, 375, 390, 414, 768, 1024, 1440];
const languages = ['ar', 'fr', 'en', 'kab'];
const names = { ar: 'العربية', fr: 'Français', en: 'English', kab: 'Taqbaylit' };
test.beforeEach(async ({ context }) => {
  // Isolated fixtures only. Prevent maps/OAuth/email-provider requests leaving this test.
  await context.route(url => !['localhost', '127.0.0.1'].includes(url.hostname), route => route.abort());
});
async function noOverflow(page) {
  const layout = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - innerWidth;
    return {
      overflow, width: innerWidth, language: document.documentElement.lang, theme: document.documentElement.dataset.theme,
      styles: document.styleSheets.length,
      ...(overflow > 1 ? { scrollers: [...document.querySelectorAll('html, body, body *')]
        .filter(element => element.scrollWidth > element.clientWidth + 1 && !element.matches('input,textarea,select,button,svg'))
        .map(element => ({ tag: element.tagName, class: typeof element.className === 'string' ? element.className : '', id: element.id, scroll: element.scrollWidth, client: element.clientWidth }))
        .sort((a, b) => (b.scroll - b.client) - (a.scroll - a.client)).slice(0, 8) } : {}),
    };
  });
  expect(layout.styles, JSON.stringify(layout)).toBeGreaterThan(0);
  expect(layout.overflow, JSON.stringify(layout)).toBeLessThanOrEqual(1);
}
async function accessible(page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
}
test('public HTML, locale/theme matrix, keyboard navigation and real directory', async ({ page, context }, info) => {
  let authLookups = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/app') authLookups++; });
  for (const theme of ['light', 'dark']) for (const language of languages) {
    await context.addCookies([{ name: 'lqadwa-theme', value: theme, domain: 'localhost', path: '/' }]);
    const response = await page.goto('/?lang=' + language);
    const html = await response.text();
    expect(html).toContain('<h1>'); expect(html).toContain('directory-title');
    expect(html).toMatch(new RegExp(`<html[^>]*lang="${language}"[^>]*dir="${language === 'ar' ? 'rtl' : 'ltr'}"`));
    expect(response.headers()['cache-control']).toContain('no-store');
    await expect(page.locator('.product-header')).toHaveCSS('position', 'sticky');
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.product-avatar, .product-notification')).toHaveCount(0);
    await expect(page.locator('a[href="/operations"]')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await noOverflow(page);
      const headlineLines = await page.locator('h1').evaluate(el => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
      expect(headlineLines, `${language}/${theme}/${width}: headline wrapping`).toBeLessThanOrEqual(2.1);
    }
    await page.setViewportSize({ width: 390, height: 844 }); await accessible(page);
    if (language === 'ar' || language === 'en') await page.screenshot({ path: `.cloudflare/e2e/${info.project.name}-guest-${language}-${theme}.png`, fullPage: true });
  }
  expect(authLookups).toBe(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('.product-language').click();
  await expect(page.getByRole('menu')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0); await expect(page.locator('.product-language')).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.product-menu-button').click(); await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.landing-actions a').first().click();
  await expect(page).toHaveURL(/#find-a-pharmacy$/); await expect(page.locator('#directory-city')).toBeVisible();
  await page.locator('#directory-city').selectOption('algiers');
  await expect(page.locator('.directory-row')).toHaveCount(1);
  await expect(page.locator('.directory-row a')).toHaveAttribute('href', /google\.com\/maps\/dir\/.*travelmode=walking/);
  const robots = await page.request.get('/robots.txt', { ignoreHTTPSErrors: true }); expect(robots.status()).toBe(200); expect(await robots.text()).toContain('Disallow: /operations');
  const sitemap = await page.request.get('/sitemap.xml', { ignoreHTTPSErrors: true }); expect(sitemap.status()).toBe(200); expect(await sitemap.text()).toContain('lang=kab');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const selector of ['.hero-line', '.editorial-cover img', '.has-arrived']) {
    const animations = await page.locator(selector).evaluateAll(elements => elements.map(element => getComputedStyle(element).animationName));
    expect(animations.length).toBeGreaterThan(0);
    expect(animations.every(name => name === 'none')).toBe(true);
  }
});

test('public information pages render in every language and link into the service', async ({ page }, info) => {
  for (const path of ['/how-it-works', '/for-pharmacies', '/safety', '/pricing', '/help']) {
    for (const language of languages) {
      const response = await page.goto(`${path}?lang=${language}`);
      expect(response.status(), `${path}/${language}`).toBe(200);
      await expect(page.locator('.public-information-page h1')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.public-info-hero a')).toHaveAttribute('href', /\/login\?mode=register|\/privacy/);
      await expect(page.locator('.product-desktop-nav a').first()).toHaveAttribute('href', language === 'ar' ? '/how-it-works' : `/how-it-works?lang=${language}`);
      await expect(page.locator('.public-info-related a')).toHaveCount(4);
      await expect(page.locator('.product-avatar, .product-notification')).toHaveCount(0);
      await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await accessible(page);
    }
  }
  await page.context().addCookies([{ name: 'lqadwa-language', value: 'fr', url: 'http://localhost:5173' }]);
  await page.goto('/help');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page).toHaveTitle(/Vos questions, clairement/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/help\?lang=fr$/);
  await page.setViewportSize({ width: 320, height: 800 }); await noOverflow(page);
  await page.setViewportSize({ width: 768, height: 900 }); await noOverflow(page);
  await page.setViewportSize({ width: 1440, height: 900 }); await noOverflow(page);
  await page.goto('/how-it-works?lang=ar');
  await page.screenshot({ path: `.cloudflare/e2e/${info.project.name}-public-info-ar-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await page.screenshot({ path: `.cloudflare/e2e/${info.project.name}-public-info-ar-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/how-it-works?lang=fr');
  await page.getByRole('link', { name: 'Pour les pharmacies' }).first().click();
  await expect(page).toHaveURL(/\/for-pharmacies\?lang=fr$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('.public-information-page h1')).toHaveCount(1);
  await page.locator('.product-language').click();
  await page.getByRole('menuitem', { name: /English/ }).click();
  await expect(page).toHaveURL(/\/for-pharmacies\?lang=en$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

for (const role of ['client', 'pharmacy', 'owner']) test(`${role}: real login, scoped navigation, layout matrix and account menu`, async ({ page, context }, info) => {
  await context.addInitScript(() => { localStorage.setItem('dawa-language', 'en'); });
  await page.goto(role === 'owner' ? '/operations/login' : '/login');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-avatar')).toHaveCount(0);
  expect(await page.locator('.auth-brand img').evaluate(image => parseFloat(getComputedStyle(image).borderRadius))).toBeGreaterThan(0);
  await page.getByLabel(role === 'owner' ? 'Username or email' : 'Email address', { exact: true }).fill(role === 'owner' ? 'admin' : role === 'pharmacy' ? 'other@example.invalid' : 'delegate@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('LOCAL-only-unique-passphrase');
  const loginReply = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth' && response.request().method() === 'POST');
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  const loginHeaders = (await (await loginReply).headersArray()).filter(header => header.name.toLowerCase() === 'set-cookie' && /^sb-.+-auth-token/.test(header.value));
  expect(loginHeaders.length).toBeGreaterThan(0);
  for (const header of loginHeaders) {
    const attributes = header.value.split(';').slice(1).map(value => value.trim().toLowerCase());
    expect(attributes).toContain('secure'); expect(attributes).toContain('httponly'); expect(attributes).toContain('samesite=lax');
  }
  await expect(page.locator('.product-avatar')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const authCookies = (await context.cookies()).filter(cookie => /^sb-.+-auth-token/.test(cookie.name));
  expect(authCookies.length).toBeGreaterThan(0);
  // Windows WebKit reports SameSite=None even for the independently verified Lax wire header.
  expect(authCookies.every(cookie => cookie.secure && cookie.httpOnly)).toBe(true);
  expect(await page.evaluate(() => document.cookie.includes('-auth-token='))).toBe(false);
  const navText = await page.locator('.product-desktop-nav').innerText();
  // Roles cannot access each other's workspace via navigation or legacy fragments.
  if (role !== 'owner') expect(navText).not.toContain('Administration');
  if (role !== 'client') expect(navText).not.toContain('My bookings');
  await expect(page.locator('.product-desktop-nav button')).toHaveCount(role === 'client' ? 3 : 1);
  expect(navText.length).toBeGreaterThan(0);
  if (role === 'owner') {
    const editor = page.locator('.landing-editor');
    await expect(editor).toBeVisible();
    await expect(editor.locator('.landing-editor-fields')).toContainText('Headline - first line');
    await editor.locator('.landing-editor-toolbar select').selectOption('ar');
    await expect(editor.locator('.landing-editor-toolbar select')).toHaveValue('ar');
    await expect(editor.locator('.landing-editor-fields input').first()).toHaveValue(/[\u0600-\u06FF]/);
    await page.getByRole('button', { name: 'Preview draft' }).click();
    await expect(page.locator('.landing-preview-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.landing-preview-dialog')).toHaveCount(0);
  }
  for (const language of languages) {
    await page.locator('.product-language').click();
    await page.getByRole('menuitem').filter({ hasText: new RegExp('^' + names[language]) }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    if (role === 'owner' && language === 'kab') {
      await expect(page.locator('.landing-editor')).toHaveAttribute('dir', 'ltr');
      await page.locator('.landing-editor-toolbar select').selectOption('kab');
      await page.locator('.landing-editor-actions button').first().click();
      await expect(page.locator('.landing-preview-dialog')).toHaveAttribute('dir', 'ltr');
      await page.keyboard.press('Escape');
    }
    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('.product-theme').click();
      for (const width of widths) { await page.setViewportSize({ width, height: 900 }); await noOverflow(page); }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 }); await accessible(page);
  await page.screenshot({ path: `.cloudflare/e2e/${info.project.name}-${role}.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('.product-avatar').click(); await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menuitem').filter({ has: page.locator('svg') }).first().click();
  await expect(page.locator('.account-grid')).toBeVisible();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await accessible(page);
});
