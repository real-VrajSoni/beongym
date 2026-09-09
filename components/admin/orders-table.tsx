"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Search } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ClientAvatar } from "@/components/ui/avatar";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TierBadge } from "./gym-badges";

export type OrderRow = {
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  gymId: string | null;
  gymName: string;
  gymCode: string | null;
  tier: string;
  billingCycle: string;
  amount: number;
  status: string;
  provider: string | null;
  providerRef: string | null;
  createdAt: string;
  paidAt: string | null;
};

const STATUS_TONE: Record<string, BadgeTone> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "danger",
  REFUNDED: "neutral",
  CANCELLED: "outline",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "PAID", label: "Paid" },
  { key: "PENDING", label: "Pending" },
  { key: "FAILED", label: "Failed" },
  { key: "REFUNDED", label: "Refunded" },
] as const;

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.userName.toLowerCase().includes(q) ||
        (r.userEmail ?? "").toLowerCase().includes(q) ||
        r.gymName.toLowerCase().includes(q) ||
        (r.gymCode ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const columns: Column<OrderRow>[] = [
    {
      key: "buyer",
      header: "Bought by",
      primary: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ClientAvatar name={row.userName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium">{row.userName}</p>
            <p className="truncate text-[12px] text-muted-foreground">{row.userEmail ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "gym",
      header: "Gym",
      cell: (row) =>
        row.gymId ? (
          <Link href={`/admin/gyms/${row.gymId}`} className="text-[13px] hover:underline">
            {row.gymName}
            {row.gymCode ? (
              <span className="ml-1.5 font-mono text-[11.5px] text-muted-foreground">
                {row.gymCode}
              </span>
            ) : null}
          </Link>
        ) : (
          <span className="text-[13px] text-[var(--subtle-foreground)]">
            {row.gymName} <span className="text-[11.5px]">(not provisioned)</span>
          </span>
        ),
    },
    { key: "tier", header: "Plan", cell: (row) => <TierBadge tier={row.tier} /> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => (
        <div className="tabular text-right">
          <p className="text-[13px] font-medium">
            {row.amount === 0 ? "Free" : formatUsd(row.amount)}
          </p>
          <p className="text-[11.5px] text-muted-foreground">
            {row.billingCycle === "ANNUAL" ? "yearly" : "monthly"}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge tone={STATUS_TONE[row.status] ?? "neutral"} dot>
          {row.status[0] + row.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      cell: (row) => (
        <span className="font-mono text-[12px] text-[var(--subtle-foreground)]">
          {row.provider ?? "—"}
          {row.providerRef ? ` · ${row.providerRef}` : ""}
        </span>
      ),
    },
    {
      key: "when",
      header: "Placed",
      cell: (row) => (
        <div className="tabular">
          <p className="text-[12.5px] text-muted-foreground">{row.createdAt}</p>
          {row.paidAt ? (
            <p className="text-[11.5px] text-[var(--success)]">paid {row.paidAt}</p>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1">
          {FILTERS.map((f) => {
            const count =
              f.key === "all" ? rows.length : rows.filter((r) => r.status === f.key).length;
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
        <div className="relative sm:w-72">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--subtle-foreground)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search buyer, email or gym"
            className="pl-9"
            aria-label="Search orders"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
        <DataTable
          columns={columns}
          rows={filtered}
          keyFor={(row) => row.id}
          empty={
            <EmptyState
              icon={CreditCard}
              title={rows.length === 0 ? "No orders yet" : "No orders match"}
              description={
                rows.length === 0
                  ? "Orders appear here the moment a gym owner buys a plan."
                  : "Try a different search or filter."
              }
            />
          }
        />
      </div>
    </>
  );
}
