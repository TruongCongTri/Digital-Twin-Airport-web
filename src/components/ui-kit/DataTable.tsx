"use client";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

export interface DataColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  width?: string;
  render: (row: T) => ReactNode;
  /** Enables sorting on this column */
  sortValue?: (row: T) => number | string;
}

/**
 * Dense, sortable, paginated table for workspace panels. Numbers align right with
 * tabular figures; headers stay sticky while the body scrolls.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  pageSize = 25,
  initialSort,
  emptyText = "No rows",
  onRowClick,
  bare = false,
  className,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  pageSize?: number;
  initialSort?: { key: string; dir: "asc" | "desc" };
  emptyText?: string;
  onRowClick?: (row: T) => void;
  /** No outer border / radius, for embedding flush inside a panel section */
  bare?: boolean;
  className?: string;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const dir = sort!.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );

  const toggleSort = (key: string) =>
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );

  return (
    <div
      className={cn(
        "flex flex-col min-h-0 bg-twin-surface overflow-hidden",
        bare
          ? "border-y border-twin-line"
          : "border border-twin-line rounded-lg",
        className,
      )}
    >
      <div className="twin-scroll flex-1 min-h-0">
        <table className="w-full text-[12px] border-collapse">
          <thead className="sticky top-0 z-10 bg-twin-raised">
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      active
                        ? sort!.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    style={{ width: c.width }}
                    className={cn(
                      "h-8 px-3 font-medium text-[11px] text-twin-ink-2 border-b border-twin-line whitespace-nowrap",
                      c.align === "right" ? "text-right" : "text-left",
                    )}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          "twin-focus inline-flex items-center gap-1 hover:text-twin-ink",
                          c.align === "right" && "flex-row-reverse",
                          active && "text-twin-ink",
                        )}
                      >
                        {c.header}
                        {active ? (
                          sort!.dir === "asc" ? (
                            <ArrowUp size={11} />
                          ) : (
                            <ArrowDown size={11} />
                          )
                        ) : (
                          <span className="w-[11px]" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-twin-ink-3"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-twin-line last:border-b-0 hover:bg-twin-raised",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "h-8 px-3 text-twin-ink tabular-nums whitespace-nowrap",
                        c.align === "right" && "text-right",
                      )}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between h-9 px-3 border-t border-twin-line text-[11px] text-twin-ink-3 shrink-0">
        <span className="tabular-nums">
          {sorted.length === 0
            ? "0 rows"
            : `${safePage * pageSize + 1}–${Math.min(sorted.length, (safePage + 1) * pageSize)} of ${sorted.length}`}
        </span>
        <div className="flex items-center gap-0.5">
          <IconButton
            size="sm"
            label="Previous page"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft size={14} />
          </IconButton>
          <span className="tabular-nums px-1">
            {safePage + 1} / {pageCount}
          </span>
          <IconButton
            size="sm"
            label="Next page"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
          >
            <ChevronRight size={14} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
