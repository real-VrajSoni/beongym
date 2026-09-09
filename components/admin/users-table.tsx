"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { ClientAvatar } from "@/components/ui/avatar";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RoleBadge } from "./gym-badges";

export type PlatformUserRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  memberCode: string | null;
  gymId: string | null;
  gymName: string | null;
  gymCode: string | null;
  createdAt: string;
  lastSeenLabel: string | null;
};

const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "SUPER_ADMIN", label: "Admins" },
  { key: "GYM_OWNER", label: "Owners" },
  { key: "GYM_STAFF", label: "Staff" },
  { key: "MEMBER", label: "Members" },
] as const;

export function UsersTable({ rows }: { rows: PlatformUserRow[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.role !== filter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.memberCode ?? "").toLowerCase().includes(q) ||
        (r.gymName ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const columns: Column<PlatformUserRow>[] = [
    {
      key: "person",
      header: "Person",
      primary: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ClientAvatar name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium">{row.name}</p>
            <p className="truncate text-[12px] text-muted-foreground">
              {row.memberCode ? <span className="font-mono">{row.memberCode}</span> : null}
              {row.memberCode && row.email ? " · " : ""}
              {row.email ?? (row.memberCode ? "" : "no email")}
            </p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", cell: (row) => <RoleBadge role={row.role} /> },
    {
      key: "gym",
      header: "Gym",
      cell: (row) =>
        row.gymId ? (
          <Link href={`/admin/gyms/${row.gymId}`} className="text-[13px] hover:underline">
            {row.gymName}
          </Link>
        ) : (
          <span className="text-[13px] text-[var(--subtle-foreground)]">Platform</span>
        ),
    },
    {
      key: "joined",
      header: "Joined",
      cell: (row) => (
        <span className="tabular text-[12.5px] text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "seen",
      header: "Last seen",
      cell: (row) => (
        <span className="text-[12.5px] text-muted-foreground">
          {row.lastSeenLabel ?? "never"}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1">
          {FILTERS.map((f) => {
            const count = f.key === "all" ? rows.length : rows.filter((r) => r.role === f.key).length;
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
            placeholder="Search name, email, code or gym"
            className="pl-9"
            aria-label="Search people"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
        <DataTable
          columns={columns}
          rows={filtered}
          keyFor={(row) => row.id}
          empty={<EmptyState icon={Users} title="Nobody matches" description="Try another search." />}
        />
      </div>
      <p className="mt-3 text-[12.5px] text-muted-foreground">
        Showing {filtered.length} of {rows.length} accounts
      </p>
    </>
  );
}
