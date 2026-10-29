import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.use({serviceWorkers:'block'});
test('owner provider settings: private routes, encrypted save/remove and language layouts',async({page,context},info)=>{
 await context.route(url=>!['localhost','127.0.0.1'].includes(url.hostname),route=>route.abort());
 await context.addInitScript(()=>localStorage.setItem('dawa-language','en'));
 const guest=await page.goto('/operations/assistant');expect(page.url()).toContain('/operations/login');expect(guest.ok()).toBe(true);
 await page.waitForLoadState('networkidle');await page.getByLabel('Username or email',{exact:true}).fill('admin');await page.getByLabel('Password',{exact:true}).fill('LOCAL-only-unique-passphrase');
 await page.locator('form').getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.locator('.product-avatar')).toBeVisible({timeout:30000});
 for(const theme of ['light','dark'])for(const lang of ['ar','fr','en','kab']){
  await context.addCookies([{name:'lqadwa-theme',value:theme,domain:'localhost',path:'/'}]);
  await page.goto('/operations/assistant?lang='+lang);await expect(page.locator('#assistant-provider')).toBeVisible();
  await expect(page.locator('#assistant-provider option')).toHaveCount(7);await expect(page.locator('h1')).toHaveCount(1);
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);}
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),`${theme}/${lang}`).toEqual([]);
 }
 await page.goto('/operations/assistant?lang=en');await page.waitForLoadState('networkidle');await expect(page.locator('#assistant-api-key')).toBeEnabled();
 await page.locator('#assistant-provider').selectOption('mistral');
 await page.locator('#assistant-api-key').fill('LOCAL-only-synthetic-browser-key');await page.getByRole('button',{name:'Save / replace key',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Action completed');await expect(page.locator('#assistant-api-key')).toHaveValue('');await expect(page.locator('.assistant-provider-status')).toContainText('Saved');
 expect(await page.content()).not.toContain('LOCAL-only-synthetic-browser-key');
 await expect(page.getByRole('button',{name:'Enable free provider',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Remove key',exact:true}).click();await page.getByRole('button',{name:'Confirm key removal',exact:true}).click();
 await expect(page.locator('.assistant-provider-status')).toContainText('No key saved');
 await page.screenshot({path:`.cloudflare/e2e/${info.project.name}-owner-assistant-settings.png`,fullPage:true});
});
