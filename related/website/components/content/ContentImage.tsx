'use client';
import type {ImageProps} from 'next/image';
import {useContentAdapter} from './useContentAdapter';
import Image from './RecoverableImage';
import responsive from '@/lib/responsive-image-manifest.json';
export type {ImageProps} from 'next/image';
const assets: Record<string, {base: string; widths: number[]}> = responsive;
export default function ContentImage(props: ImageProps) {
  const cms = useContentAdapter();
  if (typeof props.src === 'string' && cms.hidden(props.src)) return null;
  const src = typeof props.src === 'string' ? cms.url(props.src) : props.src;
  const asset = typeof src === 'string' && !cms.preview ? assets[src] : undefined;
  return <Image {...props} key={typeof src === 'string' ? src : src.toString()} alt={props.alt} src={src}
    loader={asset ? ({width}) => `${asset.base}-${asset.widths.find(w => w >= width) ?? asset.widths.at(-1)}.webp` : props.loader}
    unoptimized={(!asset && props.unoptimized) || (typeof src === 'string' && src.startsWith('/api/content/preview-media/'))} />;
}
