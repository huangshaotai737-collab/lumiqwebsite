"use client";
import { useEffect, useState, type FormEvent } from "react";
import { notifyAccountChange } from "./session-event";
import { accountCopy } from "./copy";
const copy = {
  en: {
    email: "Email",
    password: "Password",
    submit: "Sign in",
    pending: "Signing in…",
    ready: "Sign in with your verified email.",
    unavailable: "Sign-in is unavailable. Please try again later.",
    invalid: "Email or password is invalid, or email is not verified.",
    forbidden: "This account is unavailable.",
    limited: "Too many attempts. Please try again later.",
    expired:
      "Your session or verification link has expired. Please sign in again.",
    signedOut: "You have signed out.",
  },
  "zh-hant": {
    email: "電子郵件",
    password: "密碼",
    submit: "登入",
    pending: "正在登入…",
    ready: "請使用已驗證的電子郵件登入。",
    unavailable: "登入服務暫時無法使用，請稍後再試。",
    invalid: "電子郵件或密碼無效，或信箱尚未驗證。",
    forbidden: "此帳號目前無法使用。",
    limited: "嘗試次數過多，請稍後再試。",
    expired: "登入或驗證連結已失效，請重新登入。",
    signedOut: "已登出。",
  },
  ja: {
    email: "メールアドレス",
    password: "パスワード",
    submit: "ログイン",
    pending: "ログイン中…",
    ready: "確認済みのメールアドレスでログインしてください。",
    unavailable: "現在ログインできません。後ほどお試しください。",
    invalid: "メールアドレスやパスワードが無効、またはメールが未確認です。",
    forbidden: "このアカウントは現在利用できません。",
    limited: "試行回数が多すぎます。後ほどお試しください。",
    expired:
      "セッションまたは確認リンクの有効期限が切れました。再度ログインしてください。",
    signedOut: "ログアウトしました。",
  },
};
export function LoginForm({
  locale,
  next,
  configured,
  signedIn,
  error,
  status,
}: {
  locale: keyof typeof copy;
  next: string;
  configured: boolean;
  signedIn: boolean;
  error?: string;
  status?: string;
}) {
  const text = copy[locale];
  const [message, setMessage] = useState(
    !configured
      ? text.unavailable
      : error
        ? accountCopy[locale].expired
        : status === "signed-out"
          ? text.signedOut
          : signedIn
            ? accountCopy[locale].signedIn
            : text.ready,
  );
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  async function signOut() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        cache: "no-store",
      });
      if (response.ok || response.status === 401) {
        notifyAccountChange(true);
        window.location.assign(`/${locale}/login?status=signed-out`);
        return;
      }
    } catch {
      /* Keep the visible error and allow retry. */
    }
    setMessage(text.unavailable);
    setPending(false);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(text.pending);
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          email: fields.get("email"),
          password: fields.get("password"),
          next,
          locale,
        }),
      });
      const result = await response.json();
      if (result.ok) {
        notifyAccountChange();
        window.location.assign(result.data.next);
        return;
      }
      setMessage(
        result.error === "RATE_LIMITED"
          ? text.limited
          : result.error === "FORBIDDEN"
            ? text.forbidden
            : result.error === "UNAUTHENTICATED"
              ? text.invalid
              : text.unavailable,
      );
    } catch {
      setMessage(text.unavailable);
    }
    setPending(false);
  }
  if (signedIn)
    return (
      <section style={{ textAlign: "center" }}>
        <p role="status">{message}</p>
        <button type="button" disabled={pending} onClick={signOut}>
          {locale === "ja"
            ? "ログアウト"
            : locale === "zh-hant"
              ? "登出"
              : "Sign out"}
        </button>
        <p>
          <a href={`/${locale}/members`}>{accountCopy[locale].title}</a>
        </p>
      </section>
    );
  return (
    <form
      method="POST"
      onSubmit={submit}
      style={{ display: "grid", gap: 16, maxWidth: 420, margin: "0 auto" }}
    >
      <p role="status">{message}</p>
      <label htmlFor="account-email">{text.email}</label>
      <input
        id="account-email"
        name="email"
        type="email"
        autoComplete="username"
        required
        maxLength={254}
        style={{ padding: 12, border: "1px solid #bbb", borderRadius: 8 }}
      />
      <label htmlFor="account-password">{text.password}</label>
      <input
        id="account-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={1024}
        style={{ padding: 12, border: "1px solid #bbb", borderRadius: 8 }}
      />
      <button
        type="submit"
        disabled={!configured || pending || !ready}
        style={{ padding: 14, border: "1px solid #aaa", borderRadius: 8 }}
      >
        {pending ? text.pending : text.submit}
      </button>
      <a href={`/${locale}/register`}>{accountCopy[locale].register}</a>
      <a href={`/${locale}/reset-password`}>{accountCopy[locale].reset}</a>
    </form>
  );
}
