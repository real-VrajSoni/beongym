export const PLAN_TYPE_LABELS: Record<string, string> = {
  ONE_TO_ONE_COACHING: "1:1 Coaching",
  TRANSFORMATION: "Transformation",
  NUTRITION_COACHING: "Nutrition Coaching",
  CONSULTATION: "Consultation",
  GROUP_COACHING: "Group Coaching",
};

export const BILLING_LABELS: Record<string, string> = {
  ONE_TIME: "One-time",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  PAUSED: "Paused",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export const SESSION_TYPE_LABELS: Record<string, string> = {
  CONSULTATION: "Consultation",
  PROGRESS_REVIEW: "Progress review",
  PERSONAL_TRAINING: "Personal training",
  FOLLOW_UP: "Follow-up",
};

export const SESSION_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Planned",
  COMPLETED: "Done",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  SUCCESSFUL: "Successful",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  UPI: "UPI",
  CARD: "Card",
  NET_BANKING: "Net Banking",
  BANK_TRANSFER: "Bank Transfer",
  CASH: "Cash",
};

export const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  UNDISCLOSED: "Prefer not to say",
};

export const DAY_LABELS = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function label(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}
