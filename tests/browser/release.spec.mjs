import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const widths = [320, 360, 375, 390, 414, 768, 1024, 1440];
const languages = ['ar', 'fr', 'en', 'kab'];
const names = { ar: 'العربية', fr: 'Français', en: 'English', kab: 'Taqbaylit' };
async function resetLocalRateLimits() {
  const state=process.env.LQADWA_TEST_STATE || '';
  expect(path.dirname(state)).toBe(path.resolve('.wrangler'));
  expect(path.basename(state)).toMatch(/^integration-/);
  // One worker, isolated loopback D1 only: each case gets independent rate buckets.
  const inspector='http://localhost:5173/cdn-cgi/local/explorer/api/d1/database';
  const response=await fetch(inspector,{signal:AbortSignal.timeout(5000)});
  expect(response.ok).toBe(true);
  const database=(await response.json()).result.find(item=>item.name==='DB');
  expect(database?.uuid).toBeTruthy();
  const reset=await fetch(`${inspector}/${database.uuid}/raw`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({batch:[{sql:'DELETE FROM rate_limits'}]}),signal:AbortSignal.timeout(10000)});
  const data=await reset.json();
  expect(reset.ok && data.success && data.result.every(item=>item.success)).toBe(true);
}
test.beforeEach(async ({ context }) => {
  await resetLocalRateLimits();
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
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']);
  const result = await builder.analyze();
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
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/for-pharmacies\?lang=fr$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('.public-information-page h1')).toHaveCount(1);
  await expect(page.locator('.product-language')).toHaveAttribute('aria-haspopup', 'menu');
  await page.locator('.product-language').click();
  await page.getByRole('menuitem', { name: /English/ }).click();
  await expect(page).toHaveURL(/\/for-pharmacies\?lang=en$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('login rate protection remains enforced within each isolated case',async({request})=>{
  const remaining=600000-Date.now()%600000;
  if(remaining<5000)await new Promise(resolve=>setTimeout(resolve,remaining+100));
  const attempt=()=>request.post('/api/auth',{headers:{origin:'https://localhost:5443'},ignoreHTTPSErrors:true,data:{action:'admin-login',identifier:'admin',password:'LOCAL-only-incorrect-passphrase'}});
  for(let count=0;count<10;count++)expect((await attempt()).status()).toBe(401);
  const blocked=await attempt();expect(blocked.status()).toBe(429);expect((await blocked.json()).error).toBe('RATE_LIMIT');
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
    await expect(page.locator('.visual-editor-entry')).toBeVisible();
    await expect(page.locator('.visual-editor-entry a')).toHaveAttribute('href', '/operations/editor?lang=en');
    await expect(page.locator('.landing-editor')).toHaveCount(0);
  } else {
    await expect(page.locator('.visual-editor-entry')).toHaveCount(0);
    expect((await page.request.get('/operations/editor', { maxRedirects: 0, ignoreHTTPSErrors: true })).status()).toBe(404);
  }
  for (const language of languages) {
    await page.locator('.product-language').click();
    await page.getByRole('menuitem').filter({ hasText: new RegExp('^' + names[language]) }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    if (role === 'owner' && language === 'kab') {
      await expect(page.locator('.visual-editor-entry a')).toHaveAttribute('href', '/operations/editor?lang=kab');
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

test.describe('administrator invitation',()=>{
// This test injects an HTTP MFA challenge; worker-owned requests bypass page routes.
test.use({serviceWorkers:'block'});
test('survives MFA and resumes without granting owner access', async ({ page, context, request }) => {
  test.setTimeout(90000);page.setDefaultTimeout(15000);
  const origin='https://localhost:5443',headers={origin},password='LOCAL-only-unique-passphrase';
  const localRequest={headers,ignoreHTTPSErrors:true};
  expect((await request.post('/api/auth',{...localRequest,data:{action:'admin-login',identifier:'admin',password}})).status()).toBe(200);
  const invitation=await request.post('/api/app',{...localRequest,data:{action:'admin-invite-create',email:'recipient@example.invalid',permissions:['audit']}});
  expect(invitation.status()).toBe(200);const token=(await invitation.json()).invite;
  let attempts=0,member='';
  await context.addInitScript(()=>localStorage.setItem('dawa-language','en'));
  await page.route('**/api/app',async route=>{
    if(route.request().method()==='POST'&&route.request().postDataJSON()?.action==='admin-invite-redeem'&&++attempts===1)return route.fulfill({status:403,json:{error:'LOCAL step-up required',code:'MFA_REQUIRED'}});
    return route.continue();
  });
  try{
    await page.goto('/?admin_invite='+token);
    await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('dawa-admin-invite'))).toBe(token);
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Email address',{exact:true}).fill('recipient@example.invalid');
    await page.getByLabel('Password',{exact:true}).fill(password);
    await page.locator('form').getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(page).toHaveURL(/\/operations\/security$/,{timeout:30000});
    expect(await page.evaluate(()=>sessionStorage.getItem('dawa-admin-invite'))).toBe(token);
    member=(await(await page.request.get('/api/app',{ignoreHTTPSErrors:true})).json()).profile.id;
    await expect(page.locator('#totp-code')).toBeVisible();
    await page.getByLabel('Language / اللغة').selectOption('en');
    await page.getByLabel('Six-digit code',{exact:true}).fill('123456');
    await page.getByRole('button',{name:'Verify access',exact:true}).click();
    await expect(page).toHaveURL(/\/operations$/,{timeout:30000});await expect(page.getByRole('heading',{name:'Audit trail',exact:true})).toBeVisible();
    expect(attempts).toBe(2);expect(await page.evaluate(()=>sessionStorage.getItem('dawa-admin-invite'))).toBeNull();
    await expect(page.locator('.visual-editor-entry')).toHaveCount(0);
    const data=await(await page.request.get('/api/app',{ignoreHTTPSErrors:true})).json();expect(data.admin.access).toEqual({isOwner:false,permissions:['audit']});
  }finally{
    if(member)await request.post('/api/app',{...localRequest,data:{action:'admin-revoke',owner:member}});
    await request.post('/api/app',{...localRequest,data:{action:'admin-invites-revoke'}});
  }
});
});

test.describe('visual editor',()=>{
test.use({serviceWorkers:'block'});
test('real drag-and-drop, draft files, MFA recovery, publication and restoration', async ({ page, context, browser }, info) => {
  page.setDefaultTimeout(15000);
  const apiOptions = { ignoreHTTPSErrors: true, headers: { origin: 'https://localhost:5443' } };
  await context.addInitScript(() => localStorage.setItem('dawa-language', 'en'));
  await page.goto('/operations/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Username or email', { exact: true }).fill('admin');
  await page.getByLabel('Password', { exact: true }).fill('LOCAL-only-unique-passphrase');
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.visual-editor-entry a')).toBeVisible();
  await page.locator('.visual-editor-entry a').click();
  await expect(page).toHaveURL(/\/operations\/editor\?lang=en/);
  await expect(page.locator('.builder-workspace')).toBeVisible();
  await expect(page.locator('.admin-management,.operations-controls,.product-header')).toHaveCount(0);
  const load = async () => {
    const response = await page.request.post('/api/landing', { ...apiOptions, data: { action: 'load' } });
    expect(response.status()).toBe(200); return response.json();
  };
  const original = (await load()).published;
  const frame = page.frameLocator('.builder-canvas-frame');
  const rows = page.locator('.builder-layer-list [data-editor-drop]');
  const inspector = page.locator('.builder-inspector');
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(frame.locator('h1')).toBeVisible();
    await expect(frame.locator('.editorial-cover img')).toBeVisible();
    const originalHeadline = await page.getByLabel('Headline - first line', { exact: true }).inputValue();
    await page.getByLabel('Headline - first line', { exact: true }).fill('Find medicine nearby');
    await expect(frame.locator('h1')).toContainText('Find medicine nearby');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByLabel('Headline - first line', { exact: true })).toHaveValue(originalHeadline);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(frame.locator('h1')).toContainText('Find medicine nearby');
    await page.getByLabel('Headline - first line', { exact: true }).fill('');
    await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
    await expect(page.locator('.builder-field-error')).toBeVisible();
    await page.getByRole('button', { name: 'Reset to default: Headline - first line', exact: true }).click();
    await expect(page.getByLabel('Headline - first line', { exact: true })).toHaveValue(originalHeadline);

    await page.locator('.builder-layer[data-editor-drop="faq"] .builder-drag-handle').dragTo(page.locator('.builder-layer[data-editor-drop="journey"]'), { targetPosition: { x: 70, y: 5 }, timeout: 15000 });
    await expect(rows.first()).toHaveAttribute('data-editor-drop', 'faq');
    await expect(frame.locator('[data-editor-node]').nth(1)).toHaveAttribute('data-editor-node', 'faq');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(rows.first()).toHaveAttribute('data-editor-drop', 'journey');

    // Reorder from the visible canvas handles as well as the layer tree.
    await page.locator('.builder-layer[data-editor-drop="tools"] .builder-layer-name').click();
    const journey = frame.locator('[data-editor-node="journey"]');
    const tools = frame.locator('[data-editor-node="tools"]');
    await tools.locator('.builder-drag-handle').dragTo(journey, { targetPosition: { x: 100, y: 80 }, timeout: 15000 });
    await expect(rows.first()).toHaveAttribute('data-editor-drop', 'tools');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();

    await frame.getByRole('button', { name: 'Select section: How it works', exact: true }).click();
    await expect(inspector.locator('.builder-selection-heading h3')).toHaveText('How it works');
    await page.locator('.builder-panel-tabs').getByRole('button', { name: 'Insert', exact: true }).click();
    // Real pointer drag crosses from the insertion palette into the preview iframe.
    let card = await page.getByRole('button', { name: 'Text section', exact: true }).boundingBox();
    let target = await journey.boundingBox();
    expect(card).toBeTruthy(); expect(target).toBeTruthy();
    // Releasing a dragged template outside the page must not become a palette click.
    await page.getByRole('button', { name: 'Text section', exact: true }).dragTo(page.locator('.builder-canvas-toolbar'));
    await expect(page.locator('.builder-template')).toHaveCount(2);
    await expect(frame.locator('[data-editor-node]')).toHaveCount(7);
    await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + Math.min(target.height - 10, target.height * .75), { steps: 15 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(page.locator('.builder-template')).toHaveCount(2);
    await expect(frame.locator('[data-editor-node]')).toHaveCount(7);
    await page.getByRole('button', { name: 'Text section', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(rows).toHaveCount(7);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(rows).toHaveCount(6);
    await page.locator('.builder-panel-tabs').getByRole('button', { name: 'Insert', exact: true }).click();
    card = await page.getByRole('button', { name: 'Text section', exact: true }).boundingBox();
    target = await journey.boundingBox();
    expect(card).toBeTruthy(); expect(target).toBeTruthy();
    await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
    await page.mouse.down();
    await page.mouse.move(card.x + card.width / 2 + 12, card.y + card.height / 2, { steps: 3 });
    await page.mouse.move(target.x + target.width / 2, target.y + Math.min(target.height - 10, target.height * .75), { steps: 15 });
    await page.mouse.up();
    await expect(rows).toHaveCount(7);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(rows).toHaveCount(6);
    await page.locator('.builder-layer[data-editor-drop="journey"] .builder-layer-name').click();
    await page.locator('.builder-panel-tabs').getByRole('button', { name: 'Insert', exact: true }).click();
    await page.getByRole('button', { name: 'Signup call to action', exact: true }).click();
    await expect(rows).toHaveCount(7);
    const customId = await rows.nth(1).getAttribute('data-editor-drop');
    await inspector.getByLabel('Heading', { exact: true }).fill('Collect at your pharmacy');
    await inspector.getByLabel('Body text', { exact: true }).fill('Confirm availability, then collect in person.');
    await expect(frame.locator(`[data-editor-node="${customId}"] h2`)).toHaveText('Collect at your pharmacy');
    await inspector.getByLabel('Appearance', { exact: true }).selectOption('plain');
    await expect(frame.locator(`[data-editor-node="${customId}"] .editorial-custom-section`)).toHaveClass(/block-tone-plain/);
    await page.getByRole('button', { name: 'Duplicate section', exact: true }).click();
    await expect(rows).toHaveCount(8);
    await page.getByRole('button', { name: 'Remove section', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(rows).toHaveCount(7);
    await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(rows).toHaveCount(8);
    await page.getByRole('button', { name: 'Redo', exact: true }).click(); await expect(rows).toHaveCount(7);
    await page.getByRole('button', { name: 'Hide section: FAQ', exact: true }).click();
    await expect(frame.locator('[data-editor-node="faq"]')).toHaveClass(/is-hidden/);

    await inspector.getByLabel('Editing language', { exact: true }).selectOption('ar');
    await expect(frame.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.locator('.builder-layer-name').first().click();
    await expect(page.getByLabel('Headline - first line', { exact: true })).toHaveValue(/[\u0600-\u06FF]/);
    await inspector.getByLabel('Editing language', { exact: true }).selectOption('en');
    await page.getByRole('button', { name: 'Mobile', exact: true }).click();
    await expect(page.locator('.builder-canvas-frame')).toHaveCSS('width', '390px');
    await page.getByRole('button', { name: 'Toggle preview theme', exact: true }).click();
    await expect(frame.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Preview draft', exact: true }).click();
    await expect(page.locator('.builder-layers')).toBeHidden();
    await expect(frame.locator('.builder-page-section')).toHaveCount(0);
    await expect(frame.locator('#questions')).toHaveCount(0);
    await frame.locator('body').press('Escape');
    await expect(page.locator('.builder-layers')).toBeVisible();
    await page.getByRole('button', { name: 'Desktop', exact: true }).click();
    await page.getByRole('button', { name: 'Toggle preview theme', exact: true }).click();

    const headline=page.getByLabel('Headline - first line',{exact:true}),beforeImport=await headline.inputValue();
    const downloadReady=page.waitForEvent('download');await page.getByRole('button',{name:'Export draft',exact:true}).click();
    const download=await downloadReady,draftBytes=await readFile(await download.path());
    expect(JSON.parse(draftBytes.toString()).format).toBe('lqadwa-landing-draft');
    await headline.fill('LOCAL EDIT BEFORE IMPORT');
    const fileInput=page.locator('input[type=file]');
    await fileInput.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"format":"foreign"}')});
    await expect(page.locator('.builder-request-error')).toHaveText('Choose a valid LQADWA draft file, at most 512 KB.');
    await expect(headline).toHaveValue('LOCAL EDIT BEFORE IMPORT');
    await fileInput.setInputFiles({name:'draft.json',mimeType:'application/json',buffer:draftBytes});
    await expect(page.getByRole('dialog')).toContainText('Replace only the current draft');
    await expect(headline).toHaveValue('LOCAL EDIT BEFORE IMPORT');
    await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();
    await expect(headline).toHaveValue(beforeImport);
    await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(headline).toHaveValue('LOCAL EDIT BEFORE IMPORT');
    await page.getByRole('button',{name:'Redo',exact:true}).click();await expect(headline).toHaveValue(beforeImport);
    expect((await page.request.get('/api/landing',apiOptions).then(r=>r.json())).content).toEqual(original);
    const requireMfa=route=>route.request().method()==='POST'&&route.request().postDataJSON()?.action==='save'?route.fulfill({status:403,json:{code:'MFA_REQUIRED',error:'LOCAL authenticator renewal required'}}):route.continue();
    await page.route('**/api/landing',requireMfa);
    await page.getByRole('button',{name:'Save draft',exact:true}).click();
    await expect(page.getByRole('link',{name:'Verify in another tab',exact:true})).toHaveAttribute('target','_blank');
    await expect(headline).toHaveValue(beforeImport);
    await page.unroute('**/api/landing',requireMfa);
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.locator('.builder-session-help')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
    expect((await page.request.get('/api/landing', apiOptions).then(r => r.json())).content).toEqual(original);
    await page.reload();
    await expect(rows).toHaveCount(7);
    await page.getByLabel('Headline - first line', { exact: true }).fill('Find medicine nearby');
    await page.getByRole('button', { name: 'Publish for visitors', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const live = (await page.request.get('/api/landing', apiOptions).then(r => r.json())).content;
    expect(live.copy.en.titleA).toBe('Find medicine nearby');
    expect(live.layout[1]).toBe(customId); expect(live.sections.faq).toBe(false);
    const guest = await browser.newPage({ baseURL: 'https://localhost:5443', ignoreHTTPSErrors: true });
    try {
      await guest.goto('/?lang=en');
      await expect(guest.locator('h1')).toContainText('Find medicine nearby');
      await expect(guest.locator('.editorial-custom-section h2')).toHaveText('Collect at your pharmacy');
      await expect(guest.locator('#questions')).toHaveCount(0);
      const order = await guest.locator('.editorial-journey,.editorial-custom-section,.editorial-tools').evaluateAll(nodes => nodes.map(node => node.className));
      expect(order[1]).toContain('editorial-custom-section');
    } finally { await guest.close(); }
    await page.getByRole('button', { name: 'Previous published versions', exact: true }).click();
    await inspector.getByRole('button', { name: 'Restore this published version', exact: true }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await page.request.get('/api/landing', apiOptions).then(r => r.json())).content).toEqual(original);

    await page.getByRole('button', { name: 'Previous published versions', exact: true }).click();
    await page.getByRole('button', { name: 'Mobile', exact: true }).click();
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await noOverflow(page);
    }
    await page.getByRole('button', { name: 'Desktop', exact: true }).click();
    await page.screenshot({ path: `.cloudflare/e2e/${info.project.name}-visual-editor.png`, fullPage: true });
    await accessible(page);
    await page.goto('/operations/editor?lang=ar');
    await expect(page.locator('.builder-workspace')).toBeVisible();
    await expect(page.locator('.builder')).toHaveAttribute('dir', 'rtl');
    await expect(frame.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.screenshot({ path: `.cloudflare/e2e/${info.project.name}-visual-editor-ar.png`, fullPage: true });
    await page.setViewportSize({ width: 375, height: 844 });
    await page.getByRole('button', { name: 'هاتف', exact: true }).click();
    await noOverflow(page); await accessible(page);
    await page.screenshot({ path: `.cloudflare/e2e/${info.project.name}-visual-editor-ar-mobile.png`, fullPage: true });
  } finally {
    // Local fixtures only: restore the published content even when an assertion fails.
    const state = await load();
    if (JSON.stringify(state.published) !== JSON.stringify(original) || JSON.stringify(state.draft) !== JSON.stringify(original)) {
      const saved = await page.request.post('/api/landing', { ...apiOptions, data: { action: 'save', draftVersion: state.draftVersion, content: original } });
      expect(saved.status()).toBe(200);
      const savedState = await saved.json();
      const restored = await page.request.post('/api/landing', { ...apiOptions, data: { action: 'publish', draftVersion: savedState.draftVersion } });
      expect(restored.status()).toBe(200);
    }
  }
});
});
