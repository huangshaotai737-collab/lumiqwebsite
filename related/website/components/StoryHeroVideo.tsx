"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type StoryHeroVideoProps = {
  eyebrow: string;
  label: string;
  playLabel: string;
  poster: string;
  quote: string;
  src: string;
};

export default function StoryHeroVideo({
  eyebrow,
  label,
  playLabel,
  poster,
  quote,
  src,
}: StoryHeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (window.location.hash !== "#brand-film") return;

    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.controls = true;
    setHasStarted(true);
    void video.play().catch(() => {
      video.controls = false;
      setHasStarted(false);
    });
  }, []);

  const playVideo = async () => {
    const video = videoRef.current;
    if (!video) return;

    video.controls = true;
    setHasStarted(true);

    try {
      await video.play();
    } catch {
      video.controls = false;
      setHasStarted(false);
    }
  };

  const resetVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    video.controls = false;
    video.currentTime = 0;
    video.load();
    setHasStarted(false);
  };

  return (
    <figure
      id="brand-film"
      className="story-hero-media reveal"
      data-playing={hasStarted ? "" : undefined}
    >
      <video
        ref={videoRef}
        aria-label={label}
        controls={hasStarted}
        playsInline
        poster={poster}
        preload="metadata"
        onEnded={resetVideo}
        onPlay={() => setHasStarted(true)}
      >
        <source src={src} type="video/mp4" />
      </video>

      {!hasStarted && (
        <>
          <button
            type="button"
            className="story-video-play"
            aria-label={playLabel}
            onClick={playVideo}
          >
            <Play size={24} strokeWidth={1.8} fill="currentColor" aria-hidden />
          </button>
          <figcaption>
            <span>{eyebrow}</span>
            <strong>{quote}</strong>
          </figcaption>
        </>
      )}
    </figure>
  );
}
