import SiteContentBoundary from "@/components/content/SiteContentBoundary";
import {notFound} from 'next/navigation';
import {readSiteContent} from '@/lib/content/preview';
import {previewPages} from '@/lib/content/preview-pages';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function PreviewPage({params,searchParams}:{params:Promise<{locale:string;draftId:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  await params; const query=await searchParams;
  const page=query.page??'/';
  if(typeof page!=='string'||!Object.hasOwn(previewPages,page))notFound();
  await readSiteContent();
  const {default:Page}=await previewPages[page as keyof typeof previewPages]();
  return <SiteContentBoundary><Page /></SiteContentBoundary>;
}
