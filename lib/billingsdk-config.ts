import { INCLUDED, PURCHASABLE_PLANS } from "@/lib/platform-plans";

export type PlanFeature = {
	name: string;
};

export type Plan = {
	id: string;
	title: string;
	monthlyPrice: string;
	yearlyPrice: string;
	currency: string;
	features: PlanFeature[];
	buttonText: string;
	highlight?: boolean;
};

const monthly = PURCHASABLE_PLANS.find((plan) => plan.key === "MONTHLY");
const annual = PURCHASABLE_PLANS.find((plan) => plan.key === "ANNUAL");

export const plans: Plan[] = [
	{
		id: "platform",
		title: "BeOnGym",
		monthlyPrice: monthly ? String(monthly.price) : "20",
		yearlyPrice: annual ? String(annual.price) : "149",
		currency: "$",
		features: INCLUDED.map((name) => ({ name })),
		buttonText: "Choose this plan",
		highlight: true,
	},
];
