"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { createAccountAction } from "@/app/actions/signup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneField } from "@/components/ui/phone-field";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { useAction } from "@/components/ui/use-action";
import { isPurchasable, planByKey } from "@/lib/platform-plans";

const INCLUDED = [
	"The account itself takes a minute",
	"Pick and pay for a plan on the next step",
	"Your gym is on the map straight after",
];

const CLAIM_INCLUDED = [
	"The account itself takes a minute",
	"Confirm the claim on the next step",
	"Then edit every detail on the listing",
];

export function SignupForm({
	plan,
	claim,
	next,
}: {
	plan?: string;
	claim?: string;
	next?: string;
}) {
	const { pending, error, fieldErrors, run } = useAction();
	// A stale link or an old bookmark can still name a retired plan. Honour only
	// what is on sale, so nobody is told they picked something they cannot buy
	// and then refused at the last step.
	const chosen = plan && isPurchasable(plan) ? planByKey(plan) : null;

	return (
		<div className="w-full max-w-[400px]">
			<div className="mb-7">
				<h2 className="text-[24px] leading-tight font-semibold tracking-tight">
					Create your account
				</h2>
				<p className="mt-1.5 text-[13.5px] text-muted-foreground">
					{claim
						? `Create an account to claim ${claim}. It takes a minute.`
						: chosen
							? `You picked ${chosen.name}. Create an account to continue.`
							: "One account, then choose the plan that fits your gym."}
				</p>
			</div>

			<form
				action={(fd) => run(() => createAccountAction(fd))}
				className="space-y-4"
			>
				{plan ? <input type="hidden" name="plan" value={plan} /> : null}
				{claim ? (
					<input type="hidden" name="claim" value={claim} />
				) : null}
				{next ? <input type="hidden" name="next" value={next} /> : null}
				<FormError message={error} />

				<FormGrid>
					<FormField
						label="Your name"
						htmlFor="name"
						required
						error={fieldErrors.name}
					>
						<Input
							id="name"
							name="name"
							placeholder="Rohit Malhotra"
							className="h-11"
							autoComplete="name"
							required
						/>
					</FormField>
					<FormField
						label="Phone"
						htmlFor="phone"
						required
						error={fieldErrors.phone}
						hint="Pick your country, then the number — this is how members and we reach you."
					>
						<PhoneField
							id="phone"
							name="phone"
							required
							className="[&_input]:h-11 [&_button]:h-11"
						/>
					</FormField>
				</FormGrid>

				<FormField
					label="Work email"
					htmlFor="email"
					required
					error={fieldErrors.email}
				>
					<Input
						id="email"
						name="email"
						type="email"
						autoCapitalize="none"
						autoComplete="email"
						placeholder="you@yourgym.com"
						className="h-11"
						required
					/>
				</FormField>

				<FormField
					label="Password"
					htmlFor="password"
					required
					error={fieldErrors.password}
					hint="At least 8 characters."
				>
					<Input
						id="password"
						name="password"
						type="password"
						autoComplete="new-password"
						minLength={8}
						className="h-11"
						required
					/>
				</FormField>

				<Button
					type="submit"
					size="lg"
					loading={pending}
					className="h-11 w-full"
				>
					{pending ? "Creating your account…" : "Continue"}
					{!pending ? <ArrowRight /> : null}
				</Button>
			</form>

			<ul className="mt-6 space-y-2">
				{(claim ? CLAIM_INCLUDED : INCLUDED).map((item) => (
					<li
						key={item}
						className="flex items-center gap-2 text-[12.5px] text-muted-foreground"
					>
						<Check className="size-3.5 shrink-0 text-[var(--success)]" />
						{item}
					</li>
				))}
			</ul>

			<div className="mt-7 border-t border-[var(--border)] pt-5">
				<p className="text-[13px] text-muted-foreground">
					Already have an account?{" "}
					<Link
						href="/login"
						className="font-medium text-[var(--brand)] hover:underline"
					>
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}
