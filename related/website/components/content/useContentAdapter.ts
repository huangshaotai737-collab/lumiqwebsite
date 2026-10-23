'use client';
import {useMemo} from 'react';
import {useLocale} from 'next-intl';
import type {Locale} from '@/i18n/routing';
import {useSiteContent,useContentPreview} from './SiteContentProvider';
import {createContentAdapter} from '@/lib/content/adapter';
export function useContentAdapter(){const snapshot=useSiteContent(),locale=useLocale() as Locale,preview=useContentPreview();return useMemo(()=>createContentAdapter(snapshot,locale,preview),[snapshot,locale,preview]);}
