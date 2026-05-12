"use client";
import { motion, MotionProps } from "framer-motion";
import { Card, RANK_LABEL, SUIT_GLYPH, Suit } from "@/game/types";
import { cn } from "@/lib/cn";

interface PlayingCardProps {
  card?: Card | null;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  selectable?: boolean;
  dimmed?: boolean;
  rotation?: number;
  trump?: Suit | null;
  onClick?: () => void;
  className?: string;
  layoutId?: string;
  motionProps?: MotionProps;
}

const sizes = {
  sm: "w-12 h-[68px] text-[10px]",
  md: "w-20 h-[112px] text-sm",
  lg: "w-28 h-40 text-base",
};

const cornerSize = {
  sm: "text-[10px] leading-none",
  md: "text-sm leading-none",
  lg: "text-base leading-none",
};

const centerSize = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-5xl",
};

export function PlayingCard({
  card,
  faceDown,
  size = "md",
  selected,
  selectable,
  dimmed,
  rotation = 0,
  trump,
  onClick,
  className,
  layoutId,
  motionProps,
}: PlayingCardProps) {
  const isRed = card && (card.suit === "H" || card.suit === "D");
  const isTrumpSuit = card && trump && card.suit === trump;

  return (
    <motion.button
      type="button"
      layoutId={layoutId}
      onClick={onClick}
      disabled={!selectable && !onClick}
      whileHover={selectable ? { y: -8, scale: 1.03 } : undefined}
      whileTap={selectable ? { scale: 0.97 } : undefined}
      animate={{ rotate: rotation, y: selected ? -16 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "relative rounded-lg select-none card-shadow",
        "transition-opacity",
        sizes[size],
        selectable ? "cursor-pointer" : "cursor-default",
        dimmed && "opacity-40",
        selected && "ring-2 ring-gold ring-offset-2 ring-offset-felt-dark",
        className
      )}
      style={{ transformStyle: "preserve-3d" }}
      {...motionProps}
    >
      {faceDown || !card ? (
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-ember via-ember-dark to-[#5a1d0a]" />
          <div
            className="absolute inset-1 rounded-md border border-gold/30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 6px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.15) 0 2px, transparent 2px 6px)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gold/70 font-display italic tracking-wider" style={{ fontSize: size === "lg" ? 24 : size === "md" ? 18 : 12 }}>
              D
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "absolute inset-0 rounded-lg bg-gradient-to-br from-ink-50 to-ink-100 border",
            isTrumpSuit ? "border-gold/60 shadow-[0_0_20px_rgba(201,166,74,0.3)]" : "border-ink-200/80"
          )}
        >
          <div className={cn("absolute top-1 left-1.5 flex flex-col items-center", cornerSize[size], isRed ? "text-ember-dark" : "text-ink-900")}>
            <span className="font-display font-semibold tracking-tight">{RANK_LABEL[card.rank]}</span>
            <span>{SUIT_GLYPH[card.suit]}</span>
          </div>
          <div className={cn("absolute bottom-1 right-1.5 flex flex-col items-center rotate-180", cornerSize[size], isRed ? "text-ember-dark" : "text-ink-900")}>
            <span className="font-display font-semibold tracking-tight">{RANK_LABEL[card.rank]}</span>
            <span>{SUIT_GLYPH[card.suit]}</span>
          </div>
          <div className={cn("absolute inset-0 flex items-center justify-center font-display", centerSize[size], isRed ? "text-ember-dark/90" : "text-ink-800/90")}>
            {SUIT_GLYPH[card.suit]}
          </div>
          {isTrumpSuit && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold flex items-center justify-center text-[8px] font-bold text-ink-900 shadow">★</div>
          )}
        </div>
      )}
    </motion.button>
  );
}
