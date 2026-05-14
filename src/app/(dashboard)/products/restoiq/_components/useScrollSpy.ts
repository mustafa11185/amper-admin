"use client";

/**
 * useScrollSpy — P-AMPER-UX (2026-05-14).
 *
 * Tracks which section is currently visible inside the dashboard's
 * scrollable main area. Adapted from the RestoIQ manager web's
 * hook (frontend/src/lib/use-scroll-spy.ts) but targets the window
 * because Amper's DashboardShell scrolls the document, not a
 * <main> element.
 *
 * Returns { activeId, scrollToSection } so the nav can both
 * highlight and trigger smooth scrolls without history pollution.
 */
import { useEffect, useRef, useState, MouseEvent } from "react";

const DETECTION_OFFSET = 180; // sticky topbar + breathing room
const BOTTOM_EPSILON = 24;
const SUPPRESS_MS = 800;

export function useScrollSpy(sectionIds: string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");
  const suppressUntil = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function compute() {
      if (Date.now() < suppressUntil.current) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const viewportBottom = scrollTop + window.innerHeight;
      const docHeight =
        document.documentElement.scrollHeight || document.body.scrollHeight;

      if (viewportBottom >= docHeight - BOTTOM_EPSILON) {
        setActiveId(sectionIds[sectionIds.length - 1]);
        return;
      }

      const line = scrollTop + DETECTION_OFFSET;
      let current = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        // offsetTop is relative to the document root, which is what
        // we want since we're scrolling window.
        if (el.getBoundingClientRect().top + scrollTop <= line) {
          current = id;
        } else {
          break;
        }
      }
      setActiveId(current);
    }

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [sectionIds]);

  function scrollToSection(e: MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    // Briefly stop the scroll listener from overriding our manual
    // pick — otherwise mid-scroll the active state ping-pongs.
    suppressUntil.current = Date.now() + SUPPRESS_MS;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof history !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  }

  return { activeId, scrollToSection };
}
