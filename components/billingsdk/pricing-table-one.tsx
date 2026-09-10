"use client";

import { Check, Zap } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Plan } from "@/lib/billingsdk-config";
import { cn } from "@/lib/utils";

const sectionVariants = cva("py-32", {
	variants: {
		size: {
			small: "py-6 md:py-12",
			medium: "py-10 md:py-20",
			large: "py-16 md:py-32",
		},
		theme: {
			minimal: "",
			classic:
				"bg-gradient-to-b from-background to-muted/20 relative overflow-hidden",
		},
	},
	defaultVariants: {
		size: "medium",
		theme: "minimal",
	},
});

const titleVariants = cva("text-pretty text-left font-bold", {
	variants: {
		size: {
			small: "text-3xl lg:text-4xl",
			medium: "text-4xl lg:text-5xl",
			large: "text-4xl lg:text-6xl",
		},
		theme: {
			minimal: "",
			classic:
				"text-center bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent p-1",
		},
	},
	defaultVariants: {
		size: "large",
		theme: "minimal",
	},
});

const descriptionVariants = cva("text-muted-foreground max-w-3xl", {
	variants: {
		size: {
			small: "text-base lg:text-lg",
			medium: "text-lg lg:text-xl",
			large: "lg:text-xl",
		},
		theme: {
			minimal: "text-left",
			classic: "text-center mx-auto",
		},
	},
	defaultVariants: {
		size: "large",
		theme: "minimal",
	},
});

const cardVariants = cva(
	"flex w-full flex-col rounded-lg border text-left h-full transition-all duration-300",
	{
		variants: {
			size: {
				small: "p-4",
				medium: "p-5",
				large: "p-6",
			},
			theme: {
				minimal: "",
				classic:
					"relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.035] shadow-[0_12px_42px_-28px_hsl(var(--foreground)/0.6)] backdrop-blur-sm hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_60px_-28px_hsl(var(--primary)/0.45)]",
			},
			highlight: {
				true: "",
				false: "",
			},
		},
		compoundVariants: [
			{
				theme: "classic",
				highlight: true,
				className:
					"border-primary/50 bg-gradient-to-br from-primary/20 via-violet-500/10 to-cyan-400/10 ring-1 ring-primary/35 shadow-[0_24px_70px_-32px_hsl(var(--primary)/0.7)]",
			},
			{
				theme: "minimal",
				highlight: true,
				className: "bg-muted",
			},
		],
		defaultVariants: {
			size: "large",
			theme: "minimal",
			highlight: false,
		},
	},
);

const priceTextVariants = cva("font-medium", {
	variants: {
		size: {
			small: "text-3xl",
			medium: "text-4xl",
			large: "text-4xl",
		},
		theme: {
			minimal: "",
			classic:
				"text-5xl font-extrabold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent",
		},
	},
	defaultVariants: {
		size: "large",
		theme: "minimal",
	},
});

const featureIconVariants = cva("flex-none h-[1lh]", {
	variants: {
		size: {
			small: "size-3",
			medium: "size-4",
			large: "size-4",
		},
		theme: {
			minimal: "text-primary",
			classic: "text-emerald-500",
		},
	},
	defaultVariants: {
		size: "large",
		theme: "minimal",
	},
});

const highlightBadgeVariants = cva("mb-8 block w-fit", {
	variants: {
		theme: {
			minimal: "",
			classic:
				"border-primary/30 bg-gradient-to-r from-primary via-violet-500 to-cyan-500 text-primary-foreground shadow-lg",
		},
	},
	defaultVariants: {
		theme: "minimal",
	},
});

const toggleVariants = cva(
	"flex h-11 w-fit shrink-0 items-center rounded-md p-1 text-lg",
	{
		variants: {
			theme: {
				minimal: "bg-muted",
				classic:
					"bg-muted/50 backdrop-blur-sm border border-border/50 shadow-lg",
			},
		},
		defaultVariants: {
			theme: "minimal",
		},
	},
);

