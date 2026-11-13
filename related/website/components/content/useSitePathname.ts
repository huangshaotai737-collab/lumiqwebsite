'use client';
import {usePathname} from '@/i18n/navigation';
import {useSearchParams} from 'next/navigation';
import {useContentPreview} from './SiteContentProvider';
/** The preview renders the selected existing page, including navigation presentation. */
export function useSitePathname(){const pathname=usePathname(),query=useSearchParams(),preview=useContentPreview();return preview?(query.get('page')||'/'):pathname;}
