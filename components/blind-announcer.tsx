"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * BlindAnnouncer — global click listener that speaks the name of every
 * interactive element when clicked, giving verbal feedback in blind mode.
 * Renders nothing; just attaches a capture-phase listener on `document`.
 */

function getRole(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role");
  if (role) return role;
  if (tag === "button" || tag === "summary") return "button";
  if (tag === "a") return "link";
  if (tag === "input") {
    const type = (el as HTMLInputElement).type;
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    return "input";
  }
  if (tag === "select") return "dropdown";
  if (tag === "textarea") return "text field";
  // Clickable cards / divs
  if (el.getAttribute("data-voice-action")) return "action";
  if (el.onclick || el.style.cursor === "pointer") return "button";
  return "";
}

function getAccessibleLabel(el: HTMLElement): string {
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
  }

  // For inputs check <label>
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.textContent?.trim() || "";
    }
    if ("placeholder" in el && (el as HTMLInputElement).placeholder) {
      return (el as HTMLInputElement).placeholder;
    }
  }

  // data-voice-action hint
  const va = el.getAttribute("data-voice-action");
  if (va) return va.replace(/-/g, " ");

  // innerText (short)
  const text = (el.textContent || "").trim();
  if (text && text.length < 60) return text;

  return el.getAttribute("title") || "";
}

export function BlindAnnouncer() {
  const persona = useStore((s) => s.preferences.persona);

  useEffect(() => {
    if (persona !== "blind") return;

    const handler = (e: MouseEvent) => {
      // Walk up from target to find the nearest interactive element
      let target = e.target as HTMLElement | null;
      let label = "";
      let role = "";

      for (let i = 0; i < 6 && target; i++) {
        role = getRole(target);
        if (role) {
          label = getAccessibleLabel(target);
          break;
        }
        target = target.parentElement;
      }

      if (!role || !label) return;

      // Speak it
      if (typeof window !== "undefined" && window.speechSynthesis) {
        // Don't interrupt the voice assistant if it's speaking a long response
        const announcement = `${role}: ${label}`;
        const u = new SpeechSynthesisUtterance(announcement);
        u.rate = 1.3;
        u.volume = 0.7;
        u.lang = "en-SG";
        window.speechSynthesis.speak(u);
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [persona]);

  return null;
}
