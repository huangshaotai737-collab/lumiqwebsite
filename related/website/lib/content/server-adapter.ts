import 'server-only';
import {getLocale} from 'next-intl/server';
import {headers} from 'next/headers';
import {readSiteContent} from './preview';
import {createContentAdapter} from './adapter';
import type {Locale} from '@/i18n/routing';
export async function readContentAdapter(){return createContentAdapter(await readSiteContent(),await getLocale() as Locale,Boolean((await headers()).get('x-lumiq-preview-draft')));}
