"use client";

import { useEffect } from "react";

export function PreferenceBoot() {
  useEffect(() => {
    const root = document.documentElement;
    root.lang = localStorage.getItem("cf-lang") ?? "en";
    root.dataset.text = localStorage.getItem("cf-text") ?? "md";
    root.dataset.contrast = localStorage.getItem("cf-contrast") ?? "ink";
    const motion = localStorage.getItem("cf-motion") ?? "system";
    if (motion === "reduce") root.dataset.motion = "reduce";
    else delete root.dataset.motion;
  }, []);
  return null;
}

export function langPref(): "en" | "hy" {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem("cf-lang") === "hy" ? "hy" : "en";
}
