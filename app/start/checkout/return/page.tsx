import { redirect } from "next/navigation";

/** Legacy URL: all order authorization lives in the canonical return page. */
export default async function LegacyCheckoutReturn({ searchParams }: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  redirect(`/checkout/return${order ? `?order=${encodeURIComponent(order)}` : ""}`);
}
