"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {homeWideQuery} from "./responsiveLayout";
import {usePhoneLayout} from "./usePhoneLayout";
import MobileFilmCarousel from "./MobileFilmCarousel";
import Heading from "@/components/Heading";


import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "./HomeImage";
import { mountHorizontalCarousel } from "./readingNavigation";
import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown, Play, Pause } from "lucide-react";

const films = ["everyday-companion", "worlds-together", "welcome-home"] as const;

export default function HomeFilms() {
  const cms = useContentAdapter();
  const t = useTranslations("HomeFilms");
  const isPhone = usePhoneLayout();
  const [active, setActive] = useState(0);
  const [mediaRequested, setMediaRequested] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const character = useRef<HTMLVideoElement>(null);
  const characterHost = useRef<HTMLDivElement>(null);
  const [characterFormat, setCharacterFormat] = useState<"webm" | "hevc" | null>(null);
  const [characterFailed, setCharacterFailed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [travel, setTravel] = useState(0);
  const switching = useRef(false);
  const pendingStep = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const select = useCallback((step: number) => {
    if (switching.current) return;
    switching.current = true;
    pendingStep.current = step;
    video.current?.pause();
    setPlaying(false);
    setPlaybackError(false);
    setTravel(step);
    timer.current = setTimeout(() => {
      setActive(index => (index + step + films.length) % films.length);
      setTravel(0);
      switching.current = false;
      pendingStep.current = 0;
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 800);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!switching.current) return;
    clearTimeout(timer.current);
    const step = pendingStep.current;
    setActive(index => (index + step + films.length) % films.length);
    setTravel(0);
    switching.current = false;
    pendingStep.current = 0;
  }, [isPhone]);
  useEffect(() => {
    const target = stage.current?.closest("[data-home-section]");
    if (!target) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setMediaRequested(true); observer.disconnect(); }
    }, { rootMargin: "600px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [isPhone]);
  useEffect(() => {
    const target = stage.current;
    if (!target) return;
    return mountHorizontalCarousel(target, select, () => switching.current);
  }, [select, isPhone]);
  useEffect(() => {
    // VP9 support is not proof of VP9 alpha support. WebKit gets the same cleaned
    // animation encoded with HEVC alpha; Chromium/Firefox retain transparent VP9.
    const ua = navigator.userAgent;
    setCharacterFormat(/iPad|iPhone|iPod/.test(ua) || (/Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua)) ? "hevc" : "webm");
  }, []);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (mediaRequested) element.load();
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) element.pause();
    });
    const onHidden = () => { if (document.hidden) element.pause(); };
    const source = element.querySelector("source");
    const onFailure = () => { if (mediaRequested) setPlaybackError(true); };
    // Source errors can happen before hydration and leave play() pending forever.
    // Safari/Chrome report NETWORK_NO_SOURCE without populating video.error.
    if (element.error || element.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) onFailure();
    element.addEventListener("error", onFailure);
    source?.addEventListener("error", onFailure);
    observer.observe(element);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      element.pause(); observer.disconnect(); document.removeEventListener("visibilitychange", onHidden);
      element.removeEventListener("error", onFailure); source?.removeEventListener("error", onFailure);
    };
  }, [active, mediaRequested, isPhone, cms]);
  useEffect(() => {
    const clip = character.current;
    const host = characterHost.current;
    const target = stage.current;
    if (!host || !target) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const wide = matchMedia(homeWideQuery);
    let visible = false;
    let disposed = false;
    if (clip) { clip.muted = true; clip.defaultMuted = true; }
    const sync = () => {
      const showing = visible && !document.hidden && !reduced.matches && wide.matches;
      host.dataset.visible = String(showing);
      if (!clip) return;
      if (!showing) clip.pause();
      else if (!clip.ended) void clip.play().catch(() => {
        if (!disposed && showing && clip.error) setCharacterFailed(true);
      });
    };
    const placeCharacter = () => {
      if (!wide.matches) {
        sync();
        return;
      }
      host.style.removeProperty('top');
      host.style.removeProperty('bottom');
      // V2's opening frames start at source x=0. Keep the entrance viewport-edge
      // anchored in CSS; card-relative positioning leaves a gap on ultra-wide screens.
      const heading = host.parentElement!.querySelector<HTMLElement>('.lh-films-heading');
      const headingBottom = heading ? heading.offsetTop + heading.offsetHeight : 0;
      // Reserve title clearance on wide, short viewports without moving the film cards.
      const availableHeight = Math.max(0, host.parentElement!.clientHeight * .94 - headingBottom - 24);
      const width = Math.min(innerWidth * .34, 760, availableHeight) * 16 / 9;
      host.style.width = `${width}px`;
      sync();
    };
    const resize = new ResizeObserver(placeCharacter);
    resize.observe(target);
    resize.observe(host.parentElement!);
    window.addEventListener("resize", placeCharacter);
    placeCharacter();
    const observer = new IntersectionObserver(([entry]) => {
      // Pause below the reading threshold, but rewind only on full departure.
      // A small back-scroll must not repeatedly restart her entrance.
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
      if (!entry.isIntersecting && clip) { clip.pause(); if (clip.currentTime) clip.currentTime = 0; }
      sync();
    }, { threshold: [0, 0.2] });
    observer.observe(target);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    clip?.addEventListener("loadeddata", sync);
    return () => {
      disposed = true;
      clip?.pause(); observer.disconnect(); resize.disconnect();
      window.removeEventListener("resize", placeCharacter);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      clip?.removeEventListener("loadeddata", sync);
    };
  }, [characterFormat, characterFailed, isPhone]);
  const toggle = async () => {
    if (!video.current) return;
    setMediaRequested(true);
    if (video.current.error || video.current.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      setPlaybackError(true); return;
    }
    if (!video.current.paused) video.current.pause();
    else { try { await video.current.play(); setPlaybackError(false); } catch { setPlaying(false); setPlaybackError(true); } }
  };
  return (
    <div className="lh-films" role="region" aria-roledescription={t("carousel")} aria-labelledby="films-title">
      <header className="lh-films-heading">
        <div><p className="lh-eyebrow">{t("eyebrow")}</p><Heading as="h2" id="films-title">{t("heading")}</Heading></div>
      </header>
      {isPhone ? <MobileFilmCarousel films={films} active={active} onChange={setActive} /> : <>
      <div className="lh-films-layout">
      <div ref={stage} className="lh-films-stage" data-moving={travel !== 0} onTouchStart={e => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={e => {
          if (touchStart.current !== null) {
            const dx = e.changedTouches[0].clientX - touchStart.current.x;
            const dy = e.changedTouches[0].clientY - touchStart.current.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) select(dx < 0 ? 1 : -1);
          }
          touchStart.current = null;
        }}>
        {[-2, -1, 0, 1, 2].map(offset => {
          const index = (active + offset + films.length) % films.length;
          const slot = offset - travel;
          return <div key={`${active}-${offset}`} className="lh-film-slot" data-center={slot === 0} data-main={offset === 0} style={{ "--slot": slot, "--card-scale": slot === 0 ? 1 : 70 / 91, "--card-height": slot === 0 ? 1 : .8, "--card-opacity": slot === 0 || offset === 0 ? 1 : .45 } as CSSProperties} aria-hidden={Math.abs(slot) > 1}>
          {offset !== 0 ? <button className={`lh-film-preview lh-film-preview-${offset < 0 ? "top" : "bottom"}`}
            tabIndex={Math.abs(slot) > 1 || travel !== 0 ? -1 : 0} disabled={travel !== 0}
            type="button" onClick={() => select(Math.sign(offset))} aria-label={`${t(offset < 0 ? "previous" : "next")}: ${t(`${films[index]}.title`)}`}>
            <Image src={cms.url(`/assets/films-20260908/${films[index]}.jpg`)} alt="" width={1280} height={720} unoptimized />
          </button> : <article className={`lh-film-card${films[active] === "welcome-home" ? " lh-film-card-portrait" : ""}`} aria-label={`${active + 1} / ${films.length}`} data-playing={playing}>
          <video key={films[active]} ref={video} playsInline preload={mediaRequested ? "metadata" : "none"} poster={mediaRequested ? cms.url(`/assets/films-20260908/${films[active]}.jpg`) : undefined}
            aria-label={t(`${films[active]}.title`)} onError={() => setPlaybackError(true)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}>
            <source src={mediaRequested ? cms.url(`/assets/films-20260908/${films[active]}.mp4`) : undefined} type="video/mp4" onError={() => setPlaybackError(true)} />
            <a href={cms.url(`/assets/films-20260908/${films[active]}.mp4`)}>{t("open")}</a>
          </video>
          <button className="lh-film-toggle" type="button" onClick={toggle} aria-label={t(playing ? "pause" : "play")}>
            {playing ? <Pause size={26} /> : <Play size={30} fill="currentColor" />}
          </button>
          {playbackError && <a className="lh-film-open" href={cms.url(`/assets/films-20260908/${films[active]}.mp4`)} target="_blank" rel="noopener noreferrer">{t("open")} {cms.text("field_a75a773c2f6e5622")}</a>}
        </article>}
        </div>;
        })}
      </div>
      <nav className="lh-films-controls" aria-label={t("carousel")}>
        <button type="button" onClick={() => select(-1)} disabled={travel !== 0} aria-label={t("previous")}><ArrowUp size={24} /></button>
        <span aria-live="polite" aria-atomic="true"><strong>{String(active + 1).padStart(2, "0")}</strong><span>{cms.text("field_8012c8a7ba06bfe5")}</span><span>{cms.text("field_28cae631213153ae")}</span></span>
        <button type="button" onClick={() => select(1)} disabled={travel !== 0} aria-label={t("next")}><ArrowDown size={24} /></button>
      </nav>
      </div>
      <div ref={characterHost} className="lh-film-character" data-alpha-video={Boolean(characterFormat && !characterFailed)} aria-hidden="true">
      {characterFormat && !characterFailed ? <video key={characterFormat} ref={character} muted playsInline preload="none" poster={mediaRequested ? cms.url("/assets/character-20261012/poster-clean.png") : undefined} onError={() => setCharacterFailed(true)}>
        <source src={cms.url(`/assets/character-20261012/ola-girl-clean-alpha${characterFormat === "hevc" ? "-safari.mov" : ".webm"}`)} type={characterFormat === "hevc" ? 'video/quicktime; codecs="hvc1"' : "video/webm"} />
      </video> : <Image src={cms.url("/assets/character-20261012/settled-clean.png")} alt="" fill unoptimized sizes="100vw" />}
      </div>
      </>}
    </div>
  );
}
