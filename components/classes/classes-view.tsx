"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { deleteClassAction, saveClassAction } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { Section } from "@/components/ui/section";
import { useAction } from "@/components/ui/use-action";
import { DAY_LABELS } from "@/lib/labels";
import {
  CalendarSummary,
  ClassCalendar,
  type CalendarDayRow,
} from "./class-calendar";
import { cn } from "@/lib/utils";

export type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  dayOfWeek: number;
  /** Set for a one-off, which lives on the calendar rather than in the week. */
  date: string | null;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  isActive: boolean;
  coachId: string | null;
  coachName: string | null;
};

export type CoachOption = { id: string; name: string };

/**
 * Classes, in the two shapes an owner needs them.
 *
 * The calendar on top is what they plan against — the next fortnight, with
 * every occurrence, cancellation and one-off on it. The week underneath is
 * where the repeating shape of the timetable gets edited. Same classes, two
 * questions: "what is happening on the 14th" and "what do we run on Tuesdays".
 */
export function ClassesView({
  days,
  classes,
  coaches,
}: {
  days: CalendarDayRow[];
  classes: ClassRow[];
  coaches: CoachOption[];
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [oneOffDate, setOneOffDate] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const weekly = classes.filter((c) => c.date === null);
  const weekdays = [1, 2, 3, 4, 5, 6, 7];

  function openNew(date?: string) {
    setOneOffDate(date ?? null);
    setEditing(null);
    setCreating(true);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <CalendarSummary days={days} />
        <Button onClick={() => openNew()}>
          <Plus /> Add a class
        </Button>
      </div>

      <ClassCalendar days={days} onAddOneOff={(date) => openNew(date)} />

      <div className="mt-8">
        <Section
          title="The weekly timetable"
          description="Slots that repeat every week. Editing one changes every future occurrence."
          bodyClassName="px-4 py-4"
        >
          {weekly.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarRange}
              title="No repeating classes"
              description="Put your weekly slots up — spin, yoga, the 7am strength batch — with how many the room holds."
              action={<Button onClick={() => openNew()}>Add your first class</Button>}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-7">
              {weekdays.map((day) => {
                const inDay = weekly.filter((c) => c.dayOfWeek === day);
                return (
                  <div key={day} className="min-w-0">
                    <h3 className="mb-2 text-[11.5px] font-semibold tracking-wide text-[var(--subtle-foreground)] uppercase">
                      {DAY_LABELS[day]}
                    </h3>
                    <div className="space-y-2">
                      {inDay.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-[var(--border)] px-3 py-3 text-center text-[11.5px] text-[var(--subtle-foreground)]">
                          —
                        </p>
                      ) : (
                        inDay.map((c) => (
                          <div
                            key={c.id}
                            className={cn(
                              "rounded-xl border bg-[var(--surface)] p-3",
                              c.isActive
                                ? "border-[var(--border)]"
                                : "border-dashed border-[var(--border)] opacity-70",
                            )}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <p className="tabular text-[12px] font-semibold text-[var(--brand)]">
                                  {c.startTime}
                                </p>
                                <p className="truncate text-[13px] font-medium">{c.name}</p>
                              </div>
                              <Dropdown>
                                <DropdownTrigger asChild>
                                  <Button variant="ghost" size="iconSm" aria-label="Class actions">
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownTrigger>
                                <DropdownContent>
                                  <DropdownItem
                                    onSelect={() => {
                                      setCreating(false);
                                      setEditing(c);
                                    }}
                                  >
                                    <Pencil /> Edit class
                                  </DropdownItem>
                                  <DropdownItem destructive onSelect={() => setDeleting(c.id)}>
                                    <Trash2 /> Remove
                                  </DropdownItem>
                                </DropdownContent>
                              </Dropdown>
                            </div>

                            <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                              <Users className="size-3" />
                              {c.capacity} spots · {c.durationMinutes} min
                              {c.coachName ? ` · ${c.coachName.split(" ")[0]}` : ""}
                            </p>

                            {!c.isActive ? (
                              <Badge tone="outline" className="mt-2">
                                Paused
                              </Badge>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      <ClassDialog
        key={editing?.id ?? (creating ? `new-${oneOffDate ?? "weekly"}` : "closed")}
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
            setOneOffDate(null);
          }
        }}
        coaches={coaches}
        row={editing}
        defaultDate={oneOffDate}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove this class?"
        description="It comes off the timetable and its bookings go with it. Pause it instead if it is coming back."
        confirmLabel="Remove class"
        destructive
        loading={pending}
        onConfirm={() => {
          const id = deleting;
          if (!id) return;
          run(() => deleteClassAction(id), {
            onSuccess: () => {
              setDeleting(null);
              router.refresh();
            },
          });
        }}
      />
    </>
  );
}

function ClassDialog({
  open,
  onOpenChange,
  coaches,
  row,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coaches: CoachOption[];
  row: ClassRow | null;
  /** Set when the calendar's "Add" was used on a particular day. */
  defaultDate: string | null;
}) {
  const router = useRouter();
  const { pending, error, fieldErrors, run, reset } = useAction();
  // A class is either a repeating slot or a one-off; the form asks which first
  // because every other field reads differently depending on the answer.
  const [oneOff, setOneOff] = useState(Boolean(defaultDate || row?.date));

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <ModalContent
        title={row ? "Edit class" : oneOff ? "Add a one-off class" : "Add a class"}
        description="Members book their own spot inside the next fortnight."
      >
        <form
          action={(fd) =>
            run(() => saveClassAction(fd), {
              onSuccess: () => {
                onOpenChange(false);
                router.refresh();
              },
            })
          }
        >
          <ModalBody className="space-y-4">
            <FormError message={error} />
            {row ? <input type="hidden" name="classId" value={row.id} /> : null}

            <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
              {(
                [
                  [false, "Every week"],
                  [true, "One-off"],
                ] as const
              ).map(([value, labelText]) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setOneOff(value)}
                  aria-pressed={oneOff === value}
                  className={
                    oneOff === value
                      ? "rounded-lg bg-[var(--surface)] px-3 py-2 text-[13px] font-medium shadow-[var(--shadow-card)]"
                      : "rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                  }
                >
                  {labelText}
                </button>
              ))}
            </div>

            <FormField label="Name" htmlFor="name" required error={fieldErrors.name}>
              <Input id="name" name="name" defaultValue={row?.name} placeholder="Spin" required />
            </FormField>

            <FormGrid>
              {oneOff ? (
                <FormField label="Date" htmlFor="date" required error={fieldErrors.date}>
                  <DateField
                    id="date"
                    name="date"
                    defaultValue={row?.date ?? defaultDate ?? ""}
                    required
                  />
                </FormField>
              ) : (
                <FormField label="Day" htmlFor="dayOfWeek" required>
                  <Select id="dayOfWeek" name="dayOfWeek" defaultValue={String(row?.dayOfWeek ?? 1)}>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>
                        {DAY_LABELS[d]}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}
              <FormField label="Start time" htmlFor="startTime" required error={fieldErrors.startTime}>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  defaultValue={row?.startTime ?? "18:30"}
                  required
                />
              </FormField>
              <FormField label="Length" htmlFor="durationMinutes" required>
                <Select
                  id="durationMinutes"
                  name="durationMinutes"
                  defaultValue={String(row?.durationMinutes ?? 45)}
                >
                  {[30, 45, 60, 75, 90].map((d) => (
                    <option key={d} value={d}>
                      {d} minutes
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label="Capacity"
                htmlFor="capacity"
                required
                error={fieldErrors.capacity}
                hint="What the room holds."
              >
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min={1}
                  max={200}
                  defaultValue={row?.capacity ?? 12}
                  required
                />
              </FormField>
            </FormGrid>

            {/* A one-off takes its weekday from its date, but the field is still
                posted so the schema has one shape either way. */}
            {oneOff ? <input type="hidden" name="dayOfWeek" value={row?.dayOfWeek ?? 1} /> : null}

            <FormField label="Coach" htmlFor="coachId">
              <Select id="coachId" name="coachId" defaultValue={row?.coachId ?? ""}>
                <option value="">Nobody in particular</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={row?.description ?? ""}
                placeholder="45 minutes on the bikes, intervals throughout. Bring water."
              />
            </FormField>

            <label className="flex items-center gap-2.5 text-[13px]">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={row?.isActive ?? true}
                className="size-4 accent-[var(--brand)]"
              />
              Running — members can book it
            </label>
          </ModalBody>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {row ? "Save class" : "Add class"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
