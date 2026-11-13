import type { ContentSnapshot } from '@/lib/generated/platform/content';
import profiles from './profiles.json';
import { mediaPresentation } from './presentation';

export function uploadProfiles(media: ContentSnapshot['media'], websiteOrigin: string | null, hostCap: number, published: boolean) {
  const preview = (key: string) => {
    const slot = media[key];
    if (slot?.assetId) return `/api/media/preview?assetId=${slot.assetId}`;
    const url = slot?.url || profiles[key as keyof typeof profiles].legacyUrl;
    return websiteOrigin ? new URL(url, websiteOrigin).href : null;
  };
  return Object.entries(profiles).map(([key, value]) => {
    const presentation = mediaPresentation(key);
    return { key, ...presentation, kind: value.kind, profile: value.profile,
      label: `${presentation.group} · ${presentation.title}`,
      previewUrl: preview(key), posterUrl: value.kind === 'video' && value.companions.length ? preview(value.companions[0]) : null,
      previewSource: published && media[key] ? '官網目前素材' : '原始參考素材',
      maxBytes: Math.min(hostCap, value.kind === 'image' ? 20971520 : 52428800), mimes: value.mimes as string[],
      companions: value.companions.map(companion => mediaPresentation(companion).title),
      reason: 'readOnlyReason' in value ? value.readOnlyReason : null,
      constraints: 'duration' in value ? `${value.width}:${value.height}；${value.duration === null ? '最長 600 秒' : value.duration + ' 秒（±1/24秒）'}；${value.codec}` : `${'width' in value ? `${value.width}:${value.height}；` : ''}JPEG / PNG / WebP`,
    };
  });
}
export type UploadProfile = ReturnType<typeof uploadProfiles>[number];
