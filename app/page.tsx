import Link from "next/link";
import { redirect } from "next/navigation";
import {
	ArrowRight,
	Building2,
	Check,
	CreditCard,
	Lock,
	ShieldCheck,
	Smartphone,
	UserCog,
	Users,
} from "lucide-react";
import { getValidSession, homeFor } from "@/lib/auth";
import { getLiveStatsAction } from "@/app/actions/stats";
import { listGyms } from "@/lib/data/directory";
import { BRAND, SELLER } from "@/lib/brand";
import { ENTRY_PRICE, planByKey } from "@/lib/platform-plans";
import { Logo, LogoMark } from "@/components/brand/logo";
import { BillingPricingTable } from "@/components/marketing/billing-pricing-table";
import { ThemeSwitch } from "@/components/brand/theme-switch";
import { Testimonials } from "@/components/marketing/testimonials";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { Faq, type FaqItem } from "@/components/marketing/faq";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Pillars } from "@/components/marketing/pillars";
import { HeroAmbience } from "@/components/marketing/hero-ambience";
import { GlobeBand, HOMEPAGE_GYMS } from "@/components/marketing/globe-band";
import { Niches } from "@/components/marketing/niches";

export const metadata = {
	title: `${BRAND.name} — Gym management software`,
	description:
		"Replace the register, the spreadsheet, the payment notebook and the attendance sheet with one system. Members, payments, attendance, renewals and enquiries for gyms and studios.",
};

const STEPS = [
	{
		n: "01",
		title: "Create your account",
		body: "Name, email, password. Thirty seconds, no card.",
		icon: UserCog,
	},
	{
		n: "02",
		title: "Pay for your window",
		body: `$${ENTRY_PRICE} for a month, or $${planByKey("ANNUAL").price} for the year and two months of it free.`,
		icon: CreditCard,
	},
	{
		n: "03",
		title: "Your gym is set up",
		body: "A gym code, your dashboard, and six membership plans already written for you to rename and reprice.",
		icon: Building2,
	},
	{
		n: "04",
		title: "Move your members over",
		body: "Add them from the register, put each on a plan, print the check-in code and you are running.",
		icon: Users,
	},
];

const PORTALS = [
	{
		icon: Building2,
		name: "One place for the desk",
		body: "Whoever is on shift sees the same roster, the same attendance and the same classes — no version of the register that only lives on one phone.",
		points: [
			"Members and attendance",
			"Classes and enquiries",
			"Payments and collections",
		],
	},
	{
		icon: Smartphone,
		name: "Staff see the floor, not the books",
		body: "Your team checks members in, adds enquiries and runs classes. Revenue, billing and who is on staff stay yours alone.",
		points: [
			"Separate staff logins",
			"Revenue stays owner-only",
			"Switch access off in a click",
		],
	},
	{
		icon: ShieldCheck,
		name: "Your gym's data is yours",
		body: "No other gym on BeOnGym can see your members, your takings or your numbers — and the notes your coaches write stay inside your team.",
		points: [
			"Walled off from other gyms",
			"Private staff notes",
			"Automated checks on every release",
		],
	},
];

