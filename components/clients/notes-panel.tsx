"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Plus, Trash2 } from "lucide-react";
import { addNoteAction, deleteNoteAction } from "@/app/actions/notes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAction } from "@/components/ui/use-action";
import { formatDateTime } from "@/lib/format";

export type NoteItem = {
  id: string;
  note: string;
  createdAt: string;
};

export function NotesPanel({ clientId, notes }: { clientId: string; notes: NoteItem[] }) {
  const router = useRouter();
  const { pending, error, run, reset } = useAction();
  const [value, setValue] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  function submit(formData: FormData) {
    run(() => addNoteAction(formData), {
      onSuccess: () => {
        setValue("");
        router.refresh();
      },
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-3.5 py-2.5">
        <Lock className="size-3.5 shrink-0 text-[var(--warning)]" />
        <p className="text-[12.5px] font-medium text-[var(--warning)]">
          PRIVATE — TRAINER ONLY. Clients never see these notes.
        </p>
      </div>

      <form action={submit} className="space-y-3">
        <input type="hidden" name="clientId" value={clientId} />
        <FormError message={error} />
        <Textarea
          name="note"
          rows={3}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) reset();
          }}
          placeholder="Observations, coaching decisions, things to follow up on…"
          aria-label="New private note"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={pending} disabled={value.trim().length < 2}>
            <Plus /> Add note
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <EmptyState
          compact
          icon={Lock}
          title="No notes yet"
          description="Keep a private record of decisions, injuries and context you don't want to lose."
        />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{note.note}</p>
                <button
                  onClick={() => setDeleting(note.id)}
                  className="shrink-0 rounded-md p-1.5 text-[var(--subtle-foreground)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--danger)] focus-visible:opacity-100"
                  aria-label="Delete note"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="mt-2.5 text-[11.5px] text-[var(--subtle-foreground)]">
                {formatDateTime(note.createdAt)}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this note?"
        description="This removes the note permanently."
        confirmLabel="Delete note"
        destructive
        loading={pending}
        onConfirm={() => {
          const id = deleting;
          if (!id) return;
          run(() => deleteNoteAction(id), {
            onSuccess: () => {
              setDeleting(null);
              router.refresh();
            },
          });
        }}
      />
    </div>
  );
}
