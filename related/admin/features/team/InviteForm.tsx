'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
export function InviteForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(
    '邀請有效期 48 小時，受邀人須使用同一已確認郵箱接受。',
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fields.get('email'),
          role: fields.get('role'),
        }),
      });
      const result = await response.json();
      setMessage(
        result.ok
          ? '邀請已發送，尚未授予員工權限。'
          : result.error === 'CONFLICT'
            ? '賬號已有員工權限，請在列表管理。'
            : result.error === 'FORBIDDEN'
              ? '沒有邀請權限。'
              : '邀請未發送，請檢查配置或稍後重試。',
      );
      if (result.ok) router.refresh();
    } catch {
      setMessage('網絡連接失敗，請重試。');
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel" aria-label="邀請員工">
      <h2>邀請員工</h2>
      <form className="login-form" onSubmit={submit}>
        <label htmlFor="invite-email">邀請郵箱</label>
        <input
          id="invite-email"
          name="email"
          type="email"
          maxLength={254}
          required
        />
        <label htmlFor="invite-role">邀請角色</label>
        <select id="invite-role" name="role" defaultValue="editor">
          <option value="editor">內容編輯</option>
          <option value="operations">運營</option>
          <option value="admin">管理員</option>
        </select>
        <button className="primary-button" disabled={pending}>
          {pending ? '正在發送…' : '發送邀請'}
        </button>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}
