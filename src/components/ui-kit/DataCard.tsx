"use client";
import type { ElementType, ReactNode } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// Domain acronyms that must survive title-casing
const ACRONYMS: Record<string, string> = {
  AI: "AI",
  ATC: "ATC",
  "ADS-B": "ADS-B",
  CO2: "CO₂",
  IOT: "IoT",
  SLA: "SLA",
  VLAN: "VLAN",
  MQTT: "MQTT",
  GSE: "GSE",
  UCL: "UCL",
  LCL: "LCL",
  HUD: "HUD",
  ID: "ID",
  VIP: "VIP",
  OPS: "OPS",
  QOS: "QoS",
  TLS: "TLS",
  ETA: "ETA",
  ETD: "ETD",
  KTS: "kts",
  PAX: "PAX",
  CG: "CG",
  MAC: "MAC",
};

// Legacy callers pass ALL-CAPS titles; render them in title case for readability
const toDisplayTitle = (title: string) =>
  title === title.toUpperCase()
    ? title.replace(
        /[A-Z0-9][A-Z0-9-]*/g,
        (word) =>
          ACRONYMS[word] ?? word.charAt(0) + word.slice(1).toLowerCase(),
      )
    : title;

/**
 * Content card for analytics panels and the dashboard: header (icon, title, meta,
 * actions), optional image banner, body and optional footer note.
 */
export function DataCard({
  title,
  icon: Icon,
  meta,
  actions,
  media,
  footer,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  icon?: ElementType;
  meta?: ReactNode;
  actions?: ReactNode;
  media?: string | null;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "w-full shrink-0 bg-twin-surface border border-twin-line rounded-lg shadow-sm overflow-hidden pointer-events-auto text-twin-ink",
        className,
      )}
    >
      <header className="flex items-center gap-2 h-10 px-3.5 border-b border-twin-line">
        {Icon && <Icon size={14} className="text-twin-ink-2 shrink-0" />}
        <h3 className="flex-1 min-w-0 text-[12px] font-semibold truncate">
          {toDisplayTitle(title)}
        </h3>
        {meta != null && (
          <span className="text-[11px] text-twin-ink-3 tabular-nums truncate max-w-[45%]">
            {meta}
          </span>
        )}
        {actions}
      </header>
      {media && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media}
          alt=""
          className="w-full h-28 object-cover border-b border-twin-line"
        />
      )}
      <div className={cn("px-3.5 py-3 text-[12px]", bodyClassName)}>
        {children}
      </div>
      {footer && (
        <footer className="flex items-center gap-2 h-8 px-3.5 border-t border-twin-line bg-twin-raised text-[11px] text-twin-ink-3 truncate">
          {footer}
        </footer>
      )}
    </section>
  );
}

/** "Updates every 5 min" chip for cards backed by slow-polling history. */
export function RefreshChip({
  label = "5-min update",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-5 px-1.5 rounded border border-twin-line bg-twin-surface text-[10px] text-twin-ink-3 whitespace-nowrap",
        className,
      )}
    >
      <Clock size={10} /> {label}
    </span>
  );
}

export { toDisplayTitle };