const FAQ: FaqItem[] = [
	{
		q: `What is ${BRAND.name}?`,
		a: `${BRAND.name} is software for running a gym or studio: your members, what they pay, whether they turn up, when their membership runs out, and the enquiries you have not called back. It replaces the register, the payment notebook, the attendance sheet and the spreadsheet with one screen your whole desk can see.`,
	},
	{
		q: "Is there a free plan?",
		a: `No, and that is deliberate. Every gym on the map has paid to be there, which is what keeps the map worth searching. The cheapest way in is $${ENTRY_PRICE} for 30 days, and it unlocks everything — there is no cut-down version of the product.`,
	},
	{
		q: "What happens after 30 days?",
		a: "Your access ends and your gym comes off the public map until you renew. Nothing is deleted: your members, payments and attendance history are exactly where you left them, and renewing puts you straight back in. You can buy the next window before the current one ends — it starts the day the old one finishes, so no day is ever wasted.",
	},
	{
		q: "How much does it cost?",
		a: `One price worldwide, quoted in US dollars: $${ENTRY_PRICE} for 30 days, or $${planByKey("ANNUAL").price} for a year — ten months' money for twelve months' access. Both buy exactly the same product. Local tax — GST, VAT, sales tax — is worked out from your country by the payment provider at checkout.`,
	},
	{
		q: "Do my members get an app?",
		a: "Yes, in your gym's name and colours. They sign in with your gym code and the member code you issued, and they see their own membership, what they owe, their attendance and their training plan — nothing about anyone else, and none of your staff notes. The only thing they can change is their own class booking, where the room's capacity answers instead of a person. You set their password from their page in seconds.",
	},
	{
		q: "Will this create more work for my front desk?",
		a: "That is the thing it is designed against. Members cannot request, message or ask for anything through it — the one thing they can do is take a spot in a class, where capacity decides and nobody has to answer. Everything else is your team writing down what already happened.",
	},
	{
		q: "Do the WhatsApp reminders send themselves?",
		a: "Not yet, and the page says so. BeOnGym works out who is due — expiring memberships, outstanding dues, birthdays — writes the message and hands you a link that opens WhatsApp with the text already in it. You press send, from your own number, which is the number your members recognise. Automatic sending needs a WhatsApp Business account and is not connected.",
	},
	{
		q: "How do I pay?",
		a: "Plans are paid through Dodo Payments' secure hosted checkout. Eligible customers in India can pay in INR with UPI, credit or debit cards; available options elsewhere are shown by Dodo at checkout. We never receive your payment details, and access is granted only after Dodo sends a verified payment confirmation.",
	},
	{
		q: "Is my gym's data private?",
		a: "Completely. Your gym is walled off from every other gym on BeOnGym — no rival owner can see your members, your revenue or your dashboard. Passwords are stored as a one-way scramble that nobody here can read, and the notes your team keeps stay staff-only, hidden even from your own front desk. These boundaries are enforced by automated tests that fail the build if any of them ever breaks.",
	},
];

