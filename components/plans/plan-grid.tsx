"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CalendarRange,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { deletePlanAction } from "@/app/actions/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { useAction } from "@/components/ui/use-action";
import { formatCurrency } from "@/lib/format";
import { BILLING_LABELS, PLAN_TYPE_LABELS, label } from "@/lib/labels";
import { PlanFormDialog, type PlanFormValues } from "./plan-form";
import { PlanMotif, themeFor } from "./plan-art";
import { Package } from "lucide-react";

export type PlanCardData = {
  id: string;
  name: string;
  description: string | null;
  planType: string;
  billingInterval: string;
  price: number;
  durationDays: number;
  isActive: boolean;
  showPrice: boolean;
  activeClients: number;
  totalRevenue: number;
  subscriptionCount: number;
};

/**
 * The programmes grid. Every card carries its own edit and remove controls so
 * a gym can rename, reprice or drop a programme without leaving the page —
 * each gym runs different packages at different prices.
 */
export function PlanGrid({ plans, currency }: { plans: PlanCardData[]; currency: string }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlanFormValues | undefined>();
  const [removing, setRemoving] = useState<PlanCardData | null>(null);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(plan: PlanCardData) {
    setEditing({
      planId: plan.id,
      name: plan.name,
      description: plan.description ?? "",
      planType: plan.planType,
      price: plan.price,
      durationDays: plan.durationDays,
      billingInterval: plan.billingInterval,
      isActive: plan.isActive,
      showPrice: plan.showPrice,
    });
    setFormOpen(true);
  }

  if (plans.length === 0) {
    return (
      <>
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState
            icon={Package}
            title="No programmes yet"
            description="Add the packages your gym sells — a monthly membership, a transformation block, personal training."
            action={<Button onClick={openCreate}>Add your first programme</Button>}
          />
        </div>
        <PlanFormDialog currency={currency} key="new" open={formOpen} onOpenChange={setFormOpen} />
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan, index) => {
          const theme = themeFor(index);
          return (
            <div
              key={plan.id}
              className="group relative isolate flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
              style={{ borderColor: `color-mix(in oklab, ${theme.accent} 30%, var(--border))` }}
            >
              <span
                aria-hidden
                className="absolute inset-0 -z-10 opacity-90 transition-opacity duration-200 group-hover:opacity-100"
                style={{ background: theme.surface }}
              />
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 -z-10 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
                }}
              />
              <PlanMotif
                index={index}
                className="pointer-events-none absolute -right-6 -bottom-4 -z-10 h-28 w-48 transition-transform duration-300 group-hover:scale-105"
              />

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/gym/plans/${plan.id}`}
                      className="text-[15px] font-semibold hover:underline"
                    >
                      {plan.name}
                    </Link>
                    {!plan.isActive ? <Badge tone="outline">Archived</Badge> : null}
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    {label(PLAN_TYPE_LABELS, plan.planType)} ·{" "}
                    {label(BILLING_LABELS, plan.billingInterval)}
                  </p>
                </div>

                <Dropdown>
                  <DropdownTrigger asChild>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      className="-mt-1 -mr-1 shrink-0"
                      aria-label={`Actions for ${plan.name}`}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownTrigger>
                  <DropdownContent>
                    <DropdownItem onSelect={() => openEdit(plan)}>
                      <Pencil /> Edit programme
                    </DropdownItem>
                    <DropdownItem asChild>
                      <Link href={`/gym/plans/${plan.id}`}>
                        <ArrowRight /> Open details
                      </Link>
                    </DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem destructive onSelect={() => setRemoving(plan)}>
                      {plan.subscriptionCount > 0 ? <Archive /> : <Trash2 />}
                      {plan.subscriptionCount > 0 ? "Archive" : "Delete"}
                    </DropdownItem>
                  </DropdownContent>
                </Dropdown>
              </div>

              {plan.description ? (
                <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                  {plan.description}
                </p>
              ) : null}

              <div className="mt-auto pt-6">
                <p
                  className="tabular text-[25px] leading-none font-semibold"
                  style={{ color: theme.accent }}
                >
                  {formatCurrency(plan.price, currency)}
                </p>
                {/* Your own price is always yours to see; whether the public
                    sees it is a separate decision, so the card says which. */}
                <button
                  type="button"
                  onClick={() => openEdit(plan)}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {plan.showPrice ? (
                    <>
                      <Eye className="size-3" /> Shown on your store
                    </>
                  ) : (
                    <>
                      <EyeOff className="size-3" /> Hidden — set your price to publish
                    </>
                  )}
                </button>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarRange className="size-3.5" />
                    {plan.durationDays} days
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {plan.activeClients} active
                  </span>
                  <span className="tabular ml-auto font-medium text-foreground">
                    {formatCurrency(plan.totalRevenue, currency)} earned
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add tile, so creating sits where the cards are */}
        <button
          onClick={openCreate}
          className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-[var(--border-strong)] p-5 text-muted-foreground transition-colors hover:border-[var(--brand)] hover:bg-[var(--surface-muted)] hover:text-foreground"
        >
          <span className="flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <Plus className="size-4" />
          </span>
          <span className="text-[13.5px] font-medium">Add a programme</span>
          <span className="max-w-[15rem] text-center text-[12px] text-muted-foreground">
            Set your own name, price and length.
          </span>
        </button>
      </div>

      <PlanFormDialog
        currency={currency}
        key={editing?.planId ?? "new"}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(undefined);
        }}
        plan={editing}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={
          removing && removing.subscriptionCount > 0
            ? `Archive ${removing.name}?`
            : `Delete ${removing?.name}?`
        }
        description={
          removing && removing.subscriptionCount > 0
            ? `${removing.subscriptionCount} subscription${removing.subscriptionCount === 1 ? "" : "s"} reference this programme, so it is archived rather than deleted — history and payments stay intact. It simply stops appearing for new sign-ups.`
            : "Nothing is subscribed to this programme, so it will be removed permanently."
        }
        confirmLabel={
          removing && removing.subscriptionCount > 0 ? "Archive programme" : "Delete programme"
        }
        destructive={removing?.subscriptionCount === 0}
        loading={pending}
        onConfirm={() => {
          if (!removing) return;
          run(() => deletePlanAction(removing.id), {
            onSuccess: () => {
              setRemoving(null);
              router.refresh();
            },
          });
        }}
      />
    </>
  );
}
