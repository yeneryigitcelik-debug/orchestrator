import { cn } from "@/lib/cn";

/**
 * Tactical status indicator — colored dot + uppercase label.
 * Pulsing dot for active/working states.
 */

const STYLES: Record<
  string,
  { color: string; label: string; pulsing: boolean }
> = {
  idle: { color: "text-[color:var(--color-fg-dim)]", label: "IDLE", pulsing: false },
  starting: {
    color: "text-[color:var(--color-signal-yellow)]",
    label: "INIT",
    pulsing: true,
  },
  running: {
    color: "text-[color:var(--color-signal-green)]",
    label: "LIVE",
    pulsing: true,
  },
  thinking: {
    color: "text-[color:var(--color-signal-cyan)]",
    label: "THINK",
    pulsing: true,
  },
  stopped: {
    color: "text-[color:var(--color-fg-disabled)]",
    label: "STOP",
    pulsing: false,
  },
  crashed: {
    color: "text-[color:var(--color-signal-red)]",
    label: "CRASH",
    pulsing: false,
  },
};

export function StatusBadge({
  status,
  size = "md",
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const s = STYLES[status] ?? STYLES.idle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        s.color,
        size === "sm" ? "text-[9px]" : "text-[10px]",
      )}
    >
      <span className={cn("signal-dot", s.pulsing && "pulsing")} />
      <span
        className={cn(
          "label-tac-sm",
          size === "sm" ? "text-[9px]" : "text-[10px]",
        )}
      >
        {s.label}
      </span>
    </span>
  );
}
