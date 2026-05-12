"use client";
import { cn } from "@/lib/cn";

export function MiniDeck({ count, className }: { count: number; className?: string }) {
  const visible = Math.min(count, 6);
  return (
    <div className={cn("relative w-20 h-[112px]", className)}>
      {Array.from({ length: visible }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-lg overflow-hidden card-shadow border border-ink-700/50"
          style={{
            transform: `translate(${i * 0.6}px, ${-i * 0.8}px)`,
            background: "linear-gradient(135deg, #d94a2b, #a83417 60%, #5a1d0a)",
          }}
        >
          <div
            className="absolute inset-1 rounded-md border border-gold/30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 6px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.15) 0 2px, transparent 2px 6px)",
            }}
          />
          {i === visible - 1 && (
            <div className="absolute inset-0 flex items-center justify-center text-gold/70 font-display italic text-lg">D</div>
          )}
        </div>
      ))}
      <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-ink-300 font-mono">
        {count}
      </div>
    </div>
  );
}
