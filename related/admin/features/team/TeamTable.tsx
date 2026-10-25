'use client';
import { useState } from 'react';
import type { StaffRole } from '@/lib/generated/platform/core';
export type TeamMember = {
  user_id: string;
  email: string;
  role: string;
  active: boolean;
};
function TeamRow({ member }: { member: TeamMember }) {
  const [role, setRole] = useState(member.role);
  const [active, setActive] = useState(member.active);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function save() {
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/team/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: member.user_id,
          role: role as StaffRole,
          active,
        }),
      });
      const result = await response.json();
      setMessage(
        result.ok
          ? '已保存'
          : result.error === 'CONFLICT'
            ? '不能停用或降级最后一位管理员。'
            : result.error === 'FORBIDDEN'
              ? '权限已失效，请重新登录。'
              : '保存失败，请重试。',
      );
    } catch {
      setMessage('网络连接失败，请重试。');
    } finally {
      setPending(false);
    }
  }
  return (
    <tr>
      <td data-label="邮箱">{member.email}</td>
      <td data-label="角色">
        <select
          aria-label="员工角色"
          disabled={pending}
          value={role}
          onChange={(event) => { setRole(event.target.value); setMessage(''); }}
        >
          <option value="admin">管理员</option>
          <option value="editor">内容编辑</option>
          <option value="operations">运营</option>
        </select>
      </td>
      <td data-label="在职状态">
        <label>
          <input
            aria-label="在职"
            type="checkbox"
            disabled={pending}
            checked={active}
            onChange={(event) => { setActive(event.target.checked); setMessage(''); }}
          />{' '}
          在职
        </label>
      </td>
      <td data-label="操作">
        <button className="primary-button" onClick={save} disabled={pending}>
          {pending ? '正在保存…' : '保存权限'}
        </button>
        <p role="status">{message}</p>
      </td>
    </tr>
  );
}
export function TeamTable({ members }: { members: TeamMember[] }) {
  return (
    <div
      className="table-scroll team-list-scroll"
      tabIndex={0}
      aria-label="员工列表"
    >
      <table className="team-list-table">
        <thead>
          <tr>
            <th>邮箱</th>
            <th>角色</th>
            <th>在职状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <TeamRow key={member.user_id} member={member} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
