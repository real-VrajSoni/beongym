import { Badge, type BadgeTone } from "./badge";
import {
  PAYMENT_STATUS_LABELS,
  SESSION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  label as toLabel,
} from "@/lib/labels";

const SUBSCRIPTION_TONE: Record<string, BadgeTone> = {
  ACTIVE: "success",
  TRIAL: "info",
  PAUSED: "warning",
  EXPIRED: "neutral",
  CANCELLED: "danger",
};

const SESSION_TONE: Record<string, BadgeTone> = {
  SCHEDULED: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
  NO_SHOW: "danger",
};

const PAYMENT_TONE: Record<string, BadgeTone> = {
  SUCCESSFUL: "success",
  PENDING: "warning",
  FAILED: "danger",
  REFUNDED: "neutral",
};

type Kind = "subscription" | "session" | "payment";

const MAPS: Record<Kind, { tone: Record<string, BadgeTone>; labels: Record<string, string> }> = {
  subscription: { tone: SUBSCRIPTION_TONE, labels: SUBSCRIPTION_STATUS_LABELS },
  session: { tone: SESSION_TONE, labels: SESSION_STATUS_LABELS },
  payment: { tone: PAYMENT_TONE, labels: PAYMENT_STATUS_LABELS },
};

export function StatusBadge({
  kind,
  status,
  className,
}: {
  kind: Kind;
  status: string;
  className?: string;
}) {
  const { tone, labels } = MAPS[kind];
  return (
    <Badge tone={tone[status] ?? "neutral"} dot className={className}>
      {toLabel(labels, status)}
    </Badge>
  );
}
