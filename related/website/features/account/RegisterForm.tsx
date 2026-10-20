'use client';
import {useEffect, useState, type FormEvent} from 'react';
import type {Locale} from '@/lib/generated/platform/core';
import {accountCopy, accountError} from './copy';

export function RegisterForm({locale, configured, next}: {locale:Locale; configured:boolean; next?:string}) {
  const t = accountCopy[locale];
  const [message, setMessage] = useState(t.verify);
  const [pending, setPending] = useState(false);

  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/register', {
        method:'POST', headers:{'Content-Type':'application/json'}, cache:'no-store',
        body:JSON.stringify({email:fields.get('email'), password:fields.get('password'), locale, next}),
      });
      const result = await response.json();
      setMessage(result.ok ? t.sent : accountError(locale, result.error));
    } catch {
      setMessage(t.unavailable);
    }
    setPending(false);
  }

  return (
    <form method="POST" className="members-panel account-form" onSubmit={submit}>
      <p role="status">{configured ? message : t.unavailable}</p>
      <label>{t.email}<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>
      <label>{t.password}<input name="password" type="password" required minLength={8} maxLength={1024} autoComplete="new-password"/></label>
      <button className="members-primary" disabled={!ready || !configured || pending}>{pending ? t.pending : t.register}</button>
      <a href={`/${locale}/login`}>{t.signIn}</a>
      <a href={`/${locale}/reset-password`}>{t.reset}</a>
    </form>
  );
}
