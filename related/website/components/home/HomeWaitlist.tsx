"use client";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";

export default function HomeWaitlist() {
  const t = useTranslations("Prelaunch");
  const h = useTranslations("HomeRefresh");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    const form = new FormData(event.currentTarget);
    setStatus("submitting");
    setMessage("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          website: String(form.get("website") ?? ""),
        }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (response.ok && result.ok) {
        setStatus("success");
        setMessage(
          t(
            result.state === "already_registered"
              ? "alreadyRegistered"
              : "success",
          ),
        );
      } else {
        setStatus("error");
        setMessage(
          t(result.error === "invalid_email" ? "invalid" : "unavailable"),
        );
      }
    } catch {
      setStatus("error");
      setMessage(t("unavailable"));
    } finally {
      window.clearTimeout(timeout);
      busy.current = false;
    }
  };
  return (
    <div className="lh-waitlist">
      <form
        method="post"
        action="/api/waitlist"
        onSubmit={submit}
        aria-label={h("joinForm")}
        aria-busy={status === "submitting"}
      >
        <label htmlFor="home-email">{t("emailLabel")}</label>
        <div className="lh-email-row">
          <input
            id="home-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            placeholder={t("placeholder")}
            value={email}
            disabled={status === "submitting"}
            aria-describedby="home-waitlist-message home-waitlist-consent"
            onChange={(event) => {
              setEmail(event.target.value);
              setStatus("idle");
              setMessage("");
            }}
          />
          <button
            className="lh-button"
            type="submit"
            disabled={status === "submitting" || status === "success"}
          >
            {status === "submitting" ? t("submitting") : h("joinButton")}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
        <label className="lh-honeypot" aria-hidden="true">
          {t("websiteLabel")}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <p
          id="home-waitlist-message"
          className={`lh-form-message ${status === "error" ? "is-error" : ""}`}
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {message}
        </p>
        <p id="home-waitlist-consent" className="lh-consent">
          {t.rich("consent", {
            privacy: (chunks) => <Link href="/legal/privacy">{chunks}</Link>,
          })}
        </p>
      </form>
    </div>
  );
}
