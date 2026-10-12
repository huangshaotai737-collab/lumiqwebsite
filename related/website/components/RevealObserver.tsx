"use client";

import { useEffect } from "react";

/** Attaches a scroll-reveal IntersectionObserver to every `.reveal` element on the page. */
export default function RevealObserver() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.removeAttribute("data-reveal-pending");
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -32px 0px" },
    );
    elements.forEach((el) => {
      // First-screen text is readable immediately, including without JavaScript.
      if (el.getBoundingClientRect().top >= window.innerHeight) {
        el.dataset.revealPending = "true";
        obs.observe(el);
      }
    });
    return () => {
      obs.disconnect();
      elements.forEach((el) => el.removeAttribute("data-reveal-pending"));
    };
  }, []);
  return null;
}
