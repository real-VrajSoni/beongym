"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { loginAction, memberLoginAction, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError, FormField } from "@/components/ui/form-field";

/**
 * Two audiences, two credentials.
 *
 * Staff sign in with a work email. Members sign in with the two codes their gym
 * printed on their card, because a good share of them never gave the gym an
 * email address in the first place.
 */
const DEMO = [
  { label: "Platform admin", sub: "Runs every gym on BeOnGym", email: "admin@beongym.in" },
  { label: "Gym owner", sub: "Iron Temple Fitness", email: "rohit@irontemple.fit" },
  { label: "Gym staff", sub: "Head of coaching", email: "alex@irontemple.fit" },
];

function PasswordField({
  id,
  error,
  value,
  onChange,
}: {
  id: string;
  error?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <FormField label="Password" htmlFor={id} error={error}>
      <div className="relative">
        <Input
          id={id}
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-11 pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-[var(--subtle-foreground)] hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </FormField>
  );
}

function StaffForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState("rohit@irontemple.fit");
  const [password, setPassword] = useState("demo1234");

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError message={state.error} />

      <FormField label="Work email" htmlFor="staff-email" error={state.fieldErrors?.email}>
        <Input
          id="staff-email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="you@yourgym.com"
          className="h-11"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>

      <PasswordField
        id="staff-password"
        error={state.fieldErrors?.password}
        value={password}
        onChange={setPassword}
      />

      <Button type="submit" size="lg" loading={pending} className="h-11 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <div className="space-y-1.5 pt-1">
        {DEMO.map((d) => (
          <button
            key={d.email}
            type="button"
            onClick={() => {
              setEmail(d.email);
              setPassword("demo1234");
            }}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
          >
            <span className="min-w-0">
              <span className="block text-[12.5px] font-medium">{d.label}</span>
              <span className="block truncate text-[11.5px] text-muted-foreground">{d.sub}</span>
            </span>
            <span className="shrink-0 text-[11.5px] text-[var(--brand)]">Use</span>
          </button>
        ))}
      </div>
    </form>
  );
}

function MemberForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(memberLoginAction, {});
  const [gymCode, setGymCode] = useState("IRON-4821");
  const [memberCode, setMemberCode] = useState("M-0001");
  const [password, setPassword] = useState("demo1234");

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError message={state.error} />

      <FormField
        label="Gym code"
        htmlFor="member-gym"
        error={state.fieldErrors?.gymCode}
        hint="On your membership card, and on your gym's page."
      >
        <Input
          id="member-gym"
          name="gymCode"
          autoCapitalize="characters"
          placeholder="IRON-4821"
          className="h-11 font-mono"
          value={gymCode}
          onChange={(e) => setGymCode(e.target.value)}
        />
      </FormField>

      <FormField label="Member code" htmlFor="member-code" error={state.fieldErrors?.memberCode}>
        <Input
          id="member-code"
          name="memberCode"
          autoCapitalize="characters"
          placeholder="M-0042"
          className="h-11 font-mono"
          value={memberCode}
          onChange={(e) => setMemberCode(e.target.value)}
        />
      </FormField>

      <PasswordField
        id="member-password"
        error={state.fieldErrors?.password}
        value={password}
        onChange={setPassword}
      />

      <Button type="submit" size="lg" loading={pending} className="h-11 w-full">
        {pending ? "Signing in…" : "Open my gym app"}
      </Button>

      <p className="pt-1 text-[12px] leading-relaxed text-muted-foreground">
        Forgotten your codes? Your gym can read them out at the desk — and set you a new password
        while you are there.
      </p>
    </form>
  );
}

export function AuthPanel({ next, notice }: { next?: string; notice?: string | null }) {
  const [tab, setTab] = useState<"staff" | "member">(
    next?.startsWith("/me") ? "member" : "staff",
  );

  return (
    <div className="w-full max-w-[380px]">
      <div className="mb-6">
        <h2 className="text-[26px] leading-tight font-semibold tracking-tight">Welcome back</h2>
        <p className="mt-1.5 text-[13.5px] text-muted-foreground">
          {tab === "staff"
            ? "Sign in to your gym’s workspace."
            : "Sign in to your gym’s member app."}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
        {(
          [
            ["staff", "Gym team"],
            ["member", "Member"],
          ] as const
        ).map(([key, labelText]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={
              tab === key
                ? "rounded-lg bg-[var(--surface)] px-3 py-2 text-[13px] font-medium text-foreground shadow-[var(--shadow-card)]"
                : "rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
            }
          >
            {labelText}
          </button>
        ))}
      </div>

      {notice ? (
        <div className="mb-5 rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-3.5 py-2.5 text-[12.5px] text-[var(--warning)]">
          {notice}
        </div>
      ) : null}

      {tab === "staff" ? <StaffForm next={next} /> : <MemberForm next={next} />}

      <div className="mt-7 border-t border-[var(--border)] pt-5">
        <p className="text-[13px] text-muted-foreground">
          Running a gym and not on BeOnGym yet?{" "}
          <Link
            href="/signup"
            className="inline-flex items-center gap-1 font-medium text-[var(--brand)] hover:underline"
          >
            Create your gym
            <ArrowRight className="size-3.5" />
          </Link>
        </p>
        <p className="mt-2 text-[12px] text-[var(--subtle-foreground)]">
          Every demo account uses the password <span className="font-mono">demo1234</span>.
        </p>
      </div>
    </div>
  );
}
