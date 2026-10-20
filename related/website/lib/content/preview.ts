import 'server-only';
import {cache} from 'react';
import {headers} from 'next/headers';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/auth/server';
import {requireStaff} from '@/lib/auth/require-staff';
import {HttpError} from '@/lib/http/result';
import {parseSnapshot} from './parse';
import {readPublishedContent} from './read';
import type {ContentSnapshot} from '@/lib/generated/platform/content';
import type {UUID} from '@/lib/generated/platform/core';
export const readPreview = cache(async (draftId:UUID):Promise<ContentSnapshot> => {
  await requireStaff(['admin','editor']);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draftId))throw new HttpError('NOT_FOUND',404);
  const client=await createClient();
  const {data,error}=await client.rpc('get_content_draft',{id:draftId});
  if(error)throw new HttpError('UNAVAILABLE',503);
  if(!data)throw new HttpError('NOT_FOUND',404);
  return parseSnapshot((data as {snapshot:unknown}).snapshot);
});
/** Only middleware creates the header, then this boundary independently verifies live staff. */
export const readSiteContent = cache(async ():Promise<ContentSnapshot>=>{
  const request=await headers();const id=request.get('x-lumiq-preview-draft');
  if(!id)return (await readPublishedContent()).snapshot;
  try{return await readPreview(id as UUID);}catch(error){
    if(error instanceof HttpError && error.status===401){
      const next=request.get('x-lumiq-preview-path') || '/en';
      const locale=/^\/(en|zh-hant|ja)\//.exec(next)?.[1] || 'en';
      redirect(`/${locale}/login?next=${encodeURIComponent(next)}`);
    }
    notFound();
  }
});
