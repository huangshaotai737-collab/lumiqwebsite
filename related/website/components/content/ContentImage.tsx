'use client';
import Image,{type ImageProps} from 'next/image';
import {useContentAdapter} from './useContentAdapter';
export type {ImageProps} from 'next/image';
export default function ContentImage(props:ImageProps){
  const cms=useContentAdapter();
  const src=typeof props.src==='string'?cms.url(props.src):props.src;
  return <Image {...props} alt={props.alt} src={src} unoptimized={props.unoptimized || (typeof src==='string' && src.startsWith('/api/content/preview-media/'))} />;
}
