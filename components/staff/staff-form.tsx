"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { createStaffAction, updateStaffAction } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";

export type StaffFormValues = {
  staffId: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  role: string;
  specialization: string;
};

/** Readable temporary password the owner can dictate over a counter. */
function suggestPassword() {
  const words = ["squat", "bench", "press", "lunge", "plank", "rower", "chalk", "curl"];
  const word = words[Math.floor(Math.random() * words.length)];
  return `${word}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function StaffFormDialog({
  open,
  onOpenChange,
  staff,
  gymCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: StaffFormValues;
  gymCode: string;
}) {
  const router = useRouter();
  const { pending, error, fieldErrors, run, reset } = useAction();
  const isEdit = Boolean(staff);
  const [password, setPassword] = useState(suggestPassword);
  const [email, setEmail] = useState(staff?.email ?? "");
  const [copied, setCopied] = useState(false);

  function submit(formData: FormData) {
    run(() => (isEdit ? updateStaffAction(formData) : createStaffAction(formData)), {
      onSuccess: () => {
        onOpenChange(false);
        setPassword(suggestPassword());
        router.refresh();
      },
    });
  }

  async function copyCredentials() {
    try {
      await navigator.clipboard.writeText(
        `BeOnGym sign-in for ${gymCode}\nEmail: ${email}\nPassword: ${password}\nSign in at the Gym team tab.`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard can be blocked; the fields are on screen to read out anyway */
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <ModalContent
        size="lg"
        title={isEdit ? "Edit team member" : "Add a team member"}
        description={
          isEdit
            ? "Update their details or change what they can do."
            : "Create their login and hand them the credentials."
        }
      >
        <form action={submit}>
          <ModalBody className="space-y-4">
            <FormError message={error} />
            {isEdit ? <input type="hidden" name="staffId" value={staff!.staffId} /> : null}

            <FormGrid>
              <FormField label="Full name" htmlFor="staff-name" required error={fieldErrors.name}>
                <Input
                  id="staff-name"
                  name="name"
                  defaultValue={staff?.name}
                  placeholder="Farah Sheikh"
                  required
                />
              </FormField>
              <FormField label="Email" htmlFor="staff-email-field" required error={fieldErrors.email}>
                <Input
                  id="staff-email-field"
                  name="email"
                  type="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farah@yourgym.com"
                  required
                />
              </FormField>
              <FormField label="Phone" htmlFor="staff-phone" error={fieldErrors.phone}>
                <Input id="staff-phone" name="phone" defaultValue={staff?.phone} />
              </FormField>
              <FormField label="Job title" htmlFor="staff-title" error={fieldErrors.title}>
                <Input
                  id="staff-title"
                  name="title"
                  defaultValue={staff?.title}
                  placeholder="Front Desk Manager"
                />
              </FormField>
            </FormGrid>

            <FormField
              label="Access level"
              htmlFor="staff-role"
              required
              hint="Owners can also change branding, billing and the team. Staff cannot."
            >
              <Select id="staff-role" name="role" defaultValue={staff?.role ?? "GYM_STAFF"}>
                <option value="GYM_STAFF">Staff — day-to-day operations</option>
                <option value="GYM_OWNER">Owner — full control of this gym</option>
              </Select>
            </FormField>

            <FormField
              label="Specialisation"
              htmlFor="staff-spec"
              error={fieldErrors.specialization}
            >
              <Input
                id="staff-spec"
                name="specialization"
                defaultValue={staff?.specialization}
                placeholder="Strength & conditioning"
              />
            </FormField>

            {!isEdit ? (
              <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-[13px] font-medium">Their first password</p>
                <FormField htmlFor="staff-password" error={fieldErrors.password}>
                  <div className="flex gap-2">
                    <Input
                      id="staff-password"
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      className="font-mono"
                      required
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPassword(suggestPassword())}
                    >
                      New
                    </Button>
                  </div>
                </FormField>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    No email is sent — pass these on yourself. They sign in on the{" "}
                    <span className="font-medium text-foreground">Gym team</span> tab and can change
                    the password afterwards.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    onClick={copyCredentials}
                    disabled={!email}
                  >
                    {copied ? <Check /> : <Copy />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            ) : null}
          </ModalBody>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {isEdit ? "Save changes" : "Add to team"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
