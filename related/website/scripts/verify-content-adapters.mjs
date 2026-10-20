import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
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
  const sources=new Map(await Promise.all([...new Set(ledger.static.map(x=>x.file).concat(ledger.media.map(x=>x.adapterFile)))].map(async file=>[file,await read(file)])));
  for(const entry of ledger.static)if(!sources.get(entry.file).includes(entry.expression))throw Error(`Refusing to discard imported field ${entry.path}: ${entry.file}`);
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
  console.log(`Content adapters verified: preserved ${manifest.fields.length} fields, ${Object.keys(seed.media).length} exact slots, ${ledger.media.length} media usages.`);
}
