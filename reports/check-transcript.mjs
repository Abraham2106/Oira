import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true});
try {
 const page = await browser.newPage({viewport:{width:1000,height:800}});
 page.on('pageerror', error => console.log(error.message));
 await page.goto('http://127.0.0.1:5173/');
 await page.evaluate(async () => {
  window.oira = { getSettings: async () => ({ok:true,data:{uiLocale:'es'}}) };
  const source = await (await fetch('/components/ProgressiveTranscript.tsx')).text();
  const reactPath = source.match(/from "([^"]*\/react\.js[^\"]*)"/)[1];
  const reactModule = await import(reactPath); const React = reactModule.default ?? reactModule;
  const client = await import(reactPath.replace('/react.js','/react-dom_client.js'));
  const {ProgressiveTranscript} = await import('/components/ProgressiveTranscript.tsx');
  const {I18nProvider} = await import('/i18n/I18nProvider.tsx');
  document.body.innerHTML = '<div id="check"></div>';
  const root = (client.default ?? client).createRoot(document.getElementById('check'));
  window.sample = 'Texto sintético.  Conserva espacios, acentos y puntuación. '.repeat(30);
  window.renderSample = (id) => root.render(React.createElement(I18nProvider, null, React.createElement(ProgressiveTranscript,{key:id,segments:[{id,text:window.sample,startMs:0,endMs:1000}]})));
  window.renderSample('one');
 });
 await page.waitForSelector('.progressive-transcript-word');
 const first = await page.locator('.progressive-transcript-line').innerText();
 await page.waitForTimeout(400);
 const second = await page.locator('.progressive-transcript-line').innerText();
 assert(second.length > first.length, 'text grows progressively');
 await page.locator('.progressive-transcript-scroll').evaluate(el=>{el.scrollTop=0;el.dispatchEvent(new Event('scroll'));});
 await page.waitForTimeout(300);
 assert.equal(await page.locator('.progressive-transcript-scroll').evaluate(el=>el.scrollTop),0);
 await page.getByRole('button', {name:/Show all|Mostrar todo/}).click();
 assert.equal(await page.locator('.progressive-transcript-line').textContent(),await page.evaluate(()=>window.sample));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>window.renderSample('two'));
 await page.waitForTimeout(100);
 assert.equal(await page.locator('.progressive-transcript-line').textContent(),await page.evaluate(()=>window.sample));
 await page.setViewportSize({width:375,height:700});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
 await page.screenshot({path:'reports/transcript-mobile.png'});
 console.log('PASS: progressive reveal, scroll pause, Show all exact text, reduced motion, mobile overflow');
} finally { await browser.close(); }




