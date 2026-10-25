// Period math for history views (local calendar; weeks start on Monday).
export type PeriodKind = "day" | "week" | "month" | "custom";

export interface Period {
  kind: PeriodKind;
  start: Date; // inclusive
  end: Date; // exclusive
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const periodFor = (
  kind: Exclude<PeriodKind, "custom">,
  anchor: Date,
): Period => {
  if (kind === "day") {
    const start = startOfDay(anchor);
    return { kind, start, end: addDays(start, 1) };
  }
  if (kind === "week") {
    const day = (anchor.getDay() + 6) % 7; // Monday = 0
    const start = addDays(startOfDay(anchor), -day);
    return { kind, start, end: addDays(start, 7) };
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  return {
    kind,
    start,
    end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
  };
};

export const shiftPeriod = (period: Period, direction: 1 | -1): Period => {
  if (period.kind === "custom") {
    const span = period.end.getTime() - period.start.getTime();
    return {
      kind: "custom",
      start: new Date(period.start.getTime() + direction * span),
      end: new Date(period.end.getTime() + direction * span),
    };
  }
  const anchor =
    period.kind === "day"
      ? addDays(period.start, direction)
      : period.kind === "week"
        ? addDays(period.start, 7 * direction)
        : new Date(
            period.start.getFullYear(),
            period.start.getMonth() + direction,
            1,
          );
  return periodFor(period.kind, anchor);
};

/** Clamp the end to "now" so queries never ask for the future. */
export const effectiveEnd = (period: Period, now = new Date()) =>
  period.end.getTime() > now.getTime() ? now : period.end;

export const formatPeriod = (period: Period) => {
  const d = (x: Date, opts: Intl.DateTimeFormatOptions) =>
    x.toLocaleDateString(undefined, opts);
  if (period.kind === "day")
    return d(period.start, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (period.kind === "month")
    return d(period.start, { month: "long", year: "numeric" });
  const last = new Date(period.end.getTime() - 1);
  return `${d(period.start, { day: "numeric", month: "short" })} – ${d(last, { day: "numeric", month: "short", year: "numeric" })}`;
};

// <input type="date"> / "month" helpers (local time, no UTC shift)
const pad = (n: number) => String(n).padStart(2, "0");
export const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toMonthInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const fromDateInput = (v: string) => {
  const [y, m, day] = v.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
};

export const browserTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
