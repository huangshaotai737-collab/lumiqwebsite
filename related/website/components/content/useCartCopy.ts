'use client';
import {useTranslations} from 'next-intl';
import {getCartMessages} from '@/lib/cart-messages';
export function useCartCopy() {
  const t=useTranslations('CmsStatic');
  const keys=Object.keys(getCartMessages('en')).filter(key=>!['added','countLabel','unpriced'].includes(key));
  return {...Object.fromEntries(keys.map(key=>[key,t(`cart_${key}`)])),added:(name:string)=>t('cart_added',{name}),countLabel:(count:number)=>t('cart_countLabel',{count}),unpriced:(count:number)=>t('cart_unpriced',{count})} as ReturnType<typeof getCartMessages>;
}
