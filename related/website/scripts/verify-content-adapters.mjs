import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {contentMediaBindings} from './content-media-bindings.mjs';
/** Verifies the reviewed source-to-snapshot handoff. Never reimports rendered CMS data. */
export async function verifyContentAdapters(app,root) {
  const read=file=>readFile(path.join(app,file),'utf8');
  const ledger=JSON.parse(await read('lib/content/source-adapters.json'));
  for(const [file,expected]of Object.entries(ledger.preserved)) {
    const actual=createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
    if(actual!==expected)throw Error(`Stale content export: ${file}; reviewed seed/IDs must be preserved`);
  }
  const manifest=JSON.parse(await read('lib/content/field-manifest.json'));
  const seed=JSON.parse(await read('lib/content/initial-snapshot.json'));
  const retirement=JSON.parse(await read('lib/content/retired-account-fields.json'));
  const retired=new Set();
  for(const entry of retirement.fields) {
    const field=manifest.fields.find(field=>field.path===entry.path);
    if(!field||retired.has(entry.path)||!entry.reason||!entry.replacement||!entry.source?.locator)throw Error('Invalid account field retirement');
    if(field.source && (field.source.file!=='components/MembersArea.tsx'||!/^messages\.(en|zh-hant|ja)\.CmsStatic\.field_[0-9a-f]+$/.test(entry.path)||JSON.stringify(field.source)!==JSON.stringify(entry.source)))throw Error(`Wrong retired source locator: ${entry.path}`);
    if(!field.source && (!/^messages\.(en|zh-hant|ja)\.Members\.[^.]+$/.test(entry.path)||entry.source.locator!==entry.path.split('.').slice(2).join('.')))throw Error('Only explicit legacy Members message leaves may retire');
    retired.add(entry.path);
  }
  const adminRetirement=await readFile(path.join(root,'related/admin/features/content/retired-account-fields.json'),'utf8');
  if(adminRetirement!==await read('lib/content/retired-account-fields.json'))throw Error('Editor retirement inventory out of sync');
  const sources=new Map(await Promise.all([...new Set(ledger.static.map(x=>x.file).concat(ledger.media.map(x=>x.adapterFile)))].map(async file=>[file,await read(file)])));
  for(const entry of ledger.static)if(!sources.get(entry.file).includes(entry.expression)&&!['en','zh-hant','ja'].every(locale=>retired.has(entry.path.replace('{locale}',locale))))throw Error(`Refusing to discard imported field ${entry.path}: ${entry.file}`);
  for(const field of manifest.fields.filter(f=>f.path.startsWith('messages.en.CmsStatic.'))) {
    if(field.path.split('.').at(-1).startsWith('cart_'))continue;
    if(!ledger.static.some(e=>e.path===field.path.replace('.en.','.{locale}.')&&e.file===field.source.file&&e.sourceLocator===field.source.locator))throw Error(`Missing static adapter: ${field.path}`);
  }
  const map=JSON.parse(await read('lib/content/media-map.json'));
  if(Object.keys(map).length!==Object.keys(seed.media).length)throw Error('Missing media slot map');
  for(const [id,slot]of Object.entries(seed.media)) {
    if(map[slot.url]!==id)throw Error(`Wrong media slot: ${id}`);
    for(const use of manifest.mediaSources[id]) {
      const entry=ledger.media.find(e=>e.slot===id&&e.file===use.file&&e.sourceLocator===use.locator);
      if(!entry||!sources.get(entry.adapterFile)?.includes(entry.expression))throw Error(`Missing media adapter: ${id} ${use.file} ${use.locator}`);
    }
  }
  const bindings=JSON.parse(await read('lib/content/media-bindings.json'));
  const adapterFiles=[...new Set(ledger.media.map(entry=>entry.adapterFile))].sort();
  if(JSON.stringify(Object.keys(bindings).sort())!==JSON.stringify(adapterFiles))throw Error('Media binding files changed');
  for(const file of adapterFiles) {
    const actual=contentMediaBindings(file,sources.get(file),ledger.media.filter(entry=>entry.adapterFile===file).map(entry=>entry.expression));
    if(JSON.stringify(actual)!==JSON.stringify(bindings[file]))throw Error(`Media binding changed: ${file}; review occurrence and per-use alt bindings`);
  }
  console.log(`Content adapters verified: preserved ${manifest.fields.length} historical fields (${retired.size} explicitly retired account fields; ${manifest.fields.length-retired.size} active inventory fields), ${Object.keys(seed.media).length} exact slots, ${ledger.media.length} media ledger records; ${adapterFiles.length} files checked for exact occurrence counts and media/alt bindings.`);
}
