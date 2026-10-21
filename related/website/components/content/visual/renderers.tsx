'use client';
import dynamic from 'next/dynamic';
import {useLocale} from 'next-intl';
import type {Locale} from '@/lib/generated/platform/core';
const pages:Record<string,ReturnType<typeof dynamic>>={
 '/':dynamic(()=>import('./generated/Home')),
 '/story':dynamic(()=>import('./generated/Story')),
 '/contact':dynamic(()=>import('./generated/Contact')),
 '/products':dynamic(()=>import('@/components/ProductsShowcase')),
 '/products/ola':dynamic(()=>import('@/components/OlaProductPage')),
 '/products/ola-go':dynamic(()=>import('@/components/OlaGoProductPage')),
 '/products/nest':dynamic(()=>import('@/components/NestProductPage')),
 '/products/tablet':dynamic(()=>import('@/app/products/tablet/page')),
 '/products/print':dynamic(()=>import('./generated/Print')),
 '/about':dynamic(()=>import('@/app/about/page')),
 '/plans':dynamic(()=>import('@/components/PlansContent')),
 '/prelaunch':dynamic(()=>import('@/app/prelaunch/page')),
 '/faq':dynamic(()=>import('@/app/faq/page')),
 '/legal/privacy':dynamic(()=>import('@/app/legal/privacy/page')),
 '/legal/terms':dynamic(()=>import('@/app/legal/terms/page')),
 '/legal/cookies':dynamic(()=>import('@/app/legal/cookies/page')),
 '/legal/child-safety':dynamic(()=>import('@/app/legal/child-safety/page')),
};
const Members=dynamic(()=>import('@/components/MembersArea'));
export default function VisualPage({page}:{page:string}){
 const locale=useLocale() as Locale;
 if(page==='/members')return <Members locale={locale} profile={{ok:false,error:'UNAUTHENTICATED',requestId:'visual-preview'}}/>;
 const Page=pages[page];return Page?<Page/>:<p>此页面暂不支持预览。</p>;
}
