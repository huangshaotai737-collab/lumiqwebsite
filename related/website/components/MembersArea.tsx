"use client";
import Heading from "@/components/Heading";


import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, Settings2, Tablet, UserRound, Images, MessageSquare, Sparkles, ShieldCheck, ChevronRight } from "lucide-react";

const storageKey = "lumiq-member-preview-v1";
const devices = [
  { id: "ola", name: "LUMIQ OLA", image: "/assets/web/ola-hero-front.webp" },
  { id: "tablet", name: "LUMIQ Tablet", image: "/assets/web/lumiq-tablet.webp" },
] as const;
type DeviceId = (typeof devices)[number]["id"];
type Section = "devices" | "profile" | "membership" | "portfolio" | "feedback";
type Preview = { version: 1; demo: boolean; name: string; notifications: boolean; deviceNames: Record<DeviceId, string>; quiet: Record<DeviceId, boolean>; feedback: string; feedbackType: string; workTitle: string };
const initial: Preview = { version: 1, demo: false, name: "", notifications: false, deviceNames: { ola: "LUMIQ OLA", tablet: "LUMIQ Tablet" }, quiet: { ola: false, tablet: false }, feedback: "", feedbackType: "suggestion", workTitle: "" };
const sections = [{ id: "devices", icon: Tablet }, { id: "membership", icon: Sparkles }, { id: "portfolio", icon: Images }, { id: "feedback", icon: MessageSquare }, { id: "profile", icon: UserRound }] as const;

