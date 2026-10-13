"use client";

import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {ArrowLeft, ArrowRight, Pause, Play} from 'lucide-react';
import Image from './HomeImage';

export default function MobileFilmCarousel({films, active, onChange}: {
  films: readonly string[];
  active: number;
  onChange: (index: number) => void;
}) {
  const t = useTranslations('HomeFilms');
  const track = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [requested, setRequested] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const moveTo = (index: number) => {
    const rail = track.current;
    if (!rail) return;
    const next = (index + films.length) % films.length;
    const item = rail.children[next] as HTMLElement;
    rail.scrollTo({left: item.offsetLeft - parseFloat(getComputedStyle(rail).paddingLeft), behavior: 'instant'});
    onChange(next);
  };

  useEffect(() => {
    const rail = track.current;
    if (!rail) return;
    const origin = rail.scrollLeft + parseFloat(getComputedStyle(rail).paddingLeft);
    const item = rail.children[active] as HTMLElement;
    // A native swipe already points at its newly selected card. Only recenter
    // when a selection arrives from the desktop animation during a resize.
    if (Math.abs(item.offsetLeft - origin) > item.clientWidth / 2) {
      rail.scrollTo({left: item.offsetLeft - parseFloat(getComputedStyle(rail).paddingLeft), behavior: 'instant'});
    }
  }, [active]);

  useEffect(() => {
    const rail = track.current;
    if (!rail) return;
    let frame = 0;
    let width = 0;
    const align = () => {
      const currentWidth = rail.clientWidth;
      if (currentWidth === width) return;
      width = currentWidth;
      cancelAnimationFrame(frame);
      const item = rail.children[activeRef.current] as HTMLElement;
      rail.scrollTo({left: item.offsetLeft - parseFloat(getComputedStyle(rail).paddingLeft), behavior: 'instant'});
    };
    const scroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const origin = rail.scrollLeft + parseFloat(getComputedStyle(rail).paddingLeft);
        let nearest = 0, distance = Infinity;
        [...rail.children].forEach((item, index) => {
          const delta = Math.abs((item as HTMLElement).offsetLeft - origin);
          if (delta < distance) {nearest = index; distance = delta;}
        });
        if (nearest !== activeRef.current) onChange(nearest);
      });
    };
    align();
    const resize = new ResizeObserver(align);
    resize.observe(rail);
    rail.addEventListener('scroll', scroll, {passive: true});
    return () => {cancelAnimationFrame(frame); resize.disconnect(); rail.removeEventListener('scroll', scroll);};
  }, [onChange]);

  useEffect(() => {
    const rail = track.current;
    if (!rail) return;
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {setRequested(true); preload.disconnect();}
    }, {rootMargin: '200px 0px'});
    const pause = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) video.current?.pause();
    });
    const hidden = () => {if (document.hidden) video.current?.pause();};
    preload.observe(rail);
    pause.observe(rail);
    document.addEventListener('visibilitychange', hidden);
    return () => {preload.disconnect(); pause.disconnect(); document.removeEventListener('visibilitychange', hidden);};
  }, []);

  useEffect(() => {
    const clip = video.current;
    setPlaying(false);
    setFailed(false);
    if (requested) clip?.load();
    return () => {clip?.pause();};
  }, [active, requested]);

  const toggle = async () => {
    const clip = video.current;
    if (!clip) return;
    if (!clip.paused) clip.pause();
    else {
      try {await clip.play(); setFailed(false);} catch {setPlaying(false); setFailed(true);}
    }
  };

  return <div className="lh-mobile-films">
    <div ref={track} className="lh-mobile-films-track" aria-label={t('carousel')}>
      {films.map((film, index) => <article key={film} className="lh-mobile-film-card" aria-label={`${index + 1} / ${films.length}: ${t(`${film}.title`)}`}>
        <div className="lh-mobile-film-media">
          {index === active ? <>
            <video key={film} ref={video} playsInline preload={requested ? 'metadata' : 'none'} poster={`/assets/films-20260908/${film}.jpg`}
              aria-label={t(`${film}.title`)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setFailed(true)}>
              <source src={requested ? `/assets/films-20260908/${film}.mp4` : undefined} type="video/mp4" onError={() => setFailed(true)} />
            </video>
            <button className="lh-mobile-film-toggle" data-playing={playing} type="button" onClick={toggle} aria-label={t(playing ? 'pause' : 'play')}>
              {playing ? <Pause size={24} /> : <Play size={26} fill="currentColor" />}
            </button>
            {failed && <a className="lh-film-open" href={`/assets/films-20260908/${film}.mp4`} target="_blank" rel="noopener noreferrer">{t('open')} ↗</a>}
          </> : <button className="lh-mobile-film-poster" type="button" onClick={() => moveTo(index)} aria-label={`${t('next')}: ${t(`${film}.title`)}`}>
            <Image src={`/assets/films-20260908/${film}.jpg`} alt="" width={1280} height={720} unoptimized />
          </button>}
        </div>
        <div className="lh-mobile-film-copy"><h3>{t(`${film}.title`)}</h3><p>{t(`${film}.body`)}</p></div>
      </article>)}
    </div>
    <nav className="lh-mobile-films-controls" aria-label={t('carousel')}>
      <button type="button" onClick={() => moveTo(active - 1)} aria-label={t('previous')}><ArrowLeft size={24} /></button>
      <span aria-live="polite" aria-atomic="true"><strong>{String(active + 1).padStart(2, '0')}</strong> / 03</span>
      <button type="button" onClick={() => moveTo(active + 1)} aria-label={t('next')}><ArrowRight size={24} /></button>
    </nav>
  </div>;
}
