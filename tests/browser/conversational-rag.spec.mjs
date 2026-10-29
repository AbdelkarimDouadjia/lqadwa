import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.use({serviceWorkers:'block'});
test('private conversational RAG: consent, source fallback, languages, themes and mobile',async({page,context},info)=>{
 await context.route(url=>!['localhost','127.0.0.1'].includes(url.hostname),route=>route.abort());
 await context.addInitScript(()=>localStorage.setItem('dawa-language','en'));
 await page.goto('/operations/assistant/chat');expect(page.url()).toContain('/operations/login');
 await page.waitForLoadState('networkidle');await page.getByLabel('Username or email',{exact:true}).fill('admin');await page.getByLabel('Password',{exact:true}).fill('LOCAL-only-unique-passphrase');
 await page.locator('form').getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.locator('.product-avatar')).toBeVisible({timeout:30000});
 for(const theme of ['light','dark'])for(const lang of ['ar','fr','en','kab']){
  await context.addCookies([{name:'lqadwa-theme',value:theme,domain:'localhost',path:'/'}]);
  await page.goto('/operations/assistant/chat?lang='+lang);await page.waitForLoadState('networkidle');
  await expect(page.locator('.assistant-evaluation')).toBeVisible();await expect(page.locator('.assistant-external-consent input')).not.toBeChecked();
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);}
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),theme+'/'+lang).toEqual([]);
 }
 await page.goto('/operations/assistant/chat?lang=en');await page.waitForLoadState('networkidle');
 await page.locator('#assistant-query').fill('How do I collect my reservation?');await expect(page.getByRole('button',{name:'Send',exact:true})).toBeDisabled();
 await page.locator('.assistant-external-consent input').check();await page.getByRole('button',{name:'Send',exact:true}).click();
 await expect(page.locator('.assistant-sources')).toBeVisible();await expect(page.locator('.assistant-answer')).toContainText('Sources shown directly');
 await expect(page.locator('.assistant-answer-kind')).toHaveCount(0);await page.screenshot({path:`.cloudflare/e2e/${info.project.name}-private-rag.png`,fullPage:true});
 // An older structured record still uses its lookup tool after switching back to conversation.
 const sent=[];page.on('request',request=>{if(request.url().endsWith('/api/assistant')&&request.method()==='POST')sent.push(request.postDataJSON());});
 await page.locator('.assistant-modes').getByRole('button',{name:'Medicine catalog',exact:true}).click();
 await page.locator('#assistant-query').fill('DOLIPRANE 1000');await page.getByRole('button',{name:'Send',exact:true}).click();await expect(page.locator('.assistant-record')).not.toHaveCount(0);
 await page.locator('.assistant-modes').getByRole('button',{name:'Conversation',exact:true}).click();
 await page.locator('.assistant-record').first().getByRole('button').click();await expect(page.getByRole('button',{name:'Stop',exact:true})).toHaveCount(0);
 expect(sent.at(-1).tool).toBe('medicine');expect(sent.at(-1)).not.toHaveProperty('query');
 // Do not leak the private evaluation route when changing locale.
 await page.locator('#assistant-language').selectOption('ar');await expect(page).toHaveURL(/\/operations\/assistant\/chat\?lang=ar$/);
});
