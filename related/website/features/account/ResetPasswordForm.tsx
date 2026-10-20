'use client';
import {useState,type FormEvent} from 'react';
import type {Locale} from '@/lib/generated/platform/core';
import {accountCopy,accountError} from './copy';
export function ResetPasswordForm({locale,configured,update,expired}:{locale:Locale;configured:boolean;update:boolean;expired:boolean}){
 const t=accountCopy[locale],[message,setMessage]=useState(expired?t.expired:''),[pending,setPending]=useState(false),[done,setDone]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setPending(true);const fields=new FormData(event.currentTarget);try{const response=await fetch('/api/auth/reset',{method:update?'PATCH':'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(update?{password:fields.get('password')}:{email:fields.get('email'),locale})});const r=await response.json();setMessage(r.ok?(update?t.updated:t.sent):accountError(locale,r.error));if(r.ok&&update)setDone(true);}catch{setMessage(t.unavailable);}setPending(false);}
 return <form className="members-panel account-form" onSubmit={submit}><p role="status">{configured?message:t.unavailable}</p>{update?<label>{t.newPassword}<input name="password" type="password" required minLength={8} maxLength={1024} autoComplete="new-password"/></label>:<label>{t.email}<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>}<button className="members-primary" disabled={!configured||pending||done||expired&&update}>{pending?t.pending:update?t.updatePassword:t.sendReset}</button><a href={`/${locale}/reset-password`}>{t.sendReset}</a><a href={`/${locale}/login`}>{t.signIn}</a></form>;
}
