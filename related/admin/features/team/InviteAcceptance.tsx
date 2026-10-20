'use client';
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
    '请验证受邀邮箱的账号，再明确接受邀请。',
  );
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState(false);
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
          ? '账号已验证，请点击接受邀请。'
          : '账号验证失败，请确认邮箱已验证并检查密码。',
      );
    } catch {
      setMessage('网络连接失败，请重试。');
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
          ? '已获得员工权限，请前往工作台。'
          : result.error === 'FORBIDDEN'
            ? '账号邮箱与邀请不一致，或账号不可用。'
            : '邀请已失效、已使用或未发送，请联系管理员。',
      );
      if (result.ok) {
        setConsumed(true);
        window.history.replaceState(null, '', '/invite');
      }
    } catch {
      setMessage('网络连接失败，请重试。');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <form className="login-form" onSubmit={signin}>
        <label htmlFor="recipient-email">受邀邮箱</label>
        <input
          id="recipient-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
        />
        <label htmlFor="recipient-password">密码</label>
        <input
          id="recipient-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={1024}
        />
        <button className="primary-button" disabled={pending || !invitation}>
          验证账号
        </button>
      </form>
      <p role="status">
        {hash && !invitation && !consumed
          ? '邀请链接无效，请联系管理员重新发送。'
          : message}
      </p>
      <button
        className="primary-button"
        disabled={pending || !invitation || !verified}
        onClick={accept}
      >
        接受邀请
      </button>
      <p>新账号须先在官网完成注册和邮箱验证。登录不会自动成为员工。</p>
      <Link href="/">前往工作台</Link>
    </>
  );
}
