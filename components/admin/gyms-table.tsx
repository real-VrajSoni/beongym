"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Building2, MoreHorizontal, Play, Search, Trash2, TrendingUp } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { deleteGymAction, setGymStatusAction, setGymTierAction } from "@/app/actions/admin";
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
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";
import { formatCurrency, formatDate, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GymMark } from "./gym-mark";
import { GymStatusBadge, TierBadge } from "./gym-badges";

export type GymRow = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  /** What this gym charges its members. `collected` is denominated in it. */
  currency: string;
  status: string;
  tier: string;
  accentColor: string | null;
  logoText: string | null;
  createdAt: string;
  members: number;
  staff: number;
  plans: number;
  activeSubscriptions: number;
  collected: number;
  mrr: number;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "TRIAL", label: "Trial" },
  { key: "SUSPENDED", label: "Suspended" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

export function GymsTable({ rows }: { rows: GymRow[] }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<GymRow | null>(null);
  const [confirmName, setConfirmName] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const act = (fn: () => Promise<ActionResult>) => run(fn, { onSuccess: () => router.refresh() });

  const columns: Column<GymRow>[] = [
    {
      key: "gym",
      header: "Gym",
      primary: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <GymMark
            name={row.name}
            logoText={row.logoText}
            accentColor={row.accentColor}
            size="sm"
          />
          <div className="min-w-0">
            <Link
              href={`/admin/gyms/${row.id}`}
              className="block truncate text-[13.5px] font-medium hover:underline"
            >
              {row.name}
            </Link>
            <p className="truncate text-[12px] text-muted-foreground">
              <span className="font-mono">{row.code}</span>
              {row.city ? ` · ${row.city}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (row) => <GymStatusBadge status={row.status} /> },
    { key: "tier", header: "Tier", cell: (row) => <TierBadge tier={row.tier} /> },
    {
      key: "people",
      header: "People",
      cell: (row) => (
        <span className="tabular text-[13px]">
          {row.members} <span className="text-muted-foreground">members</span> · {row.staff}{" "}
          <span className="text-muted-foreground">staff</span>
        </span>
      ),
    },
    {
      key: "collected",
      header: "Collected",
      align: "right",
      cell: (row) => (
        <div className="tabular text-right">
          <p className="text-[13px] font-medium">{formatCurrency(row.collected, row.currency)}</p>
          <p className="text-[11.5px] text-muted-foreground">{row.activeSubscriptions} live subs</p>
        </div>
      ),
    },
    {
      key: "mrr",
      header: "Platform MRR",
      align: "right",
      cell: (row) => (
        <span className="tabular text-[13px] font-medium">
          {row.mrr > 0 ? formatUsd(row.mrr) : "—"}
        </span>
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
      key: "actions",
      header: "",
      align: "right",
      className: "w-12",
      cell: (row) => (
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="iconSm" aria-label={`Actions for ${row.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem asChild>
              <Link href={`/admin/gyms/${row.id}`}>
                <Building2 /> Open gym
              </Link>
            </DropdownItem>
            <DropdownSeparator />
            <DropdownLabel>Tier</DropdownLabel>
            {["PRO", "ELITE"]
              .filter((t) => t !== row.tier)
              .map((t) => (
                <DropdownItem key={t} onSelect={() => act(() => setGymTierAction(row.id, t))}>
                  <TrendingUp /> Move to {t.toLowerCase()}
                </DropdownItem>
              ))}
            <DropdownSeparator />
            {row.status !== "ACTIVE" ? (
              <DropdownItem onSelect={() => act(() => setGymStatusAction(row.id, "ACTIVE"))}>
                <Play /> Activate
              </DropdownItem>
            ) : null}
            {row.status !== "SUSPENDED" ? (
              <DropdownItem onSelect={() => act(() => setGymStatusAction(row.id, "SUSPENDED"))}>
                <Ban /> Suspend
              </DropdownItem>
            ) : null}
            <DropdownSeparator />
            <DropdownItem
              destructive
              onSelect={() => {
                setConfirmName("");
                setDeleting(row);
              }}
            >
              <Trash2 /> Delete gym
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
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
            placeholder="Search gym, code or city"
            className="pl-9"
            aria-label="Search gyms"
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
              icon={Building2}
              title={rows.length === 0 ? "No gyms yet" : "No gyms match"}
              description={
                rows.length === 0
                  ? "Gyms appear here as soon as owners sign up."
                  : "Try a different search or filter."
              }
            />
          }
        />
      </div>

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <ModalContent
          title="Delete this gym?"
          description="This removes the gym and every member, payment and check-in inside it. There is no undo."
        >
          <ModalBody className="space-y-4">
            <div className="rounded-lg border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3.5 py-3 text-[12.5px] text-[var(--danger)]">
              {deleting ? (
                <>
                  <span className="font-medium">{deleting.name}</span> has {deleting.members}{" "}
                  members and {formatCurrency(deleting.collected, deleting.currency)} of recorded
                  payments. Suspending it keeps the data and locks everyone out instead.
                </>
              ) : null}
            </div>
            <label className="block text-[13px] font-medium">
              Type <span className="font-mono">{deleting?.name}</span> to confirm
              <Input
                className="mt-1.5"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={deleting?.name}
              />
            </label>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              disabled={!deleting || confirmName.trim() !== deleting.name}
              onClick={() => {
                if (!deleting) return;
                run(() => deleteGymAction(deleting.id, confirmName), {
                  onSuccess: () => {
                    setDeleting(null);
                    router.refresh();
                  },
                });
              }}
            >
              Delete permanently
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
