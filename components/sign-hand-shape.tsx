"use client";

import { Hand, HandMetal, ThumbsUp, ThumbsDown, HandHelping, MousePointerClick } from "lucide-react";
import { motion } from "framer-motion";

/** Map a sign gloss to a stable index so each sign shows a different hand shape */
function glossToShapeIndex(gloss: string): number {
  let h = 0;
  for (let i = 0; i < gloss.length; i++) {
    h = (h << 5) - h + gloss.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % HAND_ICONS.length;
}

const HAND_ICONS = [
  Hand,        // open hand
  HandMetal,   // fist / rock
  ThumbsUp,    // thumb up
  ThumbsDown,  // thumb down
  HandHelping, // helping hand
  MousePointerClick, // pointing
];

export interface SignHandShapeProps {
  /** Sign gloss (e.g. HELLO, WATER) — used to pick which shape to show */
  gloss: string;
  className?: string;
  size?: number;
}

export function SignHandShape({ gloss, className = "", size = 64 }: SignHandShapeProps) {
  const index = glossToShapeIndex(gloss);
  const Icon = HAND_ICONS[index];

  return (
    <motion.div
      key={gloss}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={`flex items-center justify-center rounded-full bg-brand-cyan/20 text-brand-cyan ${className}`}
      style={{ width: size + 24, height: size + 24 }}
      aria-hidden
    >
      <Icon className="shrink-0" style={{ width: size, height: size }} strokeWidth={1.5} />
    </motion.div>
  );
}
