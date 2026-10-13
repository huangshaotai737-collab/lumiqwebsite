"use client";
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/** Whole-block entry: never split text, change kerning or alter CJK line breaks. */
export default function ScrollWords() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const phone = matchMedia("(max-width: 767px)");
    // A preference or layout change must remove staged text and reconnect the
    // observer. Otherwise disabling motion once leaves later sections static.
    let dispose = () => {};
    const start = () => {
      dispose();
      dispose = () => {};
      if (reduced.matches) return;
      const seen = new WeakSet<Element>();
      const animations = new Set<Animation>();
      const pending = new Set<HTMLElement>();
      const canReveal = (element: HTMLElement) => {
        const main = element.closest<HTMLElement>("main");
        return main && (!main.dataset.homeState || main.dataset.homeState === "open") &&
          !document.querySelector('.lh-loader:not([data-state="hidden"])');
      };
      const reveal = (element: HTMLElement) => {
        if (!canReveal(element)) return;
        observer.unobserve(element);
        pending.delete(element);
        element.removeAttribute("data-scroll-reveal");
        const animation = element.animate([
          { opacity: 0, transform: `translateY(${phone.matches ? 12 : 24}px)` },
          { opacity: 1, transform: "translateY(0px)" },
        ], { duration: phone.matches ? 420 : 650, easing: "cubic-bezier(.23,1,.32,1)" });
        animations.add(animation);
        void animation.finished.catch(() => {}).then(() => animations.delete(animation));
      };
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target as HTMLElement);
        }
      }, { threshold: 0, rootMargin: "0px 0px -80px 0px" });
      const scan = () => {
        // Next can replace/stream main after this persistent layout effect runs.
        // Observe the document shell, not the old route's detached main element.
        document.querySelectorAll<HTMLElement>("main h1,main h2,main h3,main h4,main p").forEach(element => {
          if (seen.has(element) || !element.textContent?.trim() || element.closest("button,a,form,[aria-live],.lh-loading,.glass-sample-content,[data-no-word-reveal]") || element.querySelector("a,button,input")) return;
          // Desktop opening text is driven by its cinematic timeline. On phones
          // the second chapter needs the same entry treatment as later chapters.
          if (element.closest(phone.matches ? ".lh-hero" : ".lh-opening")) return;
          seen.add(element);
          const rect = element.getBoundingClientRect();
          // Above-fold copy is readable immediately; only upcoming content is staged.
          if (rect.bottom <= 0 || (rect.top < innerHeight - 80 && canReveal(element))) return;
          element.setAttribute("data-scroll-reveal", "pending");
          pending.add(element); observer.observe(element);
        });
        for (const element of pending) {
          const rect = element.getBoundingClientRect();
          if (!element.isConnected) { observer.unobserve(element); pending.delete(element); }
          else if (rect.top < innerHeight - 80 && rect.bottom > 0) reveal(element);
        }
      };
      const mutation = new MutationObserver(scan);
      mutation.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-home-state", "data-state"] });
      scan();
      dispose = () => {
        observer.disconnect(); mutation.disconnect();
        animations.forEach(animation => animation.cancel()); animations.clear();
        pending.forEach(element => element.removeAttribute("data-scroll-reveal")); pending.clear();
      };
    };
    reduced.addEventListener("change", start);
    phone.addEventListener("change", start);
    start();
    return () => {
      reduced.removeEventListener("change", start);
      phone.removeEventListener("change", start);
      dispose();
    };
  }, [pathname]);
  return null;
}
