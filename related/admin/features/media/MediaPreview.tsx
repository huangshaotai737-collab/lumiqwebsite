'use client';
import Image from 'next/image';
import { useState } from 'react';

export function MediaPreview({ src, kind, title, thumbnail = false, poster, emptyLabel = '預覽暫不可用' }: { src: string | null; kind: string; title: string; thumbnail?: boolean; poster?: string; emptyLabel?: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={`media-preview${thumbnail ? ' media-preview--thumbnail' : ''}`}>
    {!src || failed ? <span className="media-preview-unavailable">{emptyLabel}</span>
      : kind === 'video' ? <video src={thumbnail && poster ? undefined : src} poster={poster} controls={!thumbnail} muted playsInline preload={thumbnail ? 'none' : 'metadata'} aria-label={title} onError={() => setFailed(true)} />
      : <Image unoptimized src={src} width={640} height={420} alt={thumbnail ? '' : title} loading={thumbnail ? 'lazy' : 'eager'} onError={() => setFailed(true)} />}
    {thumbnail && kind === 'video' && <span className="media-video-label">▶ 影片</span>}
  </div>;
}
