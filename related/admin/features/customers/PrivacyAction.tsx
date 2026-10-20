"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PrivacyWorkspace } from "./privacy";
export function PrivacyAction({ initial }: { initial: PrivacyWorkspace }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState(initial);
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("customer_request");
  const [confirmed, setConfirmed] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function read(page = 1) {
    const response = await fetch(
      "/api/customers/anonymize?" +
        new URLSearchParams({ search, page: String(page) }),
      { cache: "no-store" },
    );
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error();
    setWorkspace(result.data);
  }
  async function write(body: object) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/customers/anonymize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setMessage("操作未完成，请检查权限、保留规则或任务是否正在执行。");
      } else {
        setMessage(
          result.data.status === "completed"
            ? "应用资料已匿名化；服务商日志、备份和独立报名记录不在清理范围。"
            : "任务失败，客户访问仍已暂停。请在任务列表查看步骤并恢复。",
        );
        setConfirmed(false);
        router.refresh();
      }
      try {
        await read(workspace.jobs.page);
      } catch {
        setMessage((m) => m + " 任务列表读取失败，请刷新页面。");
      }
    } catch {
      setMessage("连接失败，任务可能已创建。请刷新任务列表确认后恢复。");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel" aria-label="客户匿名化">
      <h2>客户匿名化</h2>
      <p>
        仅限管理员。先暂停客户访问，再清理认证联系资料、会员资料、订单收件快照及内部备注。订单金额明细与必要审计保留。
      </p>
      {!workspace.enabled && (
        <p role="status">保留规则尚未由品牌确认，匿名化与恢复操作已关闭。</p>
      )}
      <form
        className="content-field"
        onSubmit={(e) => {
          e.preventDefault();
          void write({ userId, reason });
        }}
      >
        <label>
          客户 UUID
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            pattern="[0-9a-fA-F-]{36}"
          />
        </label>
        <label>
          原因
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="customer_request">客户申请</option>
            <option value="retention_expired">已确认保留期限届满</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          我已核对客户及保留范围，了解此清理不可撤销。
        </label>
        <button disabled={!workspace.enabled || pending || !confirmed}>
          匿名化客户资料
        </button>
      </form>
      <p role="status">{message}</p>
      <h3>匿名化任务</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await read();
            setMessage("");
          } catch {
            setMessage("任务读取失败，请重试。");
          }
        }}
      >
        <label>
          按任务或客户 UUID 搜索
          <input
            value={search}
            maxLength={36}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button disabled={pending}>查询 / 刷新</button>
      </form>
      <div className="table-scroll" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>任务 / 客户</th>
              <th>状态</th>
              <th>认证步骤</th>
              <th>失败步骤</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {workspace.jobs.items.map((j) => (
              <tr key={j.id}>
                <td>
                  {j.id}
                  <br />
                  {j.userId}
                </td>
                <td>
                  {
                    { pending: "待处理", failed: "失败", completed: "已完成" }[
                      j.status
                    ]
                  }
                </td>
                <td>
                  禁用：{j.authBanned ? "已验证" : "未完成"}
                  <br />
                  联系资料：{j.authCleared ? "已验证" : "未完成"}
                </td>
                <td>{j.failureStep || "—"}</td>
                <td>
                  {j.status !== "completed" && (
                    <button
                      disabled={!workspace.enabled || pending}
                      onClick={() => void write({ jobId: j.id })}
                    >
                      恢复任务
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!workspace.jobs.items.length && <p>暂无符合条件的任务。</p>}
      <p>
        第 {workspace.jobs.page} 页，共 {workspace.jobs.total} 条
      </p>
      <button
        disabled={pending || workspace.jobs.page === 1}
        onClick={() =>
          read(workspace.jobs.page - 1).catch(() =>
            setMessage("任务读取失败。"),
          )
        }
      >
        上一页
      </button>
      <button
        disabled={
          pending ||
          workspace.jobs.page * workspace.jobs.pageSize >= workspace.jobs.total
        }
        onClick={() =>
          read(workspace.jobs.page + 1).catch(() =>
            setMessage("任务读取失败。"),
          )
        }
      >
        下一页
      </button>
      <p>
        执行中断的任务在5分钟租约到期后可恢复。失败期间保持暂停访问；策略版本变化需人工复核，不自动切换清理范围。
      </p>
    </section>
  );
}
