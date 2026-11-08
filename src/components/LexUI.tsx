import React from "react";
import { ArrowLeft } from "lucide-react";

/* ==========================================================================
   Lex UI kit — primitives taken straight from the "رفرنس لکس" screens.
   ========================================================================== */

export const LEX = {
  canvas: "#F5F3EF",
  ink: "#1C1C1C",
  muted: "#6E6B66",
  beige: "#E9E7E1",
  yellow: "#FFFF66",
  orchid: "#EBA2F8",
  orange: "#F29B47",
  sky: "#6BCFEA",
  periwinkle: "#A9ABEE",
  green: "#5ED46A",
  tipBlue: "#A8DBF4"
};

const WAVE_COLORS = [LEX.orchid, LEX.orange, LEX.yellow, LEX.green, LEX.sky, LEX.periwinkle];

/**
 * Signature Lex wavy rainbow strip (top of "Welcome to Lex!" / promo cards).
 * Segments are separated by soft S-curves with thin ink outlines.
 */
export const LexWaveStrip: React.FC<{ className?: string; colors?: string[]; flip?: boolean }> = ({
  className = "h-7",
  colors = WAVE_COLORS,
  flip = false
}) => {
  const W = 600;
  const H = 40;
  const n = colors.length;
  // RTL friendly: first segment is widest like the reference
  const stops = [0, 0.4, 0.53, 0.64, 0.76, 0.88, 1].slice(0, n + 1).map((s) => s * W);
  const edge = (x: number) => `M ${x + 14} ${H} C ${x + 18} ${H}, ${x + 10} 0, ${x} 0`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`block w-full ${className}`}
      style={flip ? { transform: "scaleY(-1)" } : undefined}
      aria-hidden="true"
    >
      {colors.map((c, i) => {
        const x0 = stops[i];
        if (i === 0) return <rect key={i} x="0" y="0" width={W} height={H} fill={c} />;
        return <path key={i} d={`${edge(x0)} L ${W} 0 L ${W} ${H} Z`} fill={c} />;
      })}
      {colors.map((_c, i) =>
        i === 0 ? null : (
          <path
            key={`s${i}`}
            d={edge(stops[i])}
            fill="none"
            stroke={LEX.ink}
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
        )
      )}
    </svg>
  );
};

/** Big "Lex Plus"-style vertical wavy bands used as a hero banner background. */
export const LexWaveBands: React.FC<{ className?: string; colors?: string[]; center: string }> = ({
  className = "h-24",
  colors = [LEX.sky, LEX.green, LEX.orange, LEX.periwinkle],
  center
}) => {
  const bands = (side: "l" | "r") =>
    colors.map((c, i) => {
      const x = side === "l" ? 20 + i * 26 : 580 - i * 26;
      const dir = side === "l" ? 1 : -1;
      const w = 200;
      return (
        <path
          key={side + i}
          d={
            side === "l"
              ? `M 0 0 L ${x} 0 C ${x + 22 * dir} 25, ${x - 18 * dir} 50, ${x} 75 S ${x + 18 * dir} 125, ${x} 150 L 0 150 Z`
              : `M ${w * 3} 0 L ${x} 0 C ${x + 22 * dir} 25, ${x - 18 * dir} 50, ${x} 75 S ${x + 18 * dir} 125, ${x} 150 L ${w * 3} 150 Z`
          }
          fill={c}
          stroke={LEX.ink}
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
      );
    });
  return (
    <svg viewBox="0 0 600 150" preserveAspectRatio="none" className={`block w-full ${className}`} aria-hidden="true">
      <rect x="0" y="0" width="600" height="150" fill={center} />
      {[...bands("l")].reverse()}
      {[...bands("r")].reverse()}
    </svg>
  );
};

/** Lex section header: "Top public groups ........ See all →" + full-width hairline. */
export const LexSectionHeader: React.FC<{
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}> = ({ title, actionLabel, onAction, className = "" }) => (
  <div className={`-mx-4 mb-3 ${className}`} dir="rtl">
    <div className="px-4 flex items-end justify-between gap-3 pb-2.5">
      <h2 className="text-[19px] font-bold text-[#1C1C1C] leading-tight">{title}</h2>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#4A4744] hover:text-[#1C1C1C] cursor-pointer"
        >
          <span>{actionLabel}</span>
          <ArrowLeft className="w-5 h-5 stroke-[1.6]" />
        </button>
      )}
    </div>
    <div className="h-px bg-[#1C1C1C]/70" />
  </div>
);

/** Lex underline tabs ("Explore Groups | Your Groups"). */
export const LexUnderlineTabs: React.FC<{
  tabs: { id: string; label: string; count?: number; dot?: boolean }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}> = ({ tabs, active, onChange, className = "" }) => (
  <div className={`-mx-4 border-b border-[#1C1C1C]/15 ${className}`} dir="rtl">
    <div className="flex">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`relative flex-1 py-3 text-[15px] transition-colors cursor-pointer ${
              isActive ? "text-[#1C1C1C] font-bold" : "text-[#6E6B66] font-medium hover:text-[#1C1C1C]"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {t.label}
              {typeof t.count === "number" && (
                <span className="text-[12px] opacity-60">{t.count.toLocaleString("fa-IR")}</span>
              )}
              {t.dot && <span className="w-2 h-2 rounded-full bg-[#F0626A]" />}
            </span>
            <span
              className={`absolute bottom-[-1px] left-0 right-0 h-[3px] transition-colors ${
                isActive ? "bg-[#1C1C1C]" : "bg-transparent"
              }`}
            />
          </button>
        );
      })}
    </div>
  </div>
);

/** Lex empty state ("No posts right now"). */
export const LexEmptyState: React.FC<{
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  accent?: string;
}> = ({ title, body, actionLabel, onAction, accent = LEX.green }) => (
  <div className="bg-white/0 border-[1.5px] border-[#1C1C1C] rounded-[24px] px-6 py-9 text-center" dir="rtl">
    <h3 className="text-[24px] font-black text-[#1C1C1C] leading-tight">{title}</h3>
    <p className="text-[15px] text-[#1C1C1C]/85 mt-3 leading-relaxed max-w-sm mx-auto">{body}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-6 px-6 py-2.5 rounded-[10px] border-[1.5px] border-[#1C1C1C] text-[15px] font-bold text-[#1C1C1C] cursor-pointer active:scale-[0.98] transition-transform"
        style={{ backgroundColor: accent }}
      >
        {actionLabel}
      </button>
    )}
  </div>
);
