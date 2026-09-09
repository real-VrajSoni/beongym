"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { CreditCard, MoreHorizontal, Plus, Search } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { recordPaymentAction, setPaymentStatusAction } from "@/app/actions/payments";
import { ClientAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAction } from "@/components/ui/use-action";
import { formatCurrency, formatDate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, label } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type PaymentRow = {
  id: string;
  clientId: string;
  clientName: string;
  planName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  transactionId: string | null;
};

export type SubscriptionOption = {
  id: string;
  labelText: string;
  price: number;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "SUCCESSFUL", label: "Successful" },
  { key: "PENDING", label: "Pending" },
  { key: "FAILED", label: "Failed" },
  { key: "REFUNDED", label: "Refunded" },
] as const;

export function RecordPaymentButton({ subscriptions }: { subscriptions: SubscriptionOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState(subscriptions[0]?.id ?? "");
  const { pending, error, fieldErrors, run, reset } = useAction();
  const selected = subscriptions.find((s) => s.id === subscriptionId);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={subscriptions.length === 0}>
        <Plus />
        <span className="hidden sm:inline">Record payment</span>
        <span className="sm:hidden">Record</span>
      </Button>

      <Modal
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          setOpen(next);
        }}
      >
        <ModalContent
          title="Record a payment"
          description="Log money you've received against a subscription."
        >
          <form
            action={(formData) =>
              run(() => recordPaymentAction(formData), {
                onSuccess: () => {
                  setOpen(false);
                  router.refresh();
                },
              })
            }
          >
            <ModalBody className="space-y-4">
              <FormError message={error} />

              <FormField
                label="Subscription"
                htmlFor="pay-sub"
                required
                error={fieldErrors.subscriptionId}
              >
                <Select
                  id="pay-sub"
                  name="subscriptionId"
                  value={subscriptionId}
                  onChange={(e) => setSubscriptionId(e.target.value)}
                  required
                >
                  {subscriptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.labelText}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormGrid>
                <FormField label="Amount (₹)" htmlFor="pay-amount" required error={fieldErrors.amount}>
                  <Input
                    id="pay-amount"
                    name="amount"
                    type="number"
                    min={1}
                    step={100}
                    inputMode="numeric"
                    key={subscriptionId}
                    defaultValue={selected?.price ?? ""}
                    required
                  />
                </FormField>
                <FormField label="Date" htmlFor="pay-date" required error={fieldErrors.paymentDate}>
                  <DateField
                    id="pay-date"
                    name="paymentDate"
                    defaultValue={format(new Date(), "yyyy-MM-dd")}
                    required
                  />
                </FormField>
                <FormField label="Method" htmlFor="pay-method" required>
                  <Select id="pay-method" name="paymentMethod" defaultValue="UPI">
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Status" htmlFor="pay-status" required>
                  <Select id="pay-status" name="status" defaultValue="SUCCESSFUL">
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </FormGrid>

              <FormField
                label="Transaction ID"
                htmlFor="pay-txn"
                error={fieldErrors.transactionId}
                hint="Optional — the UPI reference or gateway ID."
              >
                <Input id="pay-txn" name="transactionId" placeholder="TXN4201" />
              </FormField>
            </ModalBody>

            <ModalFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Record payment
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  const router = useRouter();
  const { run } = useAction();
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.clientName.toLowerCase().includes(q) ||
        r.planName.toLowerCase().includes(q) ||
        (r.transactionId ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const act = (fn: () => Promise<ActionResult>) => run(fn, { onSuccess: () => router.refresh() });

  const columns: Column<PaymentRow>[] = [
    {
      key: "client",
      header: "Client",
      primary: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ClientAvatar name={row.clientName} size="sm" />
          <div className="min-w-0">
            <Link
              href={`/gym/clients/${row.clientId}?tab=subscription`}
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
      key: "amount",
      header: "Amount",
      cell: (row) => (
        <span className="tabular text-[13.5px] font-medium">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <span className="tabular text-[13px] text-muted-foreground">
          {formatDate(row.paymentDate)}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      cell: (row) => (
        <span className="text-[13px] text-muted-foreground">
          {label(PAYMENT_METHOD_LABELS, row.paymentMethod)}
        </span>
      ),
    },
    {
      key: "txn",
      header: "Transaction",
      cell: (row) => (
        <span className="font-mono text-[12px] text-[var(--subtle-foreground)]">
          {row.transactionId ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge kind="payment" status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "w-12",
      cell: (row) => (
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="iconSm" aria-label="Payment actions">
              <MoreHorizontal />
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownLabel>Mark as</DropdownLabel>
            {Object.entries(PAYMENT_STATUS_LABELS)
              .filter(([value]) => value !== row.status)
              .map(([value, text]) => (
                <DropdownItem key={value} onSelect={() => act(() => setPaymentStatusAction(row.id, value))}>
                  {text}
                </DropdownItem>
              ))}
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
        <div className="relative sm:w-64">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--subtle-foreground)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client or transaction"
            className="pl-9"
            aria-label="Search payments"
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
              title={rows.length === 0 ? "No payments yet" : "No matching payments"}
              description={
                rows.length === 0
                  ? "Record a payment against a subscription to start tracking revenue."
                  : "Try a different search or filter."
              }
            />
          }
        />
      </div>
    </>
  );
}
