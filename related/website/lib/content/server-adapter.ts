import 'server-only';
import {getLocale} from 'next-intl/server';
import {headers} from 'next/headers';
import {readSiteContent} from './preview';
import {readPublishedContent} from './read';
import {routing} from '@/i18n/routing';
import {hasLocale} from 'next-intl';
import {createContentAdapter} from './adapter';
import type {Locale} from '@/i18n/routing';
export async function readContentAdapter({publishedOnly = false}: {publishedOnly?:boolean} = {}) {
  if (publishedOnly) {
    const requested = (await headers()).get('x-next-intl-locale');
    const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
    return createContentAdapter((await readPublishedContent()).snapshot, locale, false);
  }
  return createContentAdapter(await readSiteContent(),await getLocale() as Locale,Boolean((await headers()).get('x-lumiq-preview-draft')));
}
