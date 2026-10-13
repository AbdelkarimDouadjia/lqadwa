import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const widths = [320, 360, 375, 390, 414, 768, 1024, 1440];
const languages = ['ar', 'fr', 'en', 'kab'];
const names = { ar: 'العربية', fr: 'Français', en: 'English', kab: 'Taqbaylit' };
test.beforeEach(async ({ context }) => {
  // Isolated fixtures only. Prevent maps/OAuth/email-provider requests leaving this test.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
});
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
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
    expect(response.headers()['cache-control']).toContain('no-store');
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.product-avatar, .product-notification')).toHaveCount(0);
    await expect(page.locator('a[href="/operations"]')).toHaveCount(0);
    for (const width of widths) { await page.setViewportSize({ width, height: 900 }); await noOverflow(page); }
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
  const robots = await page.request.get('/robots.txt'); expect(robots.status()).toBe(200); expect(await robots.text()).toContain('Disallow: /operations');
  const sitemap = await page.request.get('/sitemap.xml'); expect(sitemap.status()).toBe(200); expect(await sitemap.text()).toContain('lang=kab');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.landing-illustration').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
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
  for (const language of languages) {
    await page.locator('.product-language').click();
    await page.getByRole('menuitem').filter({ hasText: new RegExp('^' + names[language]) }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
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
