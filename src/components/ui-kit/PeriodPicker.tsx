"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatPeriod,
  fromDateInput,
  periodFor,
  shiftPeriod,
  toDateInput,
  toMonthInput,
  type Period,
  type PeriodKind,
} from "@/src/lib/periods";
import { SegmentedControl } from "./Controls";
import { IconButton } from "./IconButton";

const inputClass =
  "twin-focus h-8 px-2 rounded-md border border-twin-line bg-twin-surface text-[12px] text-twin-ink tabular-nums focus:border-twin-accent outline-none";

/**
 * Period selector for history views: Day / Week / Month (with previous / next and a
 * date picker) or a custom from–to range. Emits half-open [start, end) local periods.
 */
export function PeriodPicker({
  value,
  onChange,
  className,
}: {
  value: Period;
  onChange: (period: Period) => void;
  className?: string;
}) {
  const now = new Date();
  const isCurrent =
    value.kind !== "custom" && value.end.getTime() > now.getTime();

  const setKind = (kind: PeriodKind) => {
    if (kind === "custom") {
      onChange({ kind, start: value.start, end: value.end });
    } else {
      // Anchor on the latest moment inside the current selection, capped at now
      const anchor = new Date(Math.min(value.end.getTime() - 1, now.getTime()));
      onChange(periodFor(kind, anchor));
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <SegmentedControl
        value={value.kind}
        onChange={setKind}
        ariaLabel="History period"
        options={[
          { value: "day", label: "Day" },
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
          { value: "custom", label: "Custom" },
        ]}
      />

      {value.kind === "custom" ? (
        <div className="flex items-center gap-1.5">
          <label className="flex-1 min-w-0">
            <span className="sr-only">From</span>
            <input
              type="date"
              className={cn(inputClass, "w-full")}
              value={toDateInput(value.start)}
              max={toDateInput(new Date(value.end.getTime() - 1))}
              onChange={(e) =>
                e.target.value &&
                onChange({ ...value, start: fromDateInput(e.target.value) })
              }
            />
          </label>
          <span className="text-[11px] text-twin-ink-3">to</span>
          <label className="flex-1 min-w-0">
            <span className="sr-only">To (inclusive)</span>
            <input
              type="date"
              className={cn(inputClass, "w-full")}
              value={toDateInput(new Date(value.end.getTime() - 1))}
              min={toDateInput(value.start)}
              max={toDateInput(now)}
              onChange={(e) => {
                if (!e.target.value) return;
                const last = fromDateInput(e.target.value);
                onChange({
                  ...value,
                  end: new Date(
                    last.getFullYear(),
                    last.getMonth(),
                    last.getDate() + 1,
                  ),
                });
              }}
            />
          </label>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <IconButton
            label="Previous period"
            size="sm"
            variant="outline"
            onClick={() => onChange(shiftPeriod(value, -1))}
          >
            <ChevronLeft size={14} />
          </IconButton>
          {value.kind === "month" ? (
            <input
              type="month"
              aria-label="Month"
              className={cn(inputClass, "flex-1 min-w-0")}
              value={toMonthInput(value.start)}
              max={toMonthInput(now)}
              onChange={(e) =>
                e.target.value &&
                onChange(
                  periodFor("month", fromDateInput(`${e.target.value}-01`)),
                )
              }
            />
          ) : (
            <input
              type="date"
              aria-label={value.kind === "week" ? "Any day in the week" : "Day"}
              className={cn(inputClass, "flex-1 min-w-0")}
              value={toDateInput(value.start)}
              max={toDateInput(now)}
              onChange={(e) =>
                e.target.value &&
                onChange(
                  periodFor(
                    value.kind as "day" | "week",
                    fromDateInput(e.target.value),
                  ),
                )
              }
            />
          )}
          <IconButton
            label="Next period"
            size="sm"
            variant="outline"
            disabled={isCurrent}
            onClick={() => onChange(shiftPeriod(value, 1))}
          >
            <ChevronRight size={14} />
          </IconButton>
        </div>
      )}
      <p className="text-[11px] text-twin-ink-3">{formatPeriod(value)}</p>
    </div>
  );
}
