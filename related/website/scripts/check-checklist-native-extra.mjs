import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const session=process.env.SAFARI_SESSION,base=process.env.SITE_URL||'http://localhost:4226';
const out='/private/tmp/lumiq-checklist-safari-final';
const call=async(path,body,method='POST')=>{const res=await fetch(`http://localhost:9235/session/${session}/${path}`,{method,headers:{'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(body)})});const {value}=await res.json();if(value?.error)throw Error(value.message);return value;};
const js=(script,args=[])=>call('execute/sync',{script,args});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async script=>{const end=Date.now()+20000;do{if(await js(script))return;await wait(100);}while(Date.now()<end);throw Error(`Timed out: ${script}`);};
const capture=async name=>fs.writeFile(`${out}/${name}.png`,Buffer.from(await call('screenshot',undefined,'GET'),'base64'));
// This driver session accepts pointer commands without dispatching click events.
// Record programmatic native-Safari interaction separately from physical input.
const click=selector=>js(`document.querySelector(arguments[0]).click()`,[selector]);
const fill=(selector,text)=>js(`const e=document.querySelector(arguments[0]);const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,arguments[1]);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));`,[selector,text]);
await call('window/rect',{width:1440,height:1000});
await call('url',{url:`${base}/zh-hant/members`});await wait(800);
const prior=await js(`return localStorage.getItem('lumiq-member-preview-v1')`);
const evidence={interaction:'programmatic events in native Safari; physical pointer not verified'};
try{
 await js(`localStorage.removeItem('lumiq-member-preview-v1');location.reload()`);await wait(800);
 await until(`return document.querySelector('.members-empty .members-primary')?.disabled===false`);
 await click('.members-empty .members-primary');await until(`return document.querySelectorAll('.members-text-action').length===2`);
 await click('.members-text-action[aria-label="設定 LUMIQ OLA"]');await wait(100);
 await fill('.members-panel input[maxlength="40"]','客廳 OLA 驗收');await click('.members-panel button[type="submit"]');
 await call('url',{url:`${base}/zh-hant/members`});await until(`return document.querySelectorAll('.members-text-action').length===2`);
 assert.equal(await js(`return [...document.querySelectorAll('.members-device h3')].some(e=>e.textContent==='客廳 OLA 驗收')`),true);
 evidence.localSettingsPersist=true;
 await capture('members-devices-after');
 await js(`document.querySelectorAll('.members-sidebar button')[3].click()`);await wait(100);
 await fill('.members-panel textarea','Safari 驗收草稿，未提交給客服');await click('.members-panel button[type="submit"]');
 const message=await js(`return document.querySelector('.members-status').textContent`);assert.ok(message.includes('未送交客服'));evidence.feedbackMessage=message;
 evidence.disclosure=await js(`return document.querySelector('.members-disclosure').textContent`);assert.ok(evidence.disclosure.includes('尚未接入'));
}finally{
 await js(`const value=arguments[0];if(value===null)localStorage.removeItem('lumiq-member-preview-v1');else localStorage.setItem('lumiq-member-preview-v1',value);`,[prior]);
}
await call('url',{url:`${base}/zh-hant/contact`});await wait(900);
assert.ok(await js(`return document.querySelector('main').textContent.includes('註冊地址有待確認')`));
await js(`document.querySelector('main h2').scrollIntoView({block:'center',behavior:'instant'})`);await wait(800);await capture('address-pending');
await call('url',{url:`${base}/zh-hant`});await wait(1800);
await js(`const s=document.querySelector('.lh-room-section'),nav=document.querySelector('.site-nav').getBoundingClientRect().height;window.scrollTo({top:scrollY+s.getBoundingClientRect().top-nav,behavior:'instant'})`);await wait(1000);await capture('room-after');
for(const size of [{width:2435,height:498},{width:3440,height:1440}]){
 await call('window/rect',size);await wait(500);await js(`document.querySelector('.lh-products-stage').scrollIntoView({block:'center',behavior:'instant'})`);await wait(1000);
 assert.equal(await js(`return document.documentElement.scrollWidth>innerWidth+1`),false);await capture(`extreme-${size.width}x${size.height}`);
}
await call('window/rect',{width:1440,height:1000});
await fs.writeFile(`${out}/extra-report.json`,JSON.stringify({base,evidence,passed:true},null,2));
console.log('PASS native Safari member settings persistence, unsent feedback disclosure, pending address, room and extreme screenshots');
