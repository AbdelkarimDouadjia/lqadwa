import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('assistant: authenticated retrieval, language/theme layouts, account tools and recovery',async({page,context},info)=>{
 await context.route(url=>!['localhost','127.0.0.1'].includes(url.hostname),route=>route.abort());
 await context.addInitScript(()=>localStorage.setItem('dawa-language','en'));
 await page.goto('/login');
 await page.getByLabel('Email address',{exact:true}).fill('delegate@example.invalid');
 await page.getByLabel('Password',{exact:true}).fill('LOCAL-only-unique-passphrase');
 await page.locator('form').getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.locator('.product-avatar')).toBeVisible({timeout:30000});
 for(const language of ['ar','fr','en','kab'])for(const theme of ['light','dark']){
  await context.addCookies([{name:'lqadwa-theme',value:theme,domain:'localhost',path:'/'}]);
  await page.goto('/assistant?lang='+language);
  await expect(page.locator('html')).toHaveAttribute('dir',language==='ar'?'rtl':'ltr');
  await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
  await expect(page.locator('h1')).toHaveCount(1);
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),`${language}/${theme}/${width}`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({width:390,height:844});
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
 }
 await page.goto('/assistant?lang=en');
 await page.locator('#assistant-query').fill('How do I collect my reservation?');
 await page.locator('#assistant-query').focus();
 await page.keyboard.press('Tab');
 await expect(page.getByRole('button',{name:'Send',exact:true})).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.locator('.assistant-sources')).toContainText('Reserve and plan pickup');
 await expect(page.locator('.assistant-sources')).toContainText('original prescription');
 await expect(page.locator('.assistant-answer')).toContainText('SHA-256');
 await page.getByRole('button',{name:'Medicine catalog',exact:true}).click();
 await page.locator('#assistant-query').fill('DOLIPRANE 1000');
 await page.getByRole('button',{name:'Send',exact:true}).click();
 await expect(page.locator('.assistant-record').last()).toContainText('1000MG');
 await expect(page.locator('.assistant-answer').last()).toContainText('no stock confirmation');
 await page.getByRole('button',{name:'Clear conversation',exact:true}).click();
 await expect(page.locator('.assistant-turn')).toHaveCount(0);
 await page.getByRole('button',{name:'Service help',exact:true}).click();
 await page.route('**/api/assistant',route=>route.abort());
 await page.locator('#assistant-query').fill('How is my data protected?');
 await page.getByRole('button',{name:'Send',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Check your connection');
 await page.unroute('**/api/assistant');
 await page.locator('#assistant-query').fill('How is my data protected?');
 await page.getByRole('button',{name:'Send',exact:true}).click();
 await expect(page.locator('.assistant-answer').last()).toContainText('Share only what is needed');
 await page.screenshot({path:`.cloudflare/e2e/${info.project.name}-assistant-en.png`,fullPage:true});
 const storage=await page.evaluate(()=>({...localStorage}));
 expect(JSON.stringify(storage)).not.toContain('How is my data protected?');
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await page.locator('.assistant-modes button').first().evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
 await page.locator('#assistant-language').selectOption('fr');
 await expect(page.locator('h1')).toHaveText('L’assistant LQADWA');
 await expect(page.locator('.assistant-turn')).toHaveCount(0);
});
