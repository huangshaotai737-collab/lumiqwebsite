import {webkit} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
const sizes=[{width:320,height:740},{width:390,height:844},{width:768,height:1024},{width:1024,height:1280},{width:1100,height:1000},{width:1280,height:720},{width:1440,height:900},{width:2435,height:498},{width:3440,height:1440}];
fs.writeFileSync('qa/release-platform/webkit-launcher.sh',fs.readFileSync(webkit.executablePath()));
const browser=await webkit.launch();
const deadline=async(task,label)=>{let timer;try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),30000);})]);}finally{clearTimeout(timer);}};
try{
 for(let i=0;i<15;i++){
  const locale=['en','zh-hant','ja'][i%3];
  const page=await browser.newPage();
  console.log('HOME_START',i,locale);
  await page.goto(`http://localhost:4223/${locale}`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('.lh-home')?.dataset.homeState==='open',null,{timeout:60000});
  for(const viewport of sizes){
   console.log('HOME_VIEW',i,JSON.stringify(viewport));
   await deadline(page.setViewportSize(viewport),'viewport stalled');
   await page.waitForTimeout(120);
   await deadline(page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1, width:innerWidth})),'evaluate stalled');
  }
  await page.close();
  console.log('HOME_DONE',i,execFileSync('free',['-m'],{encoding:'utf8'}));
 }
}catch(error){
 console.log('NATIVE_FAILURE',error.message);
 const table=execFileSync('ps',['-eo','pid=,ppid=,rss=,comm='],{encoding:'utf8'});
 fs.writeFileSync('qa/release-platform/native-processes.log',table);
 const rows=table.split('\n').filter(line=>/MiniBrowser|WPEWebProcess|WPENetworkProce|WebKit.*Proces/.test(line));
 for(const row of rows){
  const pid=row.trim().split(/\s+/)[0];
  try{const stack=execFileSync('sudo',['-n','gdb','-batch','-ex','set pagination off','-ex','thread apply all bt 14','-p',pid],{encoding:'utf8',timeout:20000,maxBuffer:10000000});fs.appendFileSync('qa/release-platform/native-stacks.log',row+'\n'+stack+'\n');}
  catch(e){fs.appendFileSync('qa/release-platform/native-stacks.log',row+'\n'+String(e.stdout??'')+'\n'+String(e.stderr??e.message)+'\n');}
 }
 throw error;
}finally{await deadline(browser.close(),'close stalled');}