export default function MembersArea() {
  const t = useTranslations("Members");
  const [section, setSection] = useState<Section>("devices");
  const [data, setData] = useState<Preview>(initial);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<DeviceId | null>(null);
  const [notice, setNotice] = useState("");
  const [cover, setCover] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved?.version === 1) setData({
        ...initial,
        demo: saved.demo === true,
        name: typeof saved.name === "string" ? saved.name.slice(0, 60) : "",
        notifications: saved.notifications === true,
        deviceNames: { ola: typeof saved.deviceNames?.ola === "string" ? saved.deviceNames.ola.slice(0, 40) : initial.deviceNames.ola, tablet: typeof saved.deviceNames?.tablet === "string" ? saved.deviceNames.tablet.slice(0, 40) : initial.deviceNames.tablet },
        quiet: { ola: saved.quiet?.ola === true, tablet: saved.quiet?.tablet === true },
        feedback: typeof saved.feedback === "string" ? saved.feedback.slice(0, 2000) : "",
        feedbackType: saved.feedbackType === "complaint" ? "complaint" : "suggestion",
        workTitle: typeof saved.workTitle === "string" ? saved.workTitle.slice(0, 80) : "",
      });
    } catch { /* A disabled or invalid store must not prevent browsing. */ }
    setReady(true);
  }, []);
  useEffect(() => () => { if (cover) URL.revokeObjectURL(cover); }, [cover]);

  const save = (next = data, message = t("saved")) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setData(next); setNotice(message); }
    catch { setNotice(t("storageError")); }
  };
  const chooseSection = (next: Section) => { setSection(next); setEditing(null); setNotice(""); };
  const chooseImage = (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) { setNotice(t("fileError")); if (fileInput.current) fileInput.current.value = ""; return; }
    setCover(URL.createObjectURL(file)); setNotice("");
  };

  return <main className="members-page" data-member-preview>
    <div className="members-shell">
      <header className="members-heading">
        <div><p className="members-eyebrow">LUMIQ / {t("nav")}</p><Heading as="h1">{t("title")}</Heading><p>{t("intro")}</p></div>
        <span className="members-preview-badge"><ShieldCheck size={16} aria-hidden />{t("preview")}</span>
      </header>
      <aside className="members-disclosure"><span>{t("previewNotice")}</span></aside>
      <div className="members-layout">
        <nav className="members-sidebar" aria-label={t("nav")}>
          <div className="members-avatar"><span aria-hidden>{data.name ? data.name.slice(0, 1).toUpperCase() : "L"}</span><div><strong>{data.name || t("visitor")}</strong><small>{t("localOnly")}</small></div></div>
          {sections.map(({ id, icon: Icon }) => <button key={id} type="button" aria-pressed={section === id} onClick={() => chooseSection(id)}><Icon size={19} aria-hidden /><span>{t(id)}</span><ChevronRight size={15} aria-hidden /></button>)}
          <Link href="/faq" className="members-help">{t("help")}<ArrowUpRight size={16} aria-hidden /></Link>
        </nav>
        <section className="members-content" aria-labelledby="members-section-title">
          <div className="members-section-head"><Heading as="h2" id="members-section-title">{t(section)}</Heading><span>{t("localOnly")}</span></div>
          {section === "devices" && <>
            {!data.demo ? <div className="members-empty"><Tablet size={40} strokeWidth={1.3} aria-hidden /><Heading as="h3">{t("noDevices")}</Heading><p>{t("noDevicesBody")}</p><button className="members-primary" type="button" disabled={!ready} onClick={() => save({ ...data, demo: true }, t("demoNotice"))}>{t("showDemo")}</button></div> : <>
              <div className="members-device-grid">{devices.map(device => <article className="members-device" key={device.id}>
                <div className="members-device-image"><Image src={device.image} alt={device.name} width={300} height={300} sizes="(max-width: 700px) 60vw, 240px" /></div>
                <div className="members-device-copy"><span className="members-tag">{t("demoDevice")}</span><Heading as="h3">{data.deviceNames[device.id]}</Heading><p>{device.name} · {t("notConnected")}</p><button type="button" className="members-text-action" aria-label={`${t("settings")} ${device.name}`} onClick={() => { setEditing(device.id); setNotice(""); }}><Settings2 size={17} aria-hidden />{t("deviceSettings")}</button></div>
              </article>)}</div>
              {editing && <form className="members-panel" onSubmit={e => { e.preventDefault(); save(); setEditing(null); }}>
                <div className="members-panel-head"><Heading as="h3">{t("deviceSettings")} · {devices.find(d => d.id === editing)?.name}</Heading><button type="button" onClick={() => setEditing(null)}>{t("close")}</button></div>
                <label>{t("deviceName")}<input maxLength={40} required value={data.deviceNames[editing]} onChange={e => setData({ ...data, deviceNames: { ...data.deviceNames, [editing]: e.target.value } })} /></label>
                <label className="members-check"><input type="checkbox" checked={data.quiet[editing]} onChange={e => setData({ ...data, quiet: { ...data.quiet, [editing]: e.target.checked } })} /><span>{t("quiet")}</span></label>
                <p className="members-hint">{t("deviceNotice")}</p><button className="members-primary" type="submit">{t("saveSettings")}</button>
              </form>}
              <p className="members-hint">{t("demoNotice")}</p>
            </>}
            <Link className="members-explore" href="/products"><span>{t("explore")}</span><ArrowUpRight size={19} aria-hidden /></Link>
          </>}
          {section === "profile" && <form className="members-panel" onSubmit={e => { e.preventDefault(); save(); }}>
            <label>{t("displayName")}<input maxLength={60} value={data.name} placeholder={t("displayNamePlaceholder")} autoComplete="off" onChange={e => setData({ ...data, name: e.target.value })} /></label>
            <label className="members-check"><input type="checkbox" checked={data.notifications} onChange={e => setData({ ...data, notifications: e.target.checked })} /><span>{t("notifications")}</span></label>
            <p className="members-hint">{t("profileNotice")}</p><button className="members-primary" type="submit" disabled={!ready}>{t("saveSettings")}</button>
          </form>}
          {section === "membership" && <div className="members-plan"><span className="members-tag">{t("notActivated")}</span><Sparkles size={35} strokeWidth={1.4} aria-hidden /><Heading as="h3">{t("planTitle")}</Heading><p>{t("planBody")}</p><Link href="/plans" className="members-primary">{t("viewPlans")}<ArrowUpRight size={17} aria-hidden /></Link><small>{t("noPayment")}</small></div>}
          {section === "portfolio" && <form className="members-panel" onSubmit={e => { e.preventDefault(); save(data, t("workSaved")); }}>
            <div className="members-upload">{cover ? <Image src={cover} unoptimized alt={t("coverPreview")} width={720} height={480} onError={() => { setCover(""); setNotice(t("fileError")); }} /> : <Images size={35} strokeWidth={1.4} aria-hidden />}<label>{t("chooseCover")}<input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => chooseImage(e.target.files?.[0])} /></label><small>PNG / JPEG / WebP · 10 MB</small></div>
            <label>{t("workTitle")}<input maxLength={80} required value={data.workTitle} onChange={e => setData({ ...data, workTitle: e.target.value })} /></label>
            <p className="members-hint">{t("workNotice")}</p><button className="members-primary" type="submit" disabled={!ready}>{t("saveDraft")}</button>
          </form>}
          {section === "feedback" && <form className="members-panel" onSubmit={e => { e.preventDefault(); save(data, t("draftSaved")); }}>
            <label>{t("feedbackType")}<select value={data.feedbackType} onChange={e => setData({ ...data, feedbackType: e.target.value })}><option value="suggestion">{t("suggestion")}</option><option value="complaint">{t("complaint")}</option></select></label>
            <label>{t("content")}<textarea rows={6} required maxLength={2000} value={data.feedback} onChange={e => setData({ ...data, feedback: e.target.value })} /></label>
            <p className="members-hint">{t("feedbackNotice")}</p><div className="members-form-actions"><button className="members-primary" type="submit" disabled={!ready}>{t("saveDraft")}</button><Link href="/contact">{t("contact")}<ArrowUpRight size={16} aria-hidden /></Link></div>
          </form>}
          <p className="members-status" role="status" aria-live="polite">{notice}</p>
        </section>
      </div>
    </div>
  </main>;
}
