"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, MoreHorizontal, Pencil, Plus, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { resetStaffPasswordAction, setStaffActiveAction } from "@/app/actions/staff";
import { ClientAvatar } from "@/components/ui/avatar";
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
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Section } from "@/components/ui/section";
import { useAction } from "@/components/ui/use-action";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StaffFormDialog, type StaffFormValues } from "./staff-form";

export type StaffRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  title: string | null;
  specialization: string | null;
  isActive: boolean;
  createdAt: string;
  lastSeenLabel: string | null;
  recentlyActive: boolean;
  isSelf: boolean;
  /** Work attached to this person, shown before switching them off. */
  plans: number;
  classes: number;
};

export function StaffView({ rows, gymCode }: { rows: StaffRow[]; gymCode: string }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffFormValues | undefined>();
  const [deactivating, setDeactivating] = useState<StaffRow | null>(null);
  const [resetting, setResetting] = useState<StaffRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const act = (fn: () => Promise<ActionResult>) => run(fn, { onSuccess: () => router.refresh() });

  const active = rows.filter((r) => r.isActive);
  const inactive = rows.filter((r) => !r.isActive);

  function openEdit(row: StaffRow) {
    setEditing({
      staffId: row.id,
      name: row.name,
      email: row.email ?? "",
      phone: row.phone ?? "",
      title: row.title ?? "",
      role: row.role,
      specialization: row.specialization ?? "",
    });
    setFormOpen(true);
  }

  function renderRow(row: StaffRow) {
    return (
      <li key={row.id} className="flex items-center gap-3.5 px-5 py-3.5">
        <ClientAvatar name={row.name} size="md" className={cn(!row.isActive && "opacity-50")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("truncate text-[13.5px] font-medium", !row.isActive && "text-muted-foreground")}>
              {row.name}
            </p>
            {row.role === "GYM_OWNER" ? (
              <Badge tone="brand">
                <ShieldCheck className="size-3" /> Owner
              </Badge>
            ) : (
              <Badge tone="neutral">Staff</Badge>
            )}
            {row.isSelf ? <Badge tone="outline">You</Badge> : null}
            {!row.isActive ? <Badge tone="warning">Deactivated</Badge> : null}
          </div>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {row.title ? `${row.title} · ` : ""}
            {row.email}
          </p>
          <p className="mt-0.5 text-[11.5px] text-[var(--subtle-foreground)]">
            Joined {formatDate(row.createdAt)} ·{" "}
            {row.lastSeenLabel ? `last seen ${row.lastSeenLabel}` : "never signed in"}
          </p>
        </div>

        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="iconSm" aria-label={`Actions for ${row.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem onSelect={() => openEdit(row)}>
              <Pencil /> Edit details
            </DropdownItem>
            <DropdownItem
              onSelect={() => {
                setNewPassword("");
                setResetting(row);
              }}
            >
              <KeyRound /> Set new password
            </DropdownItem>
            <DropdownSeparator />
            {row.isActive ? (
              <DropdownItem
                destructive
                disabled={row.isSelf}
                onSelect={() => setDeactivating(row)}
              >
                <UserMinus /> Deactivate access
              </DropdownItem>
            ) : (
              <DropdownItem onSelect={() => act(() => setStaffActiveAction(row.id, true))}>
                <UserPlus /> Restore access
              </DropdownItem>
            )}
          </DropdownContent>
        </Dropdown>
      </li>
    );
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-3">
        <Section
          title="Your team"
          description={`${active.length} active · ${rows.length} total`}
          className="lg:col-span-2"
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus /> Add team member
            </Button>
          }
          bodyClassName="pb-1"
        >
          {rows.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No team yet"
              description="Add a manager, front-desk staffer or trainer so they can run the gym with you."
              action={
                <Button
                  onClick={() => {
                    setEditing(undefined);
                    setFormOpen(true);
                  }}
                >
                  Add your first team member
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--border)]">{active.map(renderRow)}</ul>
          )}

          {inactive.length > 0 ? (
            <>
              <p className="border-t border-[var(--border)] px-5 pt-4 pb-2 text-[11px] font-medium tracking-wide text-[var(--subtle-foreground)] uppercase">
                Deactivated
              </p>
              <ul className="divide-y divide-[var(--border)]">{inactive.map(renderRow)}</ul>
            </>
          ) : null}
        </Section>

        <Section title="What each level can do" bodyClassName="px-5 py-4">
          <div className="space-y-4 text-[13px] leading-relaxed">
            <div>
              <p className="flex items-center gap-2 font-medium">
                <ShieldCheck className="size-3.5 text-[var(--brand)]" /> Owner
              </p>
              <p className="mt-1 text-muted-foreground">
                Everything staff can do, plus gym branding, plan &amp; billing, and managing this
                team.
              </p>
            </div>
            <div>
              <p className="font-medium">Staff</p>
              <p className="mt-1 text-muted-foreground">
                Members, attendance, programmes, subscriptions, classes and payments.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[12.5px] text-muted-foreground">
                Deactivating revokes sign-in immediately but keeps everything they created —
                programmes, classes and notes stay on your gym&rsquo;s record.
              </p>
            </div>
          </div>
        </Section>
      </div>

      {/* Keyed so switching between "add" and a specific person remounts the
          form — otherwise useState initialisers keep the previous target's
          values and the wrong email gets submitted. */}
      <StaffFormDialog
        key={editing?.staffId ?? "new"}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(undefined);
        }}
        staff={editing}
        gymCode={gymCode}
      />

      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title={`Deactivate ${deactivating?.name}?`}
        description={
          deactivating
            ? `They lose access on their next request. Their ${deactivating.plans} programme${deactivating.plans === 1 ? "" : "s"} and ${deactivating.classes} class${deactivating.classes === 1 ? "" : "es"} stay exactly where they are, and you can restore access at any time.`
            : ""
        }
        confirmLabel="Deactivate access"
        destructive
        loading={pending}
        onConfirm={() => {
          if (!deactivating) return;
          run(() => setStaffActiveAction(deactivating.id, false), {
            onSuccess: () => {
              setDeactivating(null);
              router.refresh();
            },
          });
        }}
      />

      <Modal open={resetting !== null} onOpenChange={(open) => !open && setResetting(null)}>
        <ModalContent
          title={`New password for ${resetting?.name ?? ""}`}
          description="Set a temporary password and pass it on. They can change it from their settings."
        >
          <ModalBody>
            <Input
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-11 font-mono"
              minLength={8}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setResetting(null)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={newPassword.trim().length < 8}
              onClick={() => {
                if (!resetting) return;
                run(() => resetStaffPasswordAction(resetting.id, newPassword), {
                  onSuccess: () => {
                    setResetting(null);
                    setNewPassword("");
                    router.refresh();
                  },
                });
              }}
            >
              Set password
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
