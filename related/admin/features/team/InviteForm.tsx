'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
export function InviteForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(
    '邀请有效期 48 小时，受邀人须使用同一已确认邮箱接受。',
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
          ? '邀请已发送，尚未授予员工权限。'
          : result.error === 'CONFLICT'
            ? '账号已有员工权限，请在列表管理。'
            : result.error === 'FORBIDDEN'
              ? '没有邀请权限。'
              : '邀请未发送，请检查配置或稍后重试。',
      );
      if (result.ok) router.refresh();
    } catch {
      setMessage('网络连接失败，请重试。');
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel" aria-label="邀请员工">
      <h2>邀请员工</h2>
      <form className="login-form" onSubmit={submit}>
        <label htmlFor="invite-email">邀请邮箱</label>
        <input
          id="invite-email"
          name="email"
          type="email"
          maxLength={254}
          required
        />
        <label htmlFor="invite-role">邀请角色</label>
        <select id="invite-role" name="role" defaultValue="editor">
          <option value="editor">内容编辑</option>
          <option value="operations">运营</option>
          <option value="admin">管理员</option>
        </select>
        <button className="primary-button" disabled={pending}>
          {pending ? '正在发送…' : '发送邀请'}
        </button>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}
