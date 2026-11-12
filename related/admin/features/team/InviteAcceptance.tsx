'use client';
import {useHydrated} from '@/lib/use-hydrated';
import { useSyncExternalStore, useState, type FormEvent } from 'react';
import Link from 'next/link';
const subscribe = (callback: () => void) => {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
};
export function InviteAcceptance() {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  );
  const [consumed, setConsumed] = useState(false);
  const values = new URLSearchParams(hash.slice(1));
  const inviteId = values.get('inviteId');
  const token = values.get('token');
  const invitation =
    !consumed && inviteId && token ? { inviteId, token } : null;
  const [message, setMessage] = useState(
    '請驗證受邀郵箱的賬號，再明確接受邀請。',
  );
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState(false);
  const ready = useHydrated();
  async function signin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signin',
          email: fields.get('email'),
          password: fields.get('password'),
        }),
      });
      const result = await response.json();
      setVerified(result.ok);
      setMessage(
        result.ok
          ? '賬號已驗證，請點擊接受邀請。'
          : '賬號驗證失敗，請確認郵箱已驗證並檢查密碼。',
      );
    } catch {
      setMessage('網絡連接失敗，請重試。');
    } finally {
      setPending(false);
    }
  }
  async function accept() {
    if (!invitation) return;
    setPending(true);
    try {
      const response = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invitation),
      });
      const result = await response.json();
      setMessage(
        result.ok
          ? '已獲得員工權限，請前往工作臺。'
          : result.error === 'FORBIDDEN'
            ? '賬號郵箱與邀請不一致，或賬號不可用。'
            : '邀請已失效、已使用或未發送，請聯繫管理員。',
      );
      if (result.ok) {
        setConsumed(true);
        window.history.replaceState(null, '', '/invite');
      }
    } catch {
      setMessage('網絡連接失敗，請重試。');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <form method="POST" className="login-form" onSubmit={signin}>
        <label htmlFor="recipient-email">受邀郵箱</label>
        <input
          id="recipient-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
        />
        <label htmlFor="recipient-password">密碼</label>
        <input
          id="recipient-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={1024}
        />
        <button className="primary-button" disabled={!ready || pending || !invitation}>
          驗證賬號
        </button>
      </form>
      <p role="status">
        {hash && !invitation && !consumed
          ? '邀請鏈接無效，請聯繫管理員重新發送。'
          : message}
      </p>
      <button
        className="primary-button"
        disabled={!ready || pending || !invitation || !verified}
        onClick={accept}
      >
        接受邀請
      </button>
      <p>新賬號須先在官網完成註冊和郵箱驗證。登錄不會自動成為員工。</p>
      <Link href="/">前往工作臺</Link>
    </>
  );
}