export default async function LandingPage() {
	const [session, stats, allGyms] = await Promise.all([
		getValidSession(),
		getLiveStatsAction(),
		listGyms(),
	]);
	// The homepage shows a handful, not the whole directory: nine pins read as a
	// world with gyms on it, ninety read as noise.
	const gyms = allGyms.slice(0, HOMEPAGE_GYMS * 2);
	// Signed-in users have somewhere better to be — except a prospect, who is
	// mid-funnel and may well be back here to compare plans.
	if (session && session.role !== "PROSPECT") redirect(homeFor(session.role));
	const signedIn = Boolean(session);

	return (
		<div className="min-h-dvh bg-[var(--mk-bg)] text-[var(--mk-fg)]">
			<header className="sticky top-0 z-40 border-b border-[var(--mk-border)] bg-[var(--mk-bg)]/85 backdrop-blur">
				<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
					<Logo />
					{/* Six destinations: the five sections of the page in the order they
              appear, then the directory. The gaps tighten a step at a time as
              the row fills, so nothing wraps against the buttons on the right. */}
					<nav className="hidden items-center gap-4 text-[13.5px] whitespace-nowrap text-[var(--mk-fg-muted)] lg:flex xl:gap-6">
						<a href="#what" className="hover:text-[var(--mk-fg)]">
							What it replaces
						</a>
						<a
							href="#features"
							className="hover:text-[var(--mk-fg)]"
						>
							Features
						</a>
						<a href="#who" className="hover:text-[var(--mk-fg)]">
							Who it&rsquo;s for
						</a>
						<a href="#how" className="hover:text-[var(--mk-fg)]">
							How it works
						</a>
						<a
							href="#pricing"
							className="hover:text-[var(--mk-fg)]"
						>
							Pricing
						</a>
						<Link
							href="/gyms"
							className="hover:text-[var(--mk-fg)]"
						>
							Find a gym
						</Link>
					</nav>
					<div className="flex items-center gap-2">
						<ThemeSwitch />
						<Link
							href="/login"
							className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-[var(--mk-fg-muted)] hover:bg-[var(--mk-panel-strong)] hover:text-[var(--mk-fg)]"
						>
							Sign in
						</Link>
						<Link
							// Straight to the page with the Pay button. Somebody signed in
							// with no gym has already chosen; sending them back to the plan
							// list is a detour they have to walk twice. The checkout page
							// still offers "Choose a different plan" for anyone who wants it.
							href={
								signedIn
									? "/start/checkout?plan=MONTHLY"
									: "/signup"
							}
							className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3.5 py-2 text-[13.5px] font-medium text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
						>
							{signedIn ? "Finish setup" : "Get started"}
							<ArrowRight className="size-3.5" />
						</Link>
					</div>
				</div>
			</header>

			{/* Hero */}
			<section className="relative overflow-hidden">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0"
					style={{ background: "var(--mk-hero)" }}
				/>
				{/* The columns either side of a centred headline were dead space. They
            now hold the paper the headline is about. */}
				<HeroAmbience />
				<div className="relative mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
					<span className="inline-flex items-center gap-2 rounded-full border border-[var(--mk-border-strong)] bg-[var(--mk-panel-strong)] px-3.5 py-1.5 text-[11.5px] font-semibold tracking-[0.16em] text-[var(--mk-fg-muted)] uppercase backdrop-blur">
						For gyms and studios
					</span>
					<h1 className="mt-7 text-[38px] leading-[1.08] font-semibold tracking-[-0.03em] sm:text-[56px]">
						Run your gym like
						<br />
						it&rsquo;s 2026.
					</h1>
					<p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-[var(--mk-fg-muted)]">
						The register, the spreadsheet, the payment notebook, the
						attendance sheet and the follow-ups nobody remembers —
						one system instead of five, so you can see who owes you,
						who has stopped coming, and who is about to run out.
					</p>
					<div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Link
							// Straight to the page with the Pay button. Somebody signed in
							// with no gym has already chosen; sending them back to the plan
							// list is a detour they have to walk twice. The checkout page
							// still offers "Choose a different plan" for anyone who wants it.
							href={
								signedIn
									? "/start/checkout?plan=MONTHLY"
									: "/signup"
							}
							className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-6 text-[15px] font-medium text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)] sm:w-auto"
						>
							Start running your gym on it — ${ENTRY_PRICE}{" "}
							<ArrowRight className="size-4" />
						</Link>
						<a
							href="#what"
							className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[var(--mk-border-strong)] bg-[var(--mk-panel-strong)] px-6 text-[15px] font-medium text-[var(--mk-fg)] hover:border-[var(--brand)]/50 sm:w-auto"
						>
							See what it replaces
						</a>
					</div>
					<p className="mt-5 text-[12.5px] text-[var(--mk-fg-subtle)]">
						${ENTRY_PRICE} for 30 days · Everything included ·
						Cancel by simply not renewing
					</p>
				</div>
			</section>

			{/* The map leads. It is the thing nobody else has, and the thing people
          arrive wanting to look at — so it comes before the argument about
          registers and payment notebooks rather than after it. */}
			<GlobeBand gyms={gyms} initialStats={stats} />

			<Pillars />

			{/* Two experiences */}
			<section className="border-t border-[var(--mk-border)] bg-[var(--mk-panel)]">
				<div className="mx-auto max-w-7xl px-6 py-20">
					<div className="max-w-2xl">
						<p className="text-[11.5px] font-semibold tracking-[0.18em] text-[var(--mk-fg-subtle)] uppercase">
							What you open in the morning
						</p>
						<h2 className="mt-3 text-[32px] leading-tight font-semibold tracking-[-0.02em]">
							Who owes you, who has stopped coming, who is due a
							call.
						</h2>
						<p className="mt-4 text-[15px] leading-relaxed text-[var(--mk-fg-muted)]">
							One screen that answers the three questions a gym
							owner actually has each morning — instead of three
							books that each answer one.
						</p>
					</div>

					{/* The owner's dashboard, which is the whole product */}
					<div className="mt-10 mb-16 lg:mb-8">
						<DashboardPreview />
					</div>

					<div className="grid gap-6 sm:grid-cols-3">
						{PORTALS.map(({ icon: Icon, name, body, points }) => (
							<div
								key={name}
								className="rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-bg)] p-6"
							>
								<span className="flex size-9 items-center justify-center rounded-xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel-strong)] text-[var(--brand)]">
									<Icon className="size-4" />
								</span>
								<h3 className="mt-4 text-[15px] font-semibold">
									{name}
								</h3>
								<p className="mt-2 text-[13.5px] leading-relaxed text-[var(--mk-fg-muted)]">
									{body}
								</p>
								<ul className="mt-4 space-y-1.5">
									{points.map((pt) => (
										<li
											key={pt}
											className="flex items-center gap-2 text-[12.5px] text-[var(--mk-fg-subtle)]"
										>
											<Check className="size-3 shrink-0 text-[var(--success)]" />
											{pt}
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* How it works */}
			<section
				id="how"
				className="scroll-mt-20 border-t border-[var(--mk-border)]"
			>
				<div className="mx-auto max-w-7xl px-6 py-20">
					<p className="text-[11.5px] font-semibold tracking-[0.18em] text-[var(--mk-fg-subtle)] uppercase">
						Get going in minutes
					</p>
					<h2 className="mt-3 text-[32px] leading-tight font-semibold tracking-[-0.02em]">
						From the register to running it, this afternoon.
					</h2>

					<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{STEPS.map(({ n, title, body, icon: Icon }) => (
							<div
								key={n}
								className="rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] p-6"
							>
								<div className="flex items-center justify-between">
									<span className="flex size-9 items-center justify-center rounded-xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel-strong)] text-[var(--brand)]">
										<Icon className="size-4" />
									</span>
									<span className="font-mono text-[13px] text-[var(--mk-fg-subtle)]">
										{n}
									</span>
								</div>
								<h3 className="mt-4 text-[15px] font-semibold">
									{title}
								</h3>
								<p className="mt-2 text-[13px] leading-relaxed text-[var(--mk-fg-muted)]">
									{body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			<FeatureGrid />

			<Niches />

			<Testimonials />

			{/* Pricing */}
			<section
				id="pricing"
				className="scroll-mt-20 border-t border-[var(--mk-border)]"
			>
				<div className="mx-auto max-w-7xl px-6 py-20">
					<div className="text-center">
						<p className="text-[11.5px] font-semibold tracking-[0.18em] text-[var(--mk-fg-subtle)] uppercase">
							Pricing
						</p>
						<h2 className="mt-3 text-[34px] leading-[1.1] font-semibold tracking-[-0.02em]">
							Less than one member&rsquo;s monthly fee.
						</h2>
						<p className="mx-auto mt-4 max-w-2xl text-[15.5px] leading-relaxed text-[var(--mk-fg-muted)]">
							Everything is in both plans — members, payments,
							attendance, renewals, enquiries, classes, staff and
							your pin on the map. There is no tier above yours
							holding something back. The only choice is how long
							it runs for.
						</p>

						{/* The three objections a gym owner actually has, answered before
                they read a price. Vague reassurance persuades nobody; these are
                the specific things people ask on the phone. */}
						<ul className="mx-auto mt-7 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-[13.5px] text-[var(--mk-fg-muted)]">
							{[
								"Unlimited members and staff",
								"No commission on anything you charge",
								"Nothing renews on its own",
								"Cancel by not paying again",
							].map((line) => (
								<li
									key={line}
									className="flex items-center gap-1.5"
								>
									<Check className="size-3.5 text-[var(--success)]" />
									{line}
								</li>
							))}
						</ul>
					</div>

					<BillingPricingTable />

					{/* Why the free tier is gone. Said plainly, because a gym owner who
              feels handled stops reading. */}
					<div className="mt-6 grid gap-4 rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] p-6 sm:grid-cols-3 sm:p-8">
						<div className="sm:col-span-3">
							<h3 className="text-[17px] font-semibold">
								Why there is no free plan
							</h3>
						</div>
						{[
							[
								"A free plan is a plan nobody moves onto",
								`Putting a gym's whole membership list into a system is a real afternoon's work, and free tools get abandoned halfway through it. $${ENTRY_PRICE} is a low enough bar to clear in a minute and a high enough one that the move actually gets finished.`,
							],
							[
								"No feature held back to sell you later",
								"Every plan is the whole product. Nothing in here is greyed out waiting for an upgrade, and we are never designing a feature to be annoying enough that you pay more.",
							],
							[
								"We would rather charge than sell you",
								`$${ENTRY_PRICE} a month is the whole business model. No ads, no selling your members' details, no commission on what your members pay you. You are the customer, not the inventory.`,
							],
						].map(([title, body]) => (
							<div key={title}>
								<p className="text-[14px] font-semibold">
									{title}
								</p>
								<p className="mt-2 text-[13px] leading-relaxed text-[var(--mk-fg-muted)]">
									{body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* FAQ */}
			<section
				id="faq"
				className="scroll-mt-20 border-t border-[var(--mk-border)] bg-[var(--mk-panel)]"
			>
				<div className="mx-auto max-w-3xl px-6 py-20">
					<h2 className="text-[32px] leading-tight font-semibold tracking-[-0.02em]">
						Frequently asked
					</h2>

					<Faq items={FAQ} />
				</div>
			</section>

			{/* CTA */}
			<section className="border-t border-[var(--mk-border)]">
				<div className="mx-auto max-w-4xl px-6 py-20 text-center">
					<LogoMark className="mx-auto size-9 text-[var(--brand)]" />
					<h2 className="mt-6 text-[32px] leading-tight font-semibold tracking-[-0.02em]">
						Put the register down.
					</h2>
					<p className="mx-auto mt-4 max-w-md text-[15px] text-[var(--mk-fg-muted)]">
						${ENTRY_PRICE} and an afternoon moves your members
						across. Tomorrow morning you open one screen instead of
						four books.
					</p>
					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Link
							// Straight to the page with the Pay button. Somebody signed in
							// with no gym has already chosen; sending them back to the plan
							// list is a detour they have to walk twice. The checkout page
							// still offers "Choose a different plan" for anyone who wants it.
							href={
								signedIn
									? "/start/checkout?plan=MONTHLY"
									: "/signup"
							}
							className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-6 text-[15px] font-medium text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)] sm:w-auto"
						>
							Get started — ${ENTRY_PRICE}{" "}
							<ArrowRight className="size-4" />
						</Link>
						<Link
							href="/login"
							className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-[var(--mk-border-strong)] bg-[var(--mk-panel-strong)] px-6 text-[15px] font-medium text-[var(--mk-fg)] hover:bg-[var(--mk-panel-strong)] sm:w-auto"
						>
							I already have an account
						</Link>
					</div>
				</div>
			</section>

			<footer className="border-t border-[var(--mk-border)]">
				<div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-[12.5px] text-[var(--mk-fg-subtle)] sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2.5">
						<LogoMark className="size-5" />
						<p>
							© {new Date().getFullYear()} {BRAND.name}. Software
							for running a gym.
						</p>
					</div>
					<div className="flex flex-wrap gap-5">
						<a
							href="#what"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							What it replaces
						</a>
						<a
							href="#features"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							Features
						</a>
						<a
							href="#who"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							Who it&rsquo;s for
						</a>
						<a
							href="#how"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							How it works
						</a>
						<a
							href="#pricing"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							Pricing
						</a>
						<a
							href="#faq"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							FAQ
						</a>
						<Link
							href="/gyms"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							Find a gym
						</Link>
						<Link
							href="/list"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							List a gym
						</Link>
						<Link
							href="/login"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							Sign in
						</Link>
					</div>
				</div>

				{/* A policy nobody can find is not published. These sit on their own
            row so they read as the legal footer rather than as more navigation,
            and so a payment provider checking the site finds all four at once. */}
				<div className="mx-auto max-w-7xl px-6">
					<div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--mk-border)] pt-5 text-[12.5px] text-[var(--mk-fg-subtle)]">
						<Link
							href="/terms"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							Terms of Service
						</Link>
						<Link
							href="/privacy"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							Privacy Policy
						</Link>
						<Link
							href="/refunds"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							Refunds &amp; Cancellation
						</Link>
						<Link
							href="/contact"
							className="hover:text-[var(--mk-fg-muted)]"
						>
							Contact
						</Link>
						<span className="ml-auto">
							Operated by {SELLER.entity}, {SELLER.describedAs},
							in {SELLER.country}.
						</span>
					</div>
				</div>
				<div className="mx-auto max-w-7xl px-6 pb-8">
					<p className="flex items-start gap-1.5 text-[11.5px] text-[var(--mk-fg-subtle)]">
						<Lock className="mt-0.5 size-3 shrink-0" />
						Plans use Dodo Payments&rsquo; secure checkout,
						including eligible INR and UPI payments in India.
						Automatic WhatsApp sending is not connected yet: today
						we write the message for you and leave you to press
						send.
					</p>
				</div>
			</footer>
		</div>
	);
}