const buttonVariants = cva(
	"gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-300",
	{
		variants: {
			theme: {
				minimal:
					"shadow hover:bg-primary/90 h-9 py-2 group bg-primary text-primary-foreground ring-primary before:from-primary-foreground/20 after:from-primary-foreground/10 relative isolate inline-flex w-full items-center justify-center overflow-hidden rounded-md px-3 text-left text-sm font-medium ring-1 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-md before:bg-gradient-to-b before:opacity-80 before:transition-opacity before:duration-300 before:ease-[cubic-bezier(0.4,0.36,0,1)] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-md after:bg-gradient-to-b after:to-transparent after:mix-blend-overlay hover:cursor-pointer",
				classic:
					"relative overflow-hidden border border-primary/30 bg-gradient-to-r from-primary via-violet-500 to-cyan-500 px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95",
			},
		},
		defaultVariants: {
			theme: "minimal",
		},
	},
);

export interface PricingTableOneProps extends VariantProps<
	typeof sectionVariants
> {
	className?: string;
	plans: Plan[];
	title?: string;
	description?: string;
	onPlanSelect?: (
		planId: string,
		billingInterval: "monthly" | "annually",
	) => void;
}

export function PricingTableOne({
	className,
	plans,
	title,
	description,
	onPlanSelect,
	size,
	theme = "minimal",
}: PricingTableOneProps) {
	const [isAnnually, setIsAnnually] = useState(false);
	const reduceMotion = useReducedMotion();

	function calculateDiscount(
		monthlyPrice: string,
		yearlyPrice: string,
	): number {
		const monthly = parseFloat(monthlyPrice);
		const yearly = parseFloat(yearlyPrice);

		if (
			monthlyPrice.toLowerCase() === "custom" ||
			yearlyPrice.toLowerCase() === "custom" ||
			isNaN(monthly) ||
			isNaN(yearly) ||
			monthly === 0
		) {
			return 0;
		}

		const discount = ((monthly * 12 - yearly) / (monthly * 12)) * 100;
		return Math.round(discount);
	}

	const yearlyPriceDiscount = plans.length
		? Math.max(
				...plans.map((plan) =>
					calculateDiscount(plan.monthlyPrice, plan.yearlyPrice),
				),
			)
		: 0;

	return (
		<section className={cn(sectionVariants({ size, theme }), className)}>
			{/* Classic theme background elements */}
			{theme === "classic" && (
				<>
					<div className="bg-grid-pattern absolute inset-0 opacity-5" />
					<div className="bg-primary/5 absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
					<div className="bg-secondary/5 absolute top-1/4 right-1/4 h-64 w-64 rounded-full blur-2xl" />
				</>
			)}

			<div className={cn("relative container", "p-0 md:p-[1rem]")}>
				<div className="mx-auto flex max-w-7xl flex-col gap-6">
					<div
						className={cn(
							"flex flex-col gap-4",
							theme === "classic" && "text-center",
						)}
					>
						<h2 className={cn(titleVariants({ size, theme }))}>
							{title || "Pricing"}
						</h2>
					</div>

					<div
						className={cn(
							"flex flex-col justify-between gap-5 md:gap-10",
							theme === "classic"
								? "md:flex-col md:items-center"
								: "md:flex-row",
						)}
					>
						<p className={cn(descriptionVariants({ size, theme }))}>
							{description ||
								"Transparent pricing with no hidden fees. Upgrade or downgrade anytime."}
						</p>
						<div
							className={cn(
								toggleVariants({ theme }),
								theme === "classic" && "mx-auto",
							)}
						>
							<button
								type="button"
								aria-pressed={!isAnnually}
								onClick={() => setIsAnnually(false)}
								className={cn(
									"h-full rounded-md px-3 font-semibold transition-all md:px-7",
									!isAnnually
										? "bg-background text-primary"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								Monthly
							</button>
							<button
								type="button"
								aria-pressed={isAnnually}
								onClick={() => setIsAnnually(true)}
								className={cn(
									"flex h-full items-center gap-1 rounded-md px-3 font-semibold transition-all md:px-7",
									isAnnually
										? "bg-background text-primary"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								Yearly
								{yearlyPriceDiscount > 0 && (
									<span className="ml-1 rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium">
										Save {yearlyPriceDiscount}%
									</span>
								)}
							</button>
						</div>
					</div>

					<div className="flex w-full flex-col items-stretch gap-6 md:flex-row md:items-stretch">
						{plans.map((plan, index) => (
							<motion.div
								key={plan.id}
								layout
								initial={
									reduceMotion
										? false
										: { opacity: 0, y: 20, scale: 0.98 }
								}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								whileHover={
									reduceMotion
										? undefined
										: { y: -6, scale: 1.01 }
								}
								transition={{
									duration: reduceMotion ? 0 : 0.4,
									delay: reduceMotion ? 0 : index * 0.12,
									ease: "easeOut",
								}}
								className={cn(
									cardVariants({
										size,
										theme,
										highlight: plan.highlight,
									}),
								)}
							>
								{/* Classic theme highlight effect */}
								{theme === "classic" && plan.highlight && (
									<>
										<div className="via-primary absolute -top-px left-1/2 h-px w-32 -translate-x-1/2 bg-gradient-to-r from-transparent to-transparent" />
										<div className="absolute top-4 right-4">
											<Badge
												className={highlightBadgeVariants(
													{ theme },
												)}
											>
												Most Popular
											</Badge>
										</div>
									</>
								)}

								<Badge
									className={cn(
										theme === "classic" && !plan.highlight
											? "bg-muted text-muted-foreground border-border/50 mb-8"
											: highlightBadgeVariants({ theme }),
									)}
								>
									{plan.title}
								</Badge>

								<AnimatePresence mode="wait">
									<motion.div
										key={isAnnually ? "year" : "month"}
										initial={
											reduceMotion
												? false
												: { opacity: 0, y: 10 }
										}
										animate={{ opacity: 1, y: 0 }}
										exit={
											reduceMotion
												? undefined
												: { opacity: 0, y: -10 }
										}
										transition={{
											duration: reduceMotion ? 0 : 0.2,
										}}
									>
										{isAnnually ? (
											<>
												<span
													className={cn(
														"my-auto",
														priceTextVariants({
															size,
															theme,
														}),
													)}
												>
													{parseFloat(
														plan.yearlyPrice,
													) >= 0 && (
														<>{plan.currency}</>
													)}
													{plan.yearlyPrice}
													{calculateDiscount(
														plan.monthlyPrice,
														plan.yearlyPrice,
													) > 0 && (
														<span
															className={cn(
																"ml-2 text-xs",
																theme ===
																	"classic"
																	? "font-semibold text-emerald-500"
																	: "underline",
															)}
														>
															{calculateDiscount(
																plan.monthlyPrice,
																plan.yearlyPrice,
															)}
															% off
														</span>
													)}
												</span>
												<p className="text-muted-foreground">
													per year
												</p>
											</>
										) : (
											<>
												<span
													className={cn(
														priceTextVariants({
															size,
															theme,
														}),
													)}
												>
													{parseFloat(
														plan.monthlyPrice,
													) >= 0 && (
														<>{plan.currency}</>
													)}
													{plan.monthlyPrice}
												</span>
												<p className="text-muted-foreground">
													per month
												</p>
											</>
										)}
									</motion.div>
								</AnimatePresence>

								<hr
									className={cn(
										"my-6 border-border",
										theme === "classic" &&
											"border-0 bg-gradient-to-r from-transparent via-border to-transparent",
									)}
								/>

								<div className="flex h-full flex-col justify-between gap-10">
									<ul className="text-muted-foreground space-y-4">
										{plan.features.map(
											(feature, featureIndex) => (
												<motion.li
													key={featureIndex}
													className="flex gap-3"
													initial={
														reduceMotion
															? false
															: {
																	opacity: 0,
																	x: -10,
																}
													}
													animate={{
														opacity: 1,
														x: 0,
													}}
													transition={{
														duration: reduceMotion
															? 0
															: 0.3,
														delay: reduceMotion
															? 0
															: featureIndex *
																0.05,
													}}
												>
													<Check
														className={cn(
															featureIconVariants(
																{ size, theme },
															),
														)}
													/>
													<span
														className={cn(
															theme ===
																"classic" &&
																"text-foreground/90",
														)}
													>
														{feature.name}
													</span>
												</motion.li>
											),
										)}
									</ul>

									<Button
										type="button"
										className={buttonVariants({ theme })}
										onClick={() =>
											onPlanSelect?.(
												plan.id,
												isAnnually
													? "annually"
													: "monthly",
											)
										}
										aria-label={`Select ${plan.title} plan`}
									>
										{theme === "classic" &&
											plan.highlight && (
												<Zap className="mr-1 h-4 w-4" />
											)}
										{plan.buttonText}
										{theme === "classic" && (
											<div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-white/0 via-white/10 to-white/0 transition-transform duration-700 hover:translate-x-[100%]" />
										)}
									</Button>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
