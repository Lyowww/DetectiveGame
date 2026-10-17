"use client";

import { useEffect } from "react";

/** Tracks visual viewport / keyboard inset for the desk shell (browser + Telegram). */
export function ViewportBoot() {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const view = window.visualViewport;
      if (!view) {
        root.style.setProperty("--keyboard-inset", "0px");
        delete root.dataset.keyboard;
        return;
      }
      const inset = Math.max(0, window.innerHeight - view.height - view.offsetTop);
      root.style.setProperty("--keyboard-inset", `${inset}px`);
      if (inset > 100) root.dataset.keyboard = "open";
      else delete root.dataset.keyboard;
    };
    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);
  return null;
}
