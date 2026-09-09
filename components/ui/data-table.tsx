import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Column width / alignment classes for the desktop table. */
  className?: string;
  /** Rendered as the card heading on mobile instead of a labelled row. */
  primary?: boolean;
  /** Dropped entirely on mobile cards (e.g. redundant action columns). */
  hideOnMobile?: boolean;
  align?: "left" | "right";
};

/**
 * One table definition, two presentations: a real table on desktop and a
 * stack of cards on mobile. Server-render safe — cells are plain functions,
 * row navigation is a Link rather than an onClick handler.
 */
export function DataTable<T>({
  columns,
  rows,
  keyFor,
  rowHref,
  empty,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  keyFor: (row: T) => string;
  rowHref?: (row: T) => string;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const secondary = columns.filter((c) => c !== primary && !c.hideOnMobile);

  return (
    <div className={className}>
      {/* Desktop */}
      <div className="scrollbar-thin hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-5 py-2.5 text-[11.5px] font-medium tracking-wide text-[var(--subtle-foreground)] uppercase",
                    col.align === "right" ? "text-right" : "text-left",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
              {rowHref ? <th className="w-10" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr
                  key={keyFor(row)}
                  className="group relative transition-colors hover:bg-[var(--surface-hover)]"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-5 py-3.5 align-middle",
                        col.align === "right" ? "text-right" : "text-left",
                        // Cells after the primary sit above the row overlay so
                        // any buttons inside them stay clickable.
                        col !== primary && "relative z-10",
                        col.className,
                      )}
                    >
                      {href && col === primary ? (
                        <Link href={href} className="block focus:outline-none">
                          <span className="absolute inset-0" aria-hidden />
                          {col.cell(row)}
                        </Link>
                      ) : (
                        col.cell(row)
                      )}
                    </td>
                  ))}
                  {href ? (
                    <td className="px-3 py-3.5 text-right">
                      <Link
                        href={href}
                        aria-label="Open"
                        className="relative z-10 inline-flex text-[var(--subtle-foreground)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="divide-y divide-[var(--border)] md:hidden">
        {rows.map((row) => {
          const href = rowHref?.(row);
          const body = (
            <div className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">{primary.cell(row)}</div>
                {href ? (
                  <ChevronRight className="mt-1 size-4 shrink-0 text-[var(--subtle-foreground)]" />
                ) : null}
              </div>
              {secondary.length > 0 ? (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {secondary.map((col) => (
                    <div key={col.key} className="min-w-0">
                      <dt className="text-[11px] tracking-wide text-[var(--subtle-foreground)] uppercase">
                        {col.header}
                      </dt>
                      <dd className="mt-0.5 text-[13px]">{col.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          );
          return href ? (
            <Link key={keyFor(row)} href={href} className="block active:bg-[var(--surface-hover)]">
              {body}
            </Link>
          ) : (
            <div key={keyFor(row)}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
