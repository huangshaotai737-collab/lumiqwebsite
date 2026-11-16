"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import Heading from "@/components/Heading";

import {Link} from "@/i18n/navigation";
import {useTranslations} from "next-intl";
import { useRef, useState } from "react";

type SubmissionStatus = "idle" | "submitting" | "success" | "error";

export default function PrelaunchPage() {
  const cms = useContentAdapter();
  const t = useTranslations("Prelaunch");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [message, setMessage] = useState("");
  const busy = useRef(false);

  const submitWaitlist = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;

    const formData = new FormData(event.currentTarget);
    const website = String(formData.get("website") ?? "");

    setStatus("submitting");
    setMessage("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
        signal: controller.signal,
      });
      const result = (await response.json()) as {
        ok?: boolean;
        state?: "created" | "already_registered";
        error?: "invalid_email" | "temporarily_unavailable";
      };

      if (response.ok && result.ok) {
        setStatus("success");
        setMessage(result.state === "already_registered" ? t("alreadyRegistered") : t("success"));
        return;
      }

      setStatus("error");
      setMessage(result.error === "invalid_email" ? t("invalid") : t("unavailable"));
    } catch {
      setStatus("error");
      setMessage(t("unavailable"));
    } finally {
      window.clearTimeout(timeout);
      busy.current = false;
    }
  };

  return (
    <main className="lumiq-root editorial-page prelaunch-page" style={{ paddingTop: "8rem", minHeight: "100vh" }}>
      <div className="bg-layer" aria-hidden>
        <div className="stars" />
        <div className="bokeh b1" />
        <div className="bokeh b2" />
      </div>
      <section className="container" style={{ padding: "4rem 2rem", maxWidth: 760, textAlign: "center" }}>
        <span className="kicker" style={{ justifyContent: "center" }}>{t("eyebrow")}</span>
        <Heading as="h1" className="lq-h1 serif" style={{ margin: "1rem 0 1.25rem", color: "var(--ink)" }}>
          {t("title")}
        </Heading>
        <p className="lq-body" style={{ color: "var(--ink-3)", maxWidth: 520, margin: "0 auto 2.5rem" }}>
          {t("intro")}
        </p>
        <form
          className="prelaunch-form"
          onSubmit={submitWaitlist}
          style={{
            display: "flex",
            position: "relative",
            gap: ".5rem",
            maxWidth: 460,
            margin: "0 auto",
            background: "white",
            padding: ".5rem",
            borderRadius: 999,
            boxShadow: "var(--shadow)",
            border: "1px solid var(--border)",
          }}
        >
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status !== "idle") {
                setStatus("idle");
                setMessage("");
              }
            }}
            placeholder={t("placeholder")}
            autoComplete="email"
            maxLength={254}
            required
            aria-label={t("emailLabel")}
            style={{ flex: 1, minWidth: 0, padding: "0 1.25rem", background: "transparent", color: "var(--ink)" }}
          />
          <label
            aria-hidden="true"
            style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
          >
            {t("websiteLabel")}
            <input name="website" type="text" tabIndex={-1} autoComplete="off" />
          </label>
          <button
            type="submit"
            className="btn btn-navy"
            disabled={status === "submitting" || status === "success"}
            style={{ padding: ".75rem 1.5rem", whiteSpace: "nowrap" }}
          >
            {status === "submitting" ? t("submitting") : t("submit")}
          </button>
        </form>
        <p
          aria-live="polite"
          role={status === "error" ? "alert" : "status"}
          style={{
            minHeight: "1.5rem",
            margin: ".9rem auto 0",
            color: status === "error" ? "#9d2f2f" : "var(--ink-2)",
            fontSize: ".9rem",
          }}
        >
          {message}
        </p>
        {status === "error" && (
          <p style={{ margin: ".75rem auto", fontSize: ".9rem" }}>
            <a href={"mailto:" + cms.value("messages.{locale}.CmsStatic.field_23cd241d015790f4")} style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 4 }}>{t("contactInstead")}</a>
          </p>
        )}
        <p style={{ maxWidth: 520, margin: ".6rem auto 0", color: "var(--ink-3)", fontSize: ".78rem", lineHeight: 1.6 }}>
          {t.rich("consent", {
            privacy: (chunks) => <Link href="/legal/privacy" style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>{chunks}</Link>,
          })}
        </p>
        <div style={{ marginTop: "3rem" }}>
          <Link href="/products" style={{ color: "var(--ink-2)", fontWeight: 500, borderBottom: "1px solid var(--ink-4)", paddingBottom: 2 }}>{t("back")}</Link>
        </div>
      </section>
      <style>{`
        .prelaunch-form:focus-within { border-color: #52677d !important; }
        @media (max-width: 540px) {
          .prelaunch-form { flex-direction: column; border-radius: 24px !important; }
          .prelaunch-form input[type="email"] { min-height: 48px; }
          .prelaunch-form button { width: 100%; }
        }
      `}</style>
    </main>
  );
}
