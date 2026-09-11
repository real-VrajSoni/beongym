"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { loginRateAllowed } from "@/lib/rate-limit";
import { safeRedirectPath } from "@/lib/security";
import {
  authenticateMember,
  authenticateStaff,
  createSession,
  destroySession,
  homeFor,
} from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").max(320).email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").max(256),
});

export type LoginState = { error?: string; fieldErrors?: Record<string, string> };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  if (!(await loginRateAllowed(`staff:${parsed.data.email}`))) return { error: "Too many sign-in attempts. Wait before trying again." };
  const result = await authenticateStaff(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return {
      error:
        result.reason === "GYM_SUSPENDED"
          ? "That gym's account is suspended. Contact support to reactivate it."
          : result.reason === "DEACTIVATED"
            ? "That account has been deactivated. Ask your gym owner to switch it back on."
            : "That email and password combination doesn't match an account.",
    };
  }
  const user = result.user;

  await createSession(user);

  const next = String(formData.get("next") ?? "");
  // Only allow same-origin relative redirects.
  const safeNext = safeRedirectPath(next);
  redirect(safeNext ?? homeFor(user.role));
}

const memberLoginSchema = z.object({
  gymCode: z.string().trim().min(3, "Your gym code is on your membership card").max(24),
  memberCode: z.string().trim().min(1, "Member code is required").max(40),
  password: z.string().min(1, "Password is required").max(256),
});

/**
 * Members sign in with the two codes their gym gave them, not an email.
 *
 * Plenty of members never handed their gym an email address, and the gym code
 * is what scopes the lookup — so "IRON-4821 / M-0042" is a credential a front
 * desk can read out over the phone and a member can find on their card.
 */
export async function memberLoginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = memberLoginSchema.safeParse({
    gymCode: formData.get("gymCode"),
    memberCode: formData.get("memberCode"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  if (!(await loginRateAllowed(`member:${parsed.data.gymCode}:${parsed.data.memberCode}`))) return { error: "Too many sign-in attempts. Wait before trying again." };
  const result = await authenticateMember(
    parsed.data.gymCode,
    parsed.data.memberCode,
    parsed.data.password,
  );
  if (!result.ok) {
    return {
      error:
        result.reason === "GYM_SUSPENDED"
            ? "That gym's account is suspended. Ask at the desk."
            : result.reason === "GYM_LAPSED"
              ? "Your gym's BeOnGym subscription has run out, so the member app is paused. Your membership at the gym is unaffected."
              : result.reason === "DEACTIVATED"
                ? "That member account has been switched off. Ask at the desk."
                : "Those details don't match a member. Check the codes and try again.",
    };
  }

  await createSession(result.user);

  const next = String(formData.get("next") ?? "");
  // Only member surfaces: the app itself, and the check-in a scanned QR
  // bounced them here from.
  const path = safeRedirectPath(next);
  const safeNext = path && (path === "/me" || path.startsWith("/me/") || path.startsWith("/checkin/")) ? path : null;
  redirect(safeNext ?? homeFor(result.user.role));
}

export async function logoutAction() {
  await destroySession();
  // Home, for the same reason as /logout: signing out means leaving, and
  // landing on the sign-in page put people in a loop where Back did nothing.
  redirect("/");
}
