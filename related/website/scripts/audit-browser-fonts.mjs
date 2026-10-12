import {chromium,webkit,firefox} from '@playwright/test';
import fs from 'node:fs/promises';
const base=process.env.SITE_URL||'http://localhost:4211';
const output=process.env.QA_OUTPUT||'qa/font-responsive-20261008';
await fs.mkdir(output,{recursive:true});
const paths=['','/products','/products/ola','/products/ola-go','/products/tablet','/products/print','/products/nest','/products/book','/products/pal','/story','/about','/plans','/faq','/prelaunch','/contact','/legal/privacy','/legal/terms','/legal/cookies','/legal/child-safety','/members'];
const locales=['en','zh-hant','ja'];
const engine=process.env.ENGINE||'chromium';
const browser=await ({chromium,webkit,firefox}[engine]).launch(engine==='chromium'?{channel:'chrome',headless:true}:{});
const results=[];
const failures=[];
try {
  for(const viewport of (process.env.MOBILE==='1'?[{width:390,height:844}]:[{width:1440,height:1000}])) {
    for(const locale of locales) for(const path of paths) {
      const page=await browser.newPage({viewport,...(process.env.MOBILE==='1'&&engine!=='firefox'?{isMobile:true,hasTouch:true}:{})});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      const url=`${base}/${locale}${path}`;
      const response=await page.goto(url,{waitUntil:'load'});
      const report=await page.evaluate(async()=>{
        const main=document.querySelector('main');
        if(!main)return {missing:true};
        const candidates=[...main.querySelectorAll('h1,h2,h3,h4,p')].filter(e=>!e.closest('[aria-live],.glass-sample-content')).slice(0,180);
        const signatures=new Map();const shifts=[];
        const measure=(element)=>{
          const style=getComputedStyle(element),box=element.getBoundingClientRect();
          if(!box.width||!box.height||style.visibility==='hidden'||+style.opacity<.1)return null;
          const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),glyphs=[];
          while(walker.nextNode()&&glyphs.length<50){
            const node=walker.currentNode;
            for(let i=0;i<node.length&&glyphs.length<50;i++){
              if(!node.data[i].trim())continue;
              const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);
              const r=range.getBoundingClientRect();
              if(!r.width||!r.height)continue;
              // Normalize ancestor transforms; test line, kerning and glyph width.
              glyphs.push([+(r.x-box.x).toFixed(1),+(r.y-box.y).toFixed(1),+r.width.toFixed(1)]);
            }
          }
          return {font:style.fontFamily,size:style.fontSize,spacing:style.letterSpacing,width:+box.width.toFixed(1),height:+box.height.toFixed(1),glyphs};
        };
        const sample=()=>{
          for(const e of candidates){
            const current=measure(e);if(!current)continue;
            const old=signatures.get(e);
            const value=JSON.stringify(current);
            if(old&&old.value!==value&&old.text===e.textContent){
              shifts.push({text:e.textContent.slice(0,85),before:old.metrics,after:current});
            }
            signatures.set(e,{value,metrics:current,text:e.textContent});
          }
        };
        sample();await new Promise(r=>setTimeout(r,120));sample();
        await new Promise(r=>setTimeout(r,350));sample();
        await new Promise(r=>setTimeout(r,850));sample();
        // Visit every distinct content section; sample just entered and settled.
        const sections=[...main.querySelectorAll('section')];
        let visited=0;
        for(const section of sections){
          section.scrollIntoView({behavior:'instant',block:'start'});
          const blocks=candidates.filter(e=>section.contains(e));
          blocks.forEach(e=>signatures.delete(e));
          sample();await new Promise(r=>setTimeout(r,80));sample();
          await new Promise(r=>setTimeout(r,260));sample();visited++;
        }
        return {texts:signatures.size,sections:visited,shifts,temporary:main.querySelectorAll('.scroll-word').length,remoteFonts:document.querySelectorAll('link[href*="fonts.googleapis.com"]').length,overflow:document.documentElement.scrollWidth>innerWidth+1};
      });
      const entry={engine,locale,path,viewport,status:response.status(),...report,errors:[...errors]};
      results.push(entry);
      // Layout movements in GSAP layouts are recorded separately, never mistaken for font swaps.
      const fontChanges=(report.shifts||[]).filter(s=>s.before.font!==s.after.font||s.before.size!==s.after.size||s.before.spacing!==s.after.spacing);
      const glyphChanges=(report.shifts||[]).filter(s=>Math.abs(s.before.width-s.after.width)<1&&s.before.glyphs.length===s.after.glyphs.length&&s.before.glyphs.some((g,i)=>g.some((v,j)=>Math.abs(v-s.after.glyphs[i][j])>1)));
      if(response.status()>=400||report.missing||report.temporary||report.remoteFonts||fontChanges.length||glyphChanges.length||errors.length)failures.push({...entry,fontChanges,glyphChanges});
      console.log(`${engine} ${locale}${path||'/'} ${report.texts} text blocks, ${report.sections} sections, ${fontChanges.length} font changes, ${errors.length} errors`);
      page.removeAllListeners('pageerror');await page.close();
    }
  }
} finally {await browser.close();await fs.writeFile(`${output}/${engine}${process.env.MOBILE==='1'?'-mobile':''}-audit.json`,JSON.stringify({results,failures},null,2));}
if(failures.length)throw Error(`${failures.length} failing routes; see audit JSON`);
