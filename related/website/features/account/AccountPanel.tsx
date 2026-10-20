'use client';
import {useState, type FormEvent} from 'react';
import type {Locale, Profile, ShippingAddress, ApiResult} from '@/lib/generated/platform/core';
import {accountCopy, accountError} from './copy';

const emptyAddress: ShippingAddress = {name:'', country:'', region:'', city:'', postalCode:'', line1:'', line2:'', phone:''};

export function AccountPanel({locale, initial}: {locale:Locale; initial:ApiResult<Profile>}) {
  const t = accountCopy[locale];
  const [profile, setProfile] = useState(initial.ok ? initial.data : null);
  const [address, setAddress] = useState(initial.ok && initial.data.shippingAddress ? initial.data.shippingAddress : emptyAddress);
  const [enabled, setEnabled] = useState(Boolean(initial.ok && initial.data.shippingAddress));
  const [message, setMessage] = useState(initial.ok ? '' : accountError(locale, initial.error));
  const [pending, setPending] = useState(false);
  const [expired, setExpired] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setPending(true);
    try {
      const response = await fetch('/api/account/profile', {
        method:'PATCH', headers:{'Content-Type':'application/json'}, cache:'no-store',
        body:JSON.stringify({displayName:profile.displayName, locale:profile.locale, shippingAddress:enabled ? address : null}),
      });
      const result = await response.json();
      setMessage(result.ok ? t.saved : accountError(locale, result.error));
      if (result.ok) setProfile(result.data);
      else if (result.error === 'UNAUTHENTICATED' || result.error === 'FORBIDDEN') {
        setExpired(true);
        setProfile(null);
      }
    } catch { setMessage(t.unavailable); }
    setPending(false);
  }

  async function signOut() {
    setPending(true);
    try {
      const response = await fetch('/api/auth/signout', {method:'POST', cache:'no-store'});
      if (response.ok || response.status === 401) {
        window.location.assign(`/${locale}/login?status=signed-out`);
        return;
      }
    } catch { /* Show a retryable error below. */ }
    setMessage(t.unavailable);
    setPending(false);
  }

  if (!profile) return (
    <section className="members-panel">
      <p>{t.noAccount}</p><p role="status">{expired ? t.expired : message}</p>
      <a className="members-primary" href={`/${locale}/login`}>{t.signIn}</a>
      <a href={`/${locale}/register`}>{t.register}</a>
    </section>
  );

  const labels = {name:t.recipient, country:t.country, region:t.region, city:t.city, postalCode:t.postalCode, line1:t.line1, line2:t.line2, phone:t.phone};
  const limits = {name:120, country:2, region:120, city:120, postalCode:32, line1:500, line2:500, phone:40};
  return (
    <form className="members-panel" onSubmit={submit}>
      <p>{t.signedIn}</p>
      <label>{t.name}<input name="displayName" maxLength={120} value={profile.displayName} autoComplete="nickname" onChange={event => setProfile({...profile, displayName:event.target.value})}/></label>
      <label>{t.locale}
        <select name="locale" value={profile.locale} onChange={event => setProfile({...profile, locale:event.target.value as Locale})}>
          <option value="en">English</option><option value="zh-hant">繁體中文</option><option value="ja">日本語</option>
        </select>
      </label>
      <label className="members-check"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)}/>{t.addressEnabled}</label>
      {enabled && (
        <fieldset className="account-address">
          <legend>{t.address}</legend>
          {(Object.keys(labels) as (keyof ShippingAddress)[]).map(key => (
            <label key={key}>{labels[key]}
              {key === 'line1' || key === 'line2' ? (
                <textarea aria-label={labels[key]} name={key} rows={2} maxLength={limits[key]} required={key === 'line1'} value={address[key]} onChange={event => setAddress({...address, [key]:event.target.value})}/>
              ) : (
                <input aria-label={labels[key]} name={key} maxLength={limits[key]} required={['name','country','city'].includes(key)} value={address[key]} autoComplete={key === 'country' ? 'country' : key === 'phone' ? 'tel' : 'off'} onChange={event => setAddress({...address, [key]:key === 'country' ? event.target.value.toUpperCase() : event.target.value})}/>
              )}
            </label>
          ))}
        </fieldset>
      )}
      <p role="status" aria-live="polite">{message}</p>
      <div className="members-form-actions">
        <button className="members-primary" disabled={pending}>{pending ? t.pending : t.save}</button>
        <button type="button" disabled={pending} onClick={signOut}>{t.signOut}</button>
        <a href={`/${locale}/reset-password`}>{t.reset}</a>
      </div>
    </form>
  );
}
