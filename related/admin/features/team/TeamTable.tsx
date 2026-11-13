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
            ? '不能停用或降級最後一位管理員。'
            : result.error === 'FORBIDDEN'
              ? '權限已失效，請重新登錄。'
              : '保存失敗，請重試。',
      );
    } catch {
      setMessage('網絡連接失敗，請重試。');
    } finally {
      setPending(false);
    }
  }
  return (
    <tr>
      <td data-label="郵箱">{member.email}</td>
      <td data-label="角色">
        <select
          aria-label="員工角色"
          disabled={pending}
          value={role}
          onChange={(event) => { setRole(event.target.value); setMessage(''); }}
        >
          <option value="admin">管理員</option>
          <option value="editor">內容編輯</option>
          <option value="operations">運營</option>
        </select>
      </td>
      <td data-label="在職狀態">
        <label className="staff-active-toggle">
          <input
            aria-label="在職"
            type="checkbox"
            disabled={pending}
            checked={active}
            onChange={(event) => { setActive(event.target.checked); setMessage(''); }}
          />{' '}
          在職
        </label>
      </td>
      <td data-label="操作">
        <button className="primary-button" onClick={save} disabled={pending}>
          {pending ? '正在保存…' : '保存權限'}
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
      aria-label="員工列表"
    >
      <table className="team-list-table staff-table">
        <thead>
          <tr>
            <th>郵箱</th>
            <th>角色</th>
            <th>在職狀態</th>
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
