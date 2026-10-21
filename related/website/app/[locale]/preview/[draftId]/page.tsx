import SiteContentBoundary from "@/components/content/SiteContentBoundary";
import {notFound} from 'next/navigation';
import {readSiteContent} from '@/lib/content/preview';
import {previewPages} from '@/lib/content/preview-pages';
import VisualCanvas from '@/components/content/visual/VisualCanvas';
import {previewOrigin,visualChannel} from '@/lib/generated/platform/visual-editor';
import {requireStaff} from '@/lib/auth/require-staff';
import {fieldManifest} from '@/lib/content/inventory';
import type {Locale} from '@/lib/generated/platform/core';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function PreviewPage({params,searchParams}:{params:Promise<{locale:string;draftId:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {locale}=await params; const query=await searchParams;
  const page=query.page??'/';
  if(typeof page!=='string'||!Object.hasOwn(previewPages,page))notFound();
  const snapshot=await readSiteContent();
  if(query.editor!==undefined){
    const adminOrigin=previewOrigin(process.env.ADMIN_ORIGIN);
    if(typeof query.editor!=='string'||!visualChannel.test(query.editor)||!adminOrigin)notFound();
    const actor=await requireStaff(['admin','editor']);
    const fields=fieldManifest.fields.filter(field=>field.editable&&(actor.role==='admin'||!field.adminOnly)).map(({path,pages,type,mediaPurpose})=>({path,pages,type,mediaPurpose}));
    return <VisualCanvas initial={snapshot} locale={locale as Locale} page={page} channel={query.editor} adminOrigin={adminOrigin} fields={fields}/>;
  }
  const {default:Page}=await previewPages[page as keyof typeof previewPages]();
  return <SiteContentBoundary><Page /></SiteContentBoundary>;
}
