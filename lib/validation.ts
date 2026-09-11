import { z } from "zod";
import { validNewPassword } from "./security";

const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

/** Accepts "" -> null, otherwise a bounded number. */
export const optionalNumber = (min: number, max: number, labelText: string) =>
  z
    .union([z.literal(""), z.coerce.number()])
    .transform((v) => (v === "" ? null : Number(v)))
    .nullable()
    .refine((v) => v === null || (v >= min && v <= max), {
      message: `${labelText} must be between ${min} and ${max}`,
    });

export const planTypeEnum = z.enum([
  "ONE_TO_ONE_COACHING",
  "TRANSFORMATION",
  "NUTRITION_COACHING",
  "CONSULTATION",
  "GROUP_COACHING",
]);
export const billingEnum = z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY", "ANNUAL"]);
export const subStatusEnum = z.enum(["TRIAL", "ACTIVE", "PAUSED", "EXPIRED", "CANCELLED"]);
export const sessionTypeEnum = z.enum([
  "CONSULTATION",
  "PROGRESS_REVIEW",
  "PERSONAL_TRAINING",
  "FOLLOW_UP",
]);
export const sessionStatusEnum = z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]);
export const paymentStatusEnum = z.enum(["PENDING", "SUCCESSFUL", "FAILED", "REFUNDED"]);
export const paymentMethodEnum = z.enum(["UPI", "CARD", "NET_BANKING", "BANK_TRANSFER", "CASH"]);
export const genderEnum = z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]);

/** Select fields post an empty string when left blank — normalise that to null. */
export const optionalGender = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  genderEnum.nullable(),
);

export const createClientSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: optionalText(20),
  password: z.string().refine(validNewPassword, "Use at least 8 characters and at most 72 UTF-8 bytes"),
  gender: optionalGender,
  dateOfBirth: z.string().optional(),
  planId: z.string().min(1, "Choose a programme"),
  /// What the membership was sold for. Defaults to the plan's price in the
  /// form, but the desk overrides it for a joining offer or a friend's rate —
  /// which is why it is stored on the membership and not looked up later.
  price: z.coerce.number().min(0, "Price cannot be negative").max(10_000_000),
  startDate: z.string().min(1, "Start date is required"),
  status: subStatusEnum.default("ACTIVE"),
  autoRenew: z.union([z.literal("on"), z.literal("")]).optional(),
  recordPayment: z.union([z.literal("on"), z.literal("")]).optional(),
  paymentMethod: paymentMethodEnum.default("UPI"),
});

export const updateClientSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: optionalText(20),
  gender: optionalGender,
  dateOfBirth: z.string().optional(),
});

export const planSchema = z.object({
  planId: z.string().optional(),
  name: z.string().trim().min(3, "Give the programme a name").max(80),
  description: optionalText(1200),
  planType: planTypeEnum,
  price: z.coerce.number().min(0, "Price cannot be negative").max(10_000_000),
  durationDays: z.coerce.number().int().min(1, "Duration must be at least 1 day").max(1095),
  billingInterval: billingEnum,
  isActive: z.union([z.literal("on"), z.literal("")]).optional(),
  /// Publishing the price on the public store is a separate decision from
  /// having one, so it is a separate checkbox.
  showPrice: z.union([z.literal("on"), z.literal("")]).optional(),
});

export const workoutPlanSchema = z.object({
  planId: z.string().min(1),
  workoutPlanId: z.string().optional(),
  name: z.string().trim().min(3, "Name the workout plan").max(120),
  description: optionalText(1200),
});

export const dietPlanSchema = z.object({
  planId: z.string().min(1),
  dietPlanId: z.string().optional(),
  name: z.string().trim().min(3, "Name the nutrition plan").max(120),
  description: optionalText(1200),
  caloriesTarget: optionalNumber(500, 8000, "Calories"),
  proteinTarget: optionalNumber(0, 500, "Protein"),
  carbsTarget: optionalNumber(0, 900, "Carbs"),
  fatsTarget: optionalNumber(0, 400, "Fats"),
});

export const subscriptionSchema = z.object({
  subscriptionId: z.string().optional(),
  clientId: z.string().min(1, "Choose a client"),
  planId: z.string().min(1, "Choose a programme"),
  /// What the membership was sold for. Defaults to the plan's price in the
  /// form, but the desk overrides it for a joining offer or a friend's rate —
  /// which is why it is stored on the membership and not looked up later.
  price: z.coerce.number().min(0, "Price cannot be negative").max(10_000_000),
  startDate: z.string().min(1, "Start date is required"),
  status: subStatusEnum,
  autoRenew: z.union([z.literal("on"), z.literal("")]).optional(),
});

export const sessionSchema = z.object({
  sessionId: z.string().optional(),
  clientId: z.string().min(1, "Choose a client"),
  sessionType: sessionTypeEnum,
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
  durationMinutes: z.coerce.number().int().min(10).max(240),
  location: optionalText(120),
  notes: optionalText(1000),
  status: sessionStatusEnum.default("SCHEDULED"),
});

export const paymentSchema = z.object({
  subscriptionId: z.string().min(1, "Choose a subscription"),
  amount: z.coerce.number().min(1, "Amount must be greater than zero").max(10_000_000),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: paymentMethodEnum,
  status: paymentStatusEnum,
  transactionId: optionalText(60),
});

export const checkInSchema = z.object({
  weight: optionalNumber(25, 400, "Weight"),
  bodyFatPercentage: optionalNumber(1, 70, "Body fat"),
  chest: optionalNumber(30, 250, "Chest"),
  waist: optionalNumber(30, 250, "Waist"),
  hips: optionalNumber(30, 250, "Hips"),
  arms: optionalNumber(10, 100, "Arms"),
  thighs: optionalNumber(20, 150, "Thighs"),
  progressReport: optionalText(2000),
  clientFeedback: optionalText(2000),
});

export const noteSchema = z.object({
  clientId: z.string().min(1),
  checkInId: z.string().optional(),
  sessionId: z.string().optional(),
  note: z.string().trim().min(2, "Write a note").max(2000),
});

export const staffRoleEnum = z.enum(["GYM_OWNER", "GYM_STAFF"]);

export const createStaffSchema = z.object({
  name: z.string().trim().min(2, "Enter their name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: optionalText(20),
  title: optionalText(60),
  role: staffRoleEnum,
  password: z.string().refine(validNewPassword, "Use at least 8 characters and at most 72 UTF-8 bytes"),
  specialization: optionalText(160),
});

export const updateStaffSchema = z.object({
  staffId: z.string().min(1),
  name: z.string().trim().min(2, "Enter their name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: optionalText(20),
  title: optionalText(60),
  role: staffRoleEnum,
  specialization: optionalText(160),
});

export const trainerProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: optionalText(20),
  bio: optionalText(1200),
  specialization: optionalText(160),
  experienceYears: optionalNumber(0, 60, "Years of experience"),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(256),
    newPassword: z.string().refine(validNewPassword, "Use at least 8 characters and at most 72 UTF-8 bytes"),
    confirmPassword: z.string().min(1, "Confirm the new password").max(256),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
