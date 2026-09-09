import { Badge, type BadgeTone } from "@/components/ui/badge";

const GYM_STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "success",
  TRIAL: "info",
  SUSPENDED: "warning",
  CANCELLED: "danger",
};

const GYM_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  TRIAL: "Trial",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
};

const TIER_TONE: Record<string, BadgeTone> = {
  PRO: "brand",
  ELITE: "warning",
};

export function GymStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={GYM_STATUS_TONE[status] ?? "neutral"} dot>
      {GYM_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  return <Badge tone={TIER_TONE[tier] ?? "neutral"}>{tier[0] + tier.slice(1).toLowerCase()}</Badge>;
}

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Platform admin",
  GYM_OWNER: "Owner",
  GYM_STAFF: "Staff",
  MEMBER: "Member",
};

export function RoleBadge({ role }: { role: string }) {
  const tone: BadgeTone =
    role === "SUPER_ADMIN"
      ? "danger"
      : role === "GYM_OWNER"
        ? "brand"
        : role === "GYM_STAFF"
          ? "info"
          : "neutral";
  return <Badge tone={tone}>{ROLE_LABEL[role] ?? role}</Badge>;
}
