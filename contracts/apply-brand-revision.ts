import type {ContentSnapshot} from './content';
import {withBrandContent} from './brand-content';
import {brandRevisionPatch} from './brand-revision-patch';

/** Explicit one-time content upgrade. Used for the bundled default and to prepare
 * a NEW local draft, never as an overlay on published or saved customer edits. */
export function applyBrandRevision(input:ContentSnapshot) {
  const snapshot=structuredClone(input);
  const conflicts:string[]=[];
  let applied=0;
  for(const patch of brandRevisionPatch) {
    const segments=patch.path.split('.');
    const last=segments.pop()!;
    const parent=segments.reduce<unknown>((node,key)=>node&&typeof node==='object'?(node as Record<string,unknown>)[key]:undefined,snapshot);
    if(!parent||typeof parent!=='object') {conflicts.push(patch.path);continue;}
    const record=parent as Record<string,unknown>;
    if(record[last]===patch.before) {record[last]=patch.after;applied++;}
    else if(record[last]!==patch.after) conflicts.push(patch.path);
  }
  return {snapshot:withBrandContent(snapshot),applied,conflicts};
}
