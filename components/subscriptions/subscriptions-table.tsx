"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Pause, Play, RefreshCw, Repeat, XCircle } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import {
  renewSubscriptionAction,
  setSubscriptionStatusAction,
  toggleAutoRenewAction,
} from "@/app/actions/subscriptions";
import { ClientAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAction } from "@/components/ui/use-action";
import { daysUntil, formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SubscriptionRow = {
  id: string;
  clientId: string;
  clientName: string;
  planId: string;
  planName: string;
  price: number;
  startDate: string;
  endDate: string;
  status: string;
  autoRenew: boolean;
  collected: number;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "TRIAL", label: "Trial" },
  { key: "PAUSED", label: "Paused" },
  { key: "EXPIRED", label: "Expired" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

export function SubscriptionsTable({ rows }: { rows: SubscriptionRow[] }) {
  const router = useRouter();
  const { run } = useAction();
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  const act = (fn: () => Promise<ActionResult>) => run(fn, { onSuccess: () => router.refresh() });

  const columns: Column<SubscriptionRow>[] = [
    {
      key: "client",
      header: "Client",
      primary: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ClientAvatar name={row.clientName} size="sm" />
          <div className="min-w-0">
            <Link
              href={`/gym/clients/${row.clientId}`}
              className="block truncate text-[13.5px] font-medium hover:underline"
            >
              {row.clientName}
            </Link>
            <p className="truncate text-[12px] text-muted-foreground">{row.planName}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge kind="subscription" status={row.status} />,
    },
    {
      key: "term",
      header: "Term",
      cell: (row) => {
        const left = daysUntil(row.endDate);
        const live = row.status === "ACTIVE" || row.status === "TRIAL";
        return (
          <div>
            <p className="tabular text-[13px]">
              {formatDate(row.startDate)} → {formatDate(row.endDate)}
            </p>
            {live ? (
              <p
                className={cn(
                  "tabular text-[11.5px]",
                  left < 0
                    ? "text-[var(--danger)]"
                    : left <= 14
                      ? "text-[var(--warning)]"
                      : "text-muted-foreground",
                )}
              >
                {left < 0 ? `${Math.abs(left)} days overdue` : `${left} days left`}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      cell: (row) => (
        <div className="tabular text-right">
          <p className="text-[13px] font-medium">{formatCurrency(row.price)}</p>
          <p className="text-[11.5px] text-muted-foreground">
            {formatCurrency(row.collected)} collected
          </p>
        </div>
      ),
    },
    {
      key: "renew",
      header: "Auto-renew",
      cell: (row) => (
        <button
          onClick={() => act(() => toggleAutoRenewAction(row.id, !row.autoRenew))}
          className="cursor-pointer"
          aria-label={`Turn auto-renew ${row.autoRenew ? "off" : "on"} for ${row.clientName}`}
        >
          <Badge tone={row.autoRenew ? "success" : "outline"} dot={row.autoRenew}>
            {row.autoRenew ? "On" : "Off"}
          </Badge>
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "w-12",
      cell: (row) => (
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="iconSm" aria-label="Subscription actions">
              <MoreHorizontal />
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownLabel>Subscription</DropdownLabel>
            <DropdownItem onSelect={() => act(() => renewSubscriptionAction(row.id))}>
              <RefreshCw /> Renew for another term
            </DropdownItem>
            <DropdownSeparator />
            {row.status !== "ACTIVE" ? (
              <DropdownItem onSelect={() => act(() => setSubscriptionStatusAction(row.id, "ACTIVE"))}>
                <Play /> Mark active
              </DropdownItem>
            ) : null}
            {row.status !== "PAUSED" ? (
              <DropdownItem onSelect={() => act(() => setSubscriptionStatusAction(row.id, "PAUSED"))}>
                <Pause /> Pause
              </DropdownItem>
            ) : null}
            {row.status !== "CANCELLED" ? (
              <DropdownItem
                destructive
                onSelect={() => act(() => setSubscriptionStatusAction(row.id, "CANCELLED"))}
              >
                <XCircle /> Cancel
              </DropdownItem>
            ) : null}
          </DropdownContent>
        </Dropdown>
      ),
    },
  ];

  return (
    <>
      <div className="scrollbar-thin -mx-1 mb-4 flex gap-1 overflow-x-auto px-1">
        {FILTERS.map((f) => {
          const count = f.key === "all" ? rows.length : rows.filter((r) => r.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                filter === f.key
                  ? "bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]"
                  : "text-muted-foreground hover:bg-[var(--surface-muted)] hover:text-foreground",
              )}
            >
              {f.label}
              <span className="tabular ml-1.5 text-[11.5px] opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
        <DataTable
          columns={columns}
          rows={filtered}
          keyFor={(row) => row.id}
          empty={
            <EmptyState
              icon={Repeat}
              title={rows.length === 0 ? "No subscriptions yet" : "Nothing in this filter"}
              description={
                rows.length === 0
                  ? "A membership puts a member on one of your plans. Add a member to create the first one."
                  : "Try a different status filter."
              }
            />
          }
        />
      </div>
    </>
  );
}
