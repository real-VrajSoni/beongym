import { redirect } from "next/navigation";
import { Gauge, Rocket, ShieldCheck, Smartphone } from "lucide-react";
import { SignupForm } from "@/components/auth/signup-form";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { Logo } from "@/components/brand/logo";
import { getValidSession, homeFor } from "@/lib/auth";
import { ENTRY_PRICE } from "@/lib/platform-plans";

export const metadata = { title: "Create your account" };

const POINTS = [
	{
		icon: Rocket,
		title: "Live in under two minutes",
		body: "Your gym code, dashboard and three starter plans are ready the moment you sign up.",
	},
	{
		icon: Smartphone,
		title: "Your members, on your roster",
		body: "Auto-generated member codes, plans, dues and progress — no logins to hand out or reset.",
	},
	{
		icon: Gauge,
		title: "Numbers that matter, daily",
		body: "Collections, renewals, attendance and who needs a nudge.",
	},
	{
		icon: ShieldCheck,
		title: "Your data stays yours",
		body: "Every gym is isolated. Staff never see another gym's members.",
	},
];

export default async function SignupPage({
	searchParams,
}: {
	searchParams: Promise<{ plan?: string; claim?: string; next?: string }>;
}) {
	const session = await getValidSession();
	if (session) redirect(homeFor(session.role));
	const { plan, claim, next } = await searchParams;

	return (
		<div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
			<AuthBackdrop
				eyebrow="Get on the map"
				headline={
					<>
						Bring your whole gym
						<br />
						online today.
					</>
				}
				sub="Stop running your gym from a paper register and a WhatsApp group. BeOnGym gives you the front desk, the memberships, the diary and your pin on the world map, in one place."
				points={POINTS}
				footer={`From $${ENTRY_PRICE} · No free tier · Nothing charged until the gateway is live`}
			/>

			<div className="flex flex-col items-center justify-center px-6 py-12">
				<div className="mb-9 lg:hidden">
					<Logo />
				</div>
				<SignupForm plan={plan} claim={claim} next={next} />
			</div>
		</div>
	);
}
