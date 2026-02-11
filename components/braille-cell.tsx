"use client";

import { motion } from "framer-motion";

/** 3×2 braille cell. Dots 1–3 top row, 4–6 bottom row. */
const POSITIONS = [
  [1, 0], [2, 0], [3, 0],
  [1, 1], [2, 1], [3, 1],
] as const;

const DOT_LABELS: Record<number, string> = {
  1: "Dot 1, top left",
  2: "Dot 2, top center",
  3: "Dot 3, top right",
  4: "Dot 4, bottom left",
  5: "Dot 5, bottom center",
  6: "Dot 6, bottom right",
};

export interface BrailleCellProps {
  /** Which dots are raised (1-6) */
  dots: number[];
  /** Animate dots (e.g. when playing receive) */
  animate?: boolean;
  /** Size class */
  size?: "sm" | "md" | "lg";
  /** Optional click handler: (dotIndex 1-6, currentlyActive) => void for send mode */
  onDotClick?: (dot: number, active: boolean) => void;
  /** In send mode, which dots are selected (controlled) */
  selectedDots?: number[];
  className?: string;
}

const sizeClasses = {
  sm: "w-12 h-16 gap-0.5",
  md: "w-16 h-20 gap-1",
  lg: "w-24 h-32 gap-1.5",
};

const dotSizes = {
  sm: "w-2.5 h-2.5",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

export function BrailleCell({
  dots,
  animate = false,
  size = "md",
  onDotClick,
  selectedDots = [],
  className = "",
}: BrailleCellProps) {
  const dotSize = dotSizes[size];
  const gridSize = sizeClasses[size];

  return (
    <div
      className={`grid grid-cols-3 grid-rows-2 ${gridSize} ${className}`}
      role={onDotClick ? "group" : "img"}
      aria-label={onDotClick ? "Braille cell: tap dots to enter character" : `Braille: ${dots.join(",")}`}
    >
      {POSITIONS.map((_, i) => {
        const dotNum = i + 1;
        const isRaised = dots.includes(dotNum) || selectedDots.includes(dotNum);
        const isInteractive = !!onDotClick;
        const isSelected = selectedDots.includes(dotNum);
        const label = DOT_LABELS[dotNum] ?? `Dot ${dotNum}`;
        const ariaLabel = isInteractive
          ? `${label}, ${isSelected ? "raised, tap to lower" : "not raised, tap to raise"}`
          : undefined;

        const dot = isInteractive ? (
          <motion.button
            key={dotNum}
            type="button"
            className={`rounded-full ${dotSize} cursor-pointer hover:bg-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy ${
              isRaised ? "bg-brand-cyan shadow-glow-sm" : "bg-white/25"
            }`}
            initial={animate ? { scale: 0 } : false}
            animate={animate && isRaised ? { scale: 1 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            onClick={() => onDotClick?.(dotNum, isSelected)}
            aria-label={ariaLabel}
            aria-pressed={isSelected}
          />
        ) : (
          <motion.div
            key={dotNum}
            className={`rounded-full ${dotSize} ${
              isRaised ? "bg-brand-cyan shadow-glow-sm" : "bg-white/25"
            }`}
            initial={animate ? { scale: 0 } : false}
            animate={animate && isRaised ? { scale: 1 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          />
        );

        return dot;
      })}
    </div>
  );
}
