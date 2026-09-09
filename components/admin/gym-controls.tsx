"use client";

import { useRouter } from "next/navigation";
import { Ban, ChevronDown, Play, Timer, TrendingUp } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { setGymStatusAction, setGymTierAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useAction } from "@/components/ui/use-action";

/** Lifecycle controls for one gym, used on the admin gym detail page. */
export function GymControls({
  gymId,
  status,
  tier,
}: {
  gymId: string;
  name: string;
  status: string;
  tier: string;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const act = (fn: () => Promise<ActionResult>) => run(fn, { onSuccess: () => router.refresh() });

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {status === "SUSPENDED" || status === "CANCELLED" ? (
        <Button loading={pending} onClick={() => act(() => setGymStatusAction(gymId, "ACTIVE"))}>
          <Play /> Reactivate gym
        </Button>
      ) : (
        <Button
          variant="outlineDanger"
          loading={pending}
          onClick={() => act(() => setGymStatusAction(gymId, "SUSPENDED"))}
        >
          <Ban /> Suspend gym
        </Button>
      )}

      <Dropdown>
        <DropdownTrigger asChild>
          <Button variant="secondary">
            Tier: {tier[0] + tier.slice(1).toLowerCase()}
            <ChevronDown />
          </Button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownLabel>Change tier</DropdownLabel>
          {["PRO", "ELITE"].map((t) => (
            <DropdownItem
              key={t}
              disabled={t === tier}
              onSelect={() => act(() => setGymTierAction(gymId, t))}
            >
              <TrendingUp /> {t[0] + t.slice(1).toLowerCase()}
            </DropdownItem>
          ))}
          <DropdownSeparator />
          <DropdownItem onSelect={() => act(() => setGymStatusAction(gymId, "TRIAL"))}>
            <Timer /> Put back on trial
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
    </div>
  );
}
