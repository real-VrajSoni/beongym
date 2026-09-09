"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { DoorOpen, LogIn, LogOut, Search, Users } from "lucide-react";
import { checkInMemberAction, checkOutMemberAction } from "@/app/actions/attendance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalContent } from "@/components/ui/modal";
import { Section } from "@/components/ui/section";
import { useAction } from "@/components/ui/use-action";
import { formatTime } from "@/lib/format";

export type InsideRow = {
  id: string;
  memberId: string;
  name: string;
  memberCode: string;
  checkInAt: string;
  /** Pre-formatted on the server so hydration cannot disagree about "now". */
  sinceLabel: string;
  source: string;
};

export type VisitRow = Omit<InsideRow, "sinceLabel"> & { checkOutAt: string | null };
export type MemberOption = { id: string; name: string; memberCode: string };

const SOURCE_LABEL: Record<string, string> = {
  FRONT_DESK: "Front desk",
  MEMBER_APP: "App",
  TURNSTILE: "Turnstile",
};

export function AttendanceView({
  inside,
  recent,
  members,
}: {
  inside: InsideRow[];
  recent: VisitRow[];
  members: MemberOption[];
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const insideIds = useMemo(() => new Set(inside.map((i) => i.memberId)), [inside]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.memberCode.toLowerCase().includes(q))
      .slice(0, 40);
  }, [members, query]);

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-3">
        <Section
          title="On the floor now"
          description={`${inside.length} member${inside.length === 1 ? "" : "s"} inside`}
          action={
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              <LogIn /> Check in
            </Button>
          }
          bodyClassName="pb-1"
          className="lg:col-span-2"
        >
          {inside.length === 0 ? (
            <EmptyState
              compact
              icon={DoorOpen}
              title="Nobody is in right now"
              description="Check a member in from the front desk when they arrive."
              action={
                <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
                  Check someone in
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {inside.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-5 py-3">
                  <ClientAvatar name={row.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/gym/clients/${row.memberId}`}
                      className="block truncate text-[13.5px] font-medium hover:underline"
                    >
                      {row.name}
                    </Link>
                    <p className="truncate text-[12px] text-muted-foreground">
                      <span className="font-mono">{row.memberCode}</span> · in since{" "}
                      {formatTime(row.checkInAt)} ({row.sinceLabel})
                    </p>
                  </div>
                  <Badge tone="neutral">{SOURCE_LABEL[row.source] ?? row.source}</Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={pending}
                    onClick={() =>
                      run(() => checkOutMemberAction(row.id), {
                        onSuccess: () => router.refresh(),
                      })
                    }
                  >
                    <LogOut /> Out
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Recent visits" description="The last 40 people through the door" bodyClassName="pb-1">
          <ul className="max-h-[30rem] divide-y divide-[var(--border)] overflow-y-auto">
            {recent.map((row) => (
              <li key={row.id} className="px-5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[13px] font-medium">{row.name}</p>
                  <p className="tabular shrink-0 text-[11.5px] text-muted-foreground">
                    {format(new Date(row.checkInAt), "d MMM")}
                  </p>
                </div>
                <p className="tabular text-[11.5px] text-muted-foreground">
                  {formatTime(row.checkInAt)}
                  {row.checkOutAt ? ` → ${formatTime(row.checkOutAt)}` : " · still in"}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Modal open={pickerOpen} onOpenChange={setPickerOpen}>
        <ModalContent title="Check a member in" description="Search by name or member code.">
          <ModalBody className="space-y-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--subtle-foreground)]" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rahul, or M-0001"
                className="h-11 pl-9"
              />
            </div>

            {options.length === 0 ? (
              <EmptyState compact icon={Users} title="No member matches" />
            ) : (
              <ul className="max-h-80 divide-y divide-[var(--border)] overflow-y-auto rounded-lg border border-[var(--border)]">
                {options.map((m) => {
                  const already = insideIds.has(m.id);
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                      <ClientAvatar name={m.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{m.name}</p>
                        <p className="font-mono text-[11.5px] text-muted-foreground">
                          {m.memberCode}
                        </p>
                      </div>
                      {already ? (
                        <Badge tone="success" dot>
                          Inside
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          loading={pending}
                          onClick={() =>
                            run(() => checkInMemberAction(m.id), {
                              onSuccess: () => {
                                setPickerOpen(false);
                                setQuery("");
                                router.refresh();
                              },
                            })
                          }
                        >
                          Check in
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
