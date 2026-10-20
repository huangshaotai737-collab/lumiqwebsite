'use client';
import { useState, type FormEvent } from 'react';
export function LoginForm({configured,next,notice}: {configured:boolean;next:string;notice:string}) {
  const [pending,setPending] = useState(false);
  const [message,setMessage] = useState(notice);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage('正在验证身份…');
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/signin',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({email:fields.get('email'),password:fields.get('password'),next})});
      const result = await response.json();
      if (result.ok) {window.location.assign(result.data.next);return;}
      const messages:Record<string,string> = {UNAUTHENTICATED:'邮箱或密码无效，或邮箱尚未验证。',FORBIDDEN:'当前账号没有有效的员工权限。',RATE_LIMITED:'尝试次数过多，请稍后重试。',INVALID_INPUT:'请检查邮箱和密码。'};
      setMessage(messages[result.error] || '认证服务暂时不可用，请稍后重试。');
    } catch {setMessage('网络连接失败，请重试。');}
    setPending(false);
  }
  return <><p className="notice" id="login-status" role="status">{message}</p><form className="login-form" onSubmit={submit} aria-describedby="login-status">
    <label htmlFor="email">工作邮箱</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
    <label htmlFor="password">密码</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} />
    <button className="primary-button" type="submit" disabled={!configured || pending}>{pending ? '正在登录…' : '登录'}</button>
  </form></>;
}
