"use client";

import { useMemo, useState } from "react";
import { Plus, Search, UserPlus, Users } from "lucide-react";
import { ClientAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { daysUntil, formatDate, formatDateShort } from "@/lib/format";
import { ClientFormDialog, type PlanOption } from "./client-form";

export type RosterRow = {
  id: string;
  memberCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  program: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  lastVisit: string | null;
  visitsThisMonth: number;
  daysAway: number | null;
  programProgress: number | null;
};

type Filter = "all" | "active" | "trial" | "inactive" | "expiring";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "trial", label: "Trial" },
  { key: "expiring", label: "Expiring soon" },
  { key: "inactive", label: "Inactive" },
];

function matchesFilter(row: RosterRow, filter: Filter): boolean {
  switch (filter) {
    case "active":
      return row.status === "ACTIVE";
    case "trial":
      return row.status === "TRIAL";
    case "inactive":
      return ["EXPIRED", "CANCELLED", "PAUSED", "NONE"].includes(row.status);
    case "expiring": {
      if (!(row.status === "ACTIVE" || row.status === "TRIAL") || !row.endDate) return false;
      const left = daysUntil(row.endDate);
      return left >= 0 && left <= 14;
    }
    default:
      return true;
  }
}

export function ClientsView({
  rows,
  plans,
  prefill,
}: {
  rows: RosterRow[];
  plans: PlanOption[];
  /** Set when an enquiry is being turned into a member. */
  prefill?: { name?: string; email?: string; phone?: string };
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // An enquiry arriving with details opens the form straight away — the desk
  // clicked "add as member", not "go and look at the roster".
  const [addOpen, setAddOpen] = useState(Boolean(prefill));

  const counts = useMemo(
    () =>
      FILTERS.reduce<Record<Filter, number>>(
        (acc, f) => {
          acc[f.key] = rows.filter((r) => matchesFilter(r, f.key)).length;
          return acc;
        },
        { all: 0, active: 0, trial: 0, inactive: 0, expiring: 0 },
      ),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.memberCode.toLowerCase().includes(q) ||
        (row.email ?? "").toLowerCase().includes(q) ||
        (row.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter]);

  const columns: Column<RosterRow>[] = [
    {
      key: "client",
      header: "Client",
      primary: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ClientAvatar name={row.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium">{row.name}</p>
            <p className="truncate text-[12px] text-muted-foreground">
              <span className="font-mono">{row.memberCode}</span>
              {row.email ? ` · ${row.email}` : ""}
            </p>
          </div>
          {row.daysAway !== null && row.daysAway >= 14 ? (
            <Badge tone="warning" className="ml-1 shrink-0">
              {row.daysAway}d away
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "program",
      header: "Programme",
      cell: (row) =>
        row.program ? (
          <span className="text-[13px]">{row.program}</span>
        ) : (
          <span className="text-[13px] text-[var(--subtle-foreground)]">No programme</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) =>
        row.status === "NONE" ? (
          <Badge tone="outline">None</Badge>
        ) : (
          <StatusBadge kind="subscription" status={row.status} />
        ),
    },
    {
      key: "start",
      header: "Start date",
      cell: (row) => (
        <span className="tabular text-[13px] text-muted-foreground">
          {row.startDate ? formatDate(row.startDate) : "—"}
        </span>
      ),
    },
    {
      key: "last",
      header: "Last seen",
      cell: (row) => {
        if (!row.lastVisit)
          return <span className="text-[13px] text-[var(--subtle-foreground)]">Never</span>;
        const away = row.daysAway ?? 0;
        return (
          <span
            className={cn(
              "tabular text-[13px]",
              away >= 14 ? "font-medium text-[var(--warning)]" : "text-muted-foreground",
            )}
          >
            {formatDateShort(row.lastVisit)}
            {away > 0 ? ` · ${away}d ago` : " · today"}
          </span>
        );
      },
    },
    {
      key: "visits",
      header: "This month",
      cell: (row) => (
        <span className="tabular text-[13px] text-muted-foreground">
          {row.visitsThisMonth} {row.visitsThisMonth === 1 ? "visit" : "visits"}
        </span>
      ),
    },
    {
      key: "progress",
      header: "Membership",
      className: "w-40",
      cell: (row) => (
        <div className="w-full max-w-36">
          <ProgressBar value={row.programProgress ?? 0} />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1">
          {FILTERS.map((f) => (
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
              <span className="tabular ml-1.5 text-[11.5px] opacity-60">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--subtle-foreground)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, member code, email or phone"
            className="pl-9"
            aria-label="Search members"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
        <DataTable
          columns={columns}
          rows={filtered}
          keyFor={(row) => row.id}
          rowHref={(row) => `/gym/clients/${row.id}`}
          empty={
            rows.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="No clients yet"
                description="Add your first client and put them on a programme — everything else follows from there."
                action={
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus /> Add client
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Users}
                title="No clients match"
                description="Try a different search term or clear the filter."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            )
          }
        />
      </div>

      {filtered.length > 0 ? (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Showing {filtered.length} of {rows.length} clients
        </p>
      ) : null}

      <ClientFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        plans={plans}
        prefill={prefill}
      />

      {/* Floating add button is the page action on mobile */}
      <div className="fixed right-5 bottom-5 z-40 lg:hidden">
        <Button size="lg" className="shadow-[var(--shadow-overlay)]" onClick={() => setAddOpen(true)}>
          <Plus /> Add client
        </Button>
      </div>
    </>
  );
}

export function AddClientButton({ plans }: { plans: PlanOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Add client
      </Button>
      <ClientFormDialog open={open} onOpenChange={setOpen} plans={plans} />
    </>
  );
}
