"use client";

import { useRouter } from "next/navigation";
import { PricingTableOne } from "@/components/billingsdk/pricing-table-one";
import { plans } from "@/lib/billingsdk-config";

export function BillingPricingTable() {
	const router = useRouter();

	function selectPlan(
		_planId: string,
		billingInterval: "monthly" | "annually",
	) {
		const plan = billingInterval === "annually" ? "ANNUAL" : "MONTHLY";
		// The public pricing table begins the signup flow every time. Checkout is
		// reached only after account creation (or an existing prospect is sent
		// through the protected setup flow), never directly from this page.
		router.push(`/signup?plan=${plan}`);
	}

	return (
		<PricingTableOne
			plans={plans}
			title="Pick the Plan that fits your business"
			description="Everything is included. Pay month to month, or save when you choose a year."
			onPlanSelect={selectPlan}
			size="medium"
			theme="classic"
			className="mt-2 w-full"
		/>
	);
}
