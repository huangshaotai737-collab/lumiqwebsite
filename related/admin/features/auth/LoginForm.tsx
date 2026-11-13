'use client';
import {useHydrated} from '@/lib/use-hydrated';
import { useState, type FormEvent } from 'react';
export function LoginForm({configured,next,notice}: {configured:boolean;next:string;notice:string}) {
  const [pending,setPending] = useState(false);
  const [message,setMessage] = useState(notice);
  const ready = useHydrated();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage('正在驗證身份…');
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/signin',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({email:fields.get('email'),password:fields.get('password'),next})});
      const result = await response.json();
      if (result.ok) {window.location.assign(result.data.next);return;}
      const messages:Record<string,string> = {UNAUTHENTICATED:'郵箱或密碼無效，或郵箱尚未驗證。',FORBIDDEN:'當前賬號沒有有效的員工權限。',RATE_LIMITED:'嘗試次數過多，請稍後重試。',INVALID_INPUT:'請檢查郵箱和密碼。'};
      setMessage(messages[result.error] || '認證服務暫時不可用，請稍後重試。');
    } catch {setMessage('網絡連接失敗，請重試。');}
    setPending(false);
  }
  return <><p className="notice" id="login-status" role="status">{message}</p><form method="POST" className="login-form" onSubmit={submit} aria-describedby="login-status">
    <label htmlFor="email">工作郵箱</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
    <label htmlFor="password">密碼</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} />
    <button className="primary-button" type="submit" disabled={!ready || !configured || pending}>{pending ? '正在登錄…' : '登錄'}</button>
  </form></>;
}
