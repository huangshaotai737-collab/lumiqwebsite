"use client";
import Image from "@/components/home/HomeImage";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";

const moments = ["morning", "afternoon", "evening"] as const;

export default function HomeFamily() {
  const t = useTranslations("HomeRefresh");
  const [active, setActive] = useState(0);
  const chapters = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const [travel, setTravel] = useState(0);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const advance = useCallback((step: number) => {
    if (!step || busy.current) return;
    busy.current = true;
    setTravel(step);
    timer.current = setTimeout(() => {
      setActive(index => (index + step + moments.length) % moments.length);
      setTravel(0);
      busy.current = false;
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 750);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const target = stage.current;
    if (!target) return;
    let distance = 0;
    let lastEvent = -Infinity;
    let consumed = false;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastEvent > 220) { distance = 0; consumed = false; }
      lastEvent = now;
      if (consumed || busy.current) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerWidth : 1;
      distance += event.deltaX * unit;
      if (Math.abs(distance) < 50) return;
      consumed = true;
      advance(distance > 0 ? 1 : -1);
    };
    target.addEventListener('wheel', onWheel, { passive: false });
    return () => target.removeEventListener('wheel', onWheel);
  }, [advance]);

  const select = (index: number) => {
    const step = (index - active + moments.length) % moments.length;
    advance(step === 2 ? -1 : step);
  };

  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    switch (event.key) {
      case "ArrowRight": next = (index + 1) % moments.length; break;
      case "ArrowLeft": next = (index + moments.length - 1) % moments.length; break;
      case "Home": next = 0; break;
      case "End": next = moments.length - 1; break;
      default: return;
    }
    event.preventDefault();
    select(next);
    tabs.current[next]?.focus();
  };

  return (
    <div ref={chapters} className="lh-family-chapters" data-active-family={active} data-travel={travel}>
      <div className="lh-chapter-navigation" role="tablist" aria-label={t("familyPanoramaAlt")}>
        {moments.map((key, index) => (
          <button
            key={key}
            ref={(element) => { tabs.current[index] = element; }}
            type="button"
            role="tab"
            id={`family-tab-${key}`}
            aria-controls={`family-panel-${key}`}
            aria-selected={index === active}
            tabIndex={index === active ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(event) => navigate(event, index)}
          >
            <span className="lh-chapter-progress" aria-hidden="true" />
            <span>{t(`familyMoments.${key}`)}</span>
          </button>
        ))}
      </div>
      <div ref={stage} className="lh-family-stage" onPointerDown={event => {
        if (event.pointerType === 'touch' || event.button !== 0) return;
        if ((event.target as HTMLElement).closest('.lh-family-preview-button')) return;
        pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerUp={event => {
        const start = pointerStart.current;
        if (!start || start.id !== event.pointerId) return;
        pointerStart.current = null;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) advance(dx < 0 ? 1 : -1);
      }} onPointerCancel={() => { pointerStart.current = null; }} onDragStart={event => event.preventDefault()} onTouchStart={event => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={event => {
        if (!touchStart.current) return;
        const dx = event.changedTouches[0].clientX - touchStart.current.x;
        const dy = event.changedTouches[0].clientY - touchStart.current.y;
        touchStart.current = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) advance(dx < 0 ? 1 : -1);
      }}>
        {[-2, -1, 0, 1, 2].map(offset => {
          const index = (active + offset + moments.length) % moments.length;
          const key = moments[index];
          const position = offset - travel;
          return (
          <div
            key={offset}
            id={Math.abs(offset) <= 1 ? `family-panel-${key}` : undefined}
            role="tabpanel"
            aria-labelledby={`family-tab-${key}`}
            aria-hidden={Math.abs(offset) > 1}
            inert={Math.abs(offset) > 1}
            tabIndex={offset === 0 ? 0 : -1}
            className="lh-family-scene"
            data-active={position === 0}
            data-preview={Math.abs(offset) === 1}
            style={{ '--family-offset': position, '--family-scale': position === 0 ? 1 : .78, opacity: position === 0 ? 1 : Math.abs(position) === 1 ? .42 : 0 } as CSSProperties}
          >
            {Math.abs(offset) === 1 ? <button type="button" className="lh-family-preview-button" aria-label={t(`familyMoments.${key}`)} onClick={() => advance(offset)}>
              <Image
                src={`/assets/western-scenes-20260908/${key}.webp`}
                alt=""
                fill
                quality={90}
                sizes="100vw"
                draggable={false}
              />
            </button> : <Image
              src={`/assets/western-scenes-20260908/${key}.webp`}
              alt={t(`familyMoments.${key}`)}
              fill
              quality={90}
              sizes="100vw"
              draggable={false}
            />}
          </div>
        );})}
      </div>
    </div>
  );
}
