import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const b=await chromium.launch({channel:'chrome',headless:true});
try{const p=await b.newPage();await p.goto('http://127.0.0.1:4211/en');await p.waitForTimeout(8000);
for(const width of[1920,1440,1280,1024,390,360]){await p.setViewportSize({width,height:1000});await p.waitForTimeout(200);const info=await p.evaluate(()=>{const logo=document.querySelector('.site-nav .nav-logo').getBoundingClientRect();const nav=document.querySelector('.site-desktop-nav').getBoundingClientRect();const actions=document.querySelector('.nav-actions').getBoundingClientRect();return{logo:logo.toJSON(),nav:nav.toJSON(),actions:actions.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth}});assert(!info.overflow,`${width}: no overflow`);if(width>=1280){assert(info.logo.right<info.nav.left,'logo clears links');assert(info.nav.right<info.actions.left,'links clear buttons');}console.log(width,info.logo.width)}await p.setViewportSize({width:1440,height:1000});await p.screenshot({path:'/tmp/lumiq-nav-final.png'});
}finally{await b.close()}
