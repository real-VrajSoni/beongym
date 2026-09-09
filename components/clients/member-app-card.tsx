"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { resetMemberPasswordAction } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/ui/section";
import { useAction } from "@/components/ui/use-action";

/**
 * The two codes a member signs into their app with, and the one thing the front
 * desk needs to be able to do about them.
 *
 * There is no self-serve reset — no email goes out from this product — so the
 * person at the desk sets a password and reads it out. Showing it in plain text
 * while it is being set is deliberate: it has to be spoken aloud to be useful,
 * and it is not a secret worth protecting from the person typing it.
 */
export function MemberAppCard({
  clientId,
  memberCode,
  gymCode,
  canEdit,
}: {
  clientId: string;
  memberCode: string;
  gymCode: string;
  canEdit: boolean;
}) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <Section title="Member app" bodyClassName="px-5 py-4">
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        They sign in with these two codes and a password you set. The app shows them their
        membership, dues, progress and programme — nothing about anyone else, and none of your
        staff notes.
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[11.5px] text-muted-foreground">Gym code</dt>
          <dd className="mt-0.5 font-mono text-[13.5px] font-medium">{gymCode}</dd>
        </div>
        <div>
          <dt className="text-[11.5px] text-muted-foreground">Member code</dt>
          <dd className="mt-0.5 font-mono text-[13.5px] font-medium">{memberCode}</dd>
        </div>
      </dl>

      {canEdit ? (
        open ? (
          <div className="mt-4 border-t border-[var(--border)] pt-3.5">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-10"
              aria-label="New app password"
            />
            <div className="mt-2.5 flex gap-2">
              <Button
                size="sm"
                loading={pending}
                disabled={password.trim().length < 8}
                onClick={() =>
                  run(() => resetMemberPasswordAction(clientId, password), {
                    onSuccess: () => {
                      setPassword("");
                      setOpen(false);
                    },
                  })
                }
              >
                Set password
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setPassword("");
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            className="mt-4"
            onClick={() => setOpen(true)}
          >
            <Smartphone /> Set app password
          </Button>
        )
      ) : null}
    </Section>
  );
}
