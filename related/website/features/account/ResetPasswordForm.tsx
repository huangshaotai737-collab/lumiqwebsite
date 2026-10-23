'use client';
import {useEffect, useState, type FormEvent} from 'react';
import type {Locale} from '@/lib/generated/platform/core';
import {useAccountIdentity} from './use-account-identity';
import {notifyAccountChange} from './session-event';
import {accountCopy, accountError} from './copy';

export function ResetPasswordForm({locale, configured, update, expired, expectedUserId}: {locale:Locale; configured:boolean; update:boolean; expired:boolean; expectedUserId:string|null}) {
  const identity = useAccountIdentity(expectedUserId);
  const t = accountCopy[locale];
  const [message, setMessage] = useState(expired ? t.expired : '');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => {setPending(false);}, [identity.generation]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(update && (!identity.profile || !identity.current(identity.generation)))return;
    const generation=identity.generation;
    setPending(true);
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/reset', {
        method:update ? 'PATCH' : 'POST',
        headers:{'Content-Type':'application/json'}, cache:'no-store',
        body:JSON.stringify(update ? {password:fields.get('password'),expectedUserId} : {email:fields.get('email'), locale}),
      });
      const result = await response.json();
      if(update && !identity.current(generation))return;
      setMessage(result.ok ? (update ? t.updated : t.sent) : accountError(locale, result.error));
      if (result.ok && update) { setDone(true); notifyAccountChange(true); }
      else if(update && ['FORBIDDEN','UNAUTHENTICATED'].includes(result.error)) identity.invalidate();
    } catch {
      if(!update || identity.current(generation))setMessage(t.unavailable);
    }
    if(!update || identity.current(generation))setPending(false);
  }

  return (
    <form method="POST" className="members-panel account-form" onSubmit={submit}>
      <p role="status">{configured ? message : t.unavailable}</p>
      {update ? (!done && !expired && (
        identity.profile ? <label>{t.newPassword}<input key={identity.generation} name="password" type="password" required minLength={8} maxLength={1024} autoComplete="new-password"/></label> :
          <p>{identity.status==='checking' ? t.pending : identity.status==='invalid' ? t.expired : t.unavailable}</p>
      )) : (
        <label>{t.email}<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>
      )}
      <button className="members-primary" disabled={!ready || !configured || pending || done || (update && (expired || !identity.profile))}>
        {pending ? t.pending : update ? t.updatePassword : t.sendReset}
      </button>
      <a href={`/${locale}/reset-password`}>{t.sendReset}</a>
      <a href={`/${locale}/login`}>{t.signIn}</a>
    </form>
  );
}
