"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

const CLASS_DYSLEXIA = "dyslexia-friendly-fonts";
const CLASS_HIGH_CONTRAST = "high-contrast";
const CLASS_REDUCED_MOTION = "reduced-motion";

/** Applies preference-based classes to document.documentElement for global accessibility (fonts, contrast, motion). */
export function AccessibilityStyles() {
  const { dyslexiaFriendlyFont, highContrast, reducedMotion } = useStore(
    (s) => s.preferences
  );

  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    if (dyslexiaFriendlyFont) el.classList.add(CLASS_DYSLEXIA);
    else el.classList.remove(CLASS_DYSLEXIA);
    if (highContrast) el.classList.add(CLASS_HIGH_CONTRAST);
    else el.classList.remove(CLASS_HIGH_CONTRAST);
    if (reducedMotion) el.classList.add(CLASS_REDUCED_MOTION);
    else el.classList.remove(CLASS_REDUCED_MOTION);
  }, [dyslexiaFriendlyFont, highContrast, reducedMotion]);

  return null;
}
