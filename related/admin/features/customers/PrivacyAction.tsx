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
        setMessage("操作未完成，請檢查權限、保留規則或任務是否正在執行。");
      } else {
        setMessage(
          result.data.status === "completed"
            ? "應用資料已匿名化；服務商日誌、備份和獨立報名記錄不在清理範圍。"
            : "任務失敗，客戶訪問仍已暫停。請在任務列表查看步驟並恢復。",
        );
        setConfirmed(false);
        router.refresh();
      }
      try {
        await read(workspace.jobs.page);
      } catch {
        setMessage((m) => m + " 任務列表讀取失敗，請刷新頁面。");
      }
    } catch {
      setMessage("連接失敗，任務可能已創建。請刷新任務列表確認後恢復。");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel" aria-label="客戶匿名化">
      <h2>客戶匿名化</h2>
      <p>
        僅限管理員。先暫停客戶訪問，再清理認證聯繫資料、會員資料、訂單收件快照及內部備註。訂單金額明細與必要審計保留。
      </p>
      {!workspace.enabled && (
        <p role="status">保留規則尚未由品牌確認，匿名化與恢復操作已關閉。</p>
      )}
      <form method="POST"
        className="content-field"
        onSubmit={(e) => {
          e.preventDefault();
          void write({ userId, reason });
        }}
      >
        <label>
          客戶 UUID
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
            <option value="customer_request">客戶申請</option>
            <option value="retention_expired">已確認保留期限屆滿</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          我已覈對客戶及保留範圍，瞭解此清理不可撤銷。
        </label>
        <button className="primary-button" disabled={!workspace.enabled || pending || !confirmed}>
          匿名化客戶資料
        </button>
      </form>
      <p role="status">{message}</p>
      <h3>匿名化任務</h3>
      <form method="POST" className="content-field"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await read();
            setMessage("");
          } catch {
            setMessage("任務讀取失敗，請重試。");
          }
        }}
      >
        <label>
          按任務或客戶 UUID 搜索
          <input
            value={search}
            maxLength={36}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="primary-button" disabled={pending}>查詢 / 刷新</button>
      </form>
      <div className="table-scroll team-list-scroll" tabIndex={0}>
        <table className="team-list-table privacy-table">
          <thead>
            <tr>
              <th>任務 / 客戶</th>
              <th>狀態</th>
              <th>認證步驟</th>
              <th>失敗步驟</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {workspace.jobs.items.map((j) => (
              <tr key={j.id}>
                <td data-label="任務 / 客戶"><details><summary>任務 {j.id.slice(0,8)}… · 客戶 {j.userId.slice(0,8)}…</summary><p>任務：{j.id}</p><p>客戶：{j.userId}</p></details></td>
                <td data-label="狀態">
                  {
                    { pending: "待處理", failed: "失敗", completed: "已完成" }[
                      j.status
                    ]
                  }
                </td>
                <td data-label="認證步驟">
                  禁用：{j.authBanned ? "已驗證" : "未完成"}
                  <br />
                  聯繫資料：{j.authCleared ? "已驗證" : "未完成"}
                </td>
                <td data-label="失敗步驟">{j.failureStep ? ({auth_ban:"暫停客戶登錄失敗，請檢查認證服務。",auth_contact:"認證聯繫資料未清理完成，請檢查服務商或人工處理範圍。",application:"應用資料清理失敗，請恢復任務重試。"} as Record<string,string>)[j.failureStep] || "步驟未完成，請由管理員覈查。" : "—"}</td>
                <td data-label="操作">
                  {j.status !== "completed" && (
                    <button className="secondary-button"
                      disabled={!workspace.enabled || pending}
                      onClick={() => void write({ jobId: j.id })}
                    >
                      恢復任務
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!workspace.jobs.items.length && <p>暫無符合條件的任務。</p>}
      <p>
        第 {workspace.jobs.page} 頁，共 {workspace.jobs.total} 條
      </p>
      <nav className="pagination-controls" aria-label="匿名化任務分頁">
        <button className="secondary-button"
          disabled={pending || workspace.jobs.page === 1}
          onClick={() =>
            read(workspace.jobs.page - 1).catch(() =>
              setMessage("任務讀取失敗。"),
            )
          }
        >
          上一頁
        </button>
        <button className="secondary-button"
          disabled={
            pending ||
            workspace.jobs.page * workspace.jobs.pageSize >= workspace.jobs.total
          }
          onClick={() =>
            read(workspace.jobs.page + 1).catch(() =>
              setMessage("任務讀取失敗。"),
            )
          }
        >
          下一頁
        </button>
      </nav>
      <p>
        執行中斷的任務在5分鐘租約到期後可恢復。失敗期間保持暫停訪問；策略版本變化需人工複覈，不自動切換清理範圍。
      </p>
    </section>
  );
}
