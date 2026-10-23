'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function SignOutButton() {
  const router = useRouter();
  const [pending,setPending] = useState(false);
  const [error,setError] = useState('');
  async function signOut() {
    setPending(true); setError('');
    try {
      const response = await fetch('/api/auth/signout',{method:'POST',cache:'no-store'});
      if (response.ok || response.status === 401) {router.replace('/login?status=signed-out');router.refresh();}
      else {setError('退出失败，请重试。');setPending(false);}
    } catch {setError('网络连接失败，请重试。');setPending(false);}
  }
  return <><button type="button" onClick={signOut} disabled={pending}>{pending ? '正在退出…' : '退出登录'}</button><p role="status">{error}</p></>;
}
