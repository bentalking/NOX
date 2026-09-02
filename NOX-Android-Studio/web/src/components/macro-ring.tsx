import { fmt } from "@/lib/utils";

type Props = {
  label: string;
  remaining: number;
  goal: number;
  unit: string;
  tone?: "primary" | "ok";
};

export function MacroRing({
  label,
  remaining,
  goal,
  unit,
  tone = "primary",
}: Props) {
  const eaten = Math.max(0, goal - remaining);
  const pct = goal > 0 ? Math.min(1, eaten / goal) : 0;
  const over = remaining < 0;
  const size = 118;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const color = over ? "var(--color-danger)" : tone === "ok" ? "var(--color-ok)" : "var(--color-primary)";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-surface-2)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            className="transition-[stroke-dasharray] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-xl font-semibold tabular-nums leading-none tracking-tight text-fg">
            {fmt(Math.abs(Math.round(remaining)))}
          </span>
          <span className="mt-1 text-[10px] font-medium tracking-wide text-muted uppercase">
            {unit}
          </span>
        </div>
      </div>
      <p className="text-xs font-medium text-muted">
        {over ? `${label} drüber` : `${label} übrig`}
      </p>
    </div>
  );
}
