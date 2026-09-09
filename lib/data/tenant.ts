import "server-only";
import { db } from "@/lib/db";

/**
 * The tenant boundary, in one place.
 *
 * Every mutation that touches a row belonging to a gym asks one of these first,
 * with the `gymId` taken from the signed session and the row id taken from the
 * browser. The browser is never trusted; these functions are the only thing
 * standing between "an id in a form field" and "a row we are willing to write".
 *
 * They live together rather than inline in each action for two reasons. The
 * boundary is a rule about the product, not about any one screen — so it should
 * read as a rule. And it can be tested directly: `npm run check:tenant` drives
 * every one of them with a second gym's ids and asserts they all say no.
 *
 * The shape is deliberately uniform — `(gymId, rowId) => Promise<boolean>` — so
 * a new resource is one obvious function and one obvious test row, and a
 * resource with no function here is visible as an omission rather than hidden
 * as a slightly different inline `where`.
 *
 * Note what the joins say about the schema: a subscription has no `gymId` of
 * its own, so its tenant is its plan's; a payment's is its subscription's plan's.
 * Getting that chain right in one place is the whole point.
 */

/** A member on this gym's roster. */
export async function assertGymMember(gymId: string, clientId: string): Promise<boolean> {
  return (await db.clientProfile.count({ where: { id: clientId, gymId } })) > 0;
}

/** A membership plan this gym sells. */
export async function assertGymPlan(gymId: string, planId: string): Promise<boolean> {
  return (await db.plan.count({ where: { id: planId, gymId } })) > 0;
}

/** A membership sold by this gym — reached through the plan, which carries the gym. */
export async function assertGymSubscription(
  gymId: string,
  subscriptionId: string,
): Promise<boolean> {
  return (await db.subscription.count({ where: { id: subscriptionId, plan: { gymId } } })) > 0;
}

/** A payment taken by this gym — payment → subscription → plan → gym. */
export async function assertGymPayment(gymId: string, paymentId: string): Promise<boolean> {
  return (
    (await db.payment.count({
      where: { id: paymentId, subscription: { plan: { gymId } } },
    })) > 0
  );
}

/** A visit recorded on this gym's floor. */
export async function assertGymAttendance(gymId: string, attendanceId: string): Promise<boolean> {
  return (await db.attendance.count({ where: { id: attendanceId, gymId } })) > 0;
}

/** A slot on this gym's timetable. */
export async function assertGymClass(gymId: string, classId: string): Promise<boolean> {
  return (await db.gymClass.count({ where: { id: classId, gymId } })) > 0;
}

/** A booking against one of this gym's classes. */
export async function assertGymBooking(gymId: string, bookingId: string): Promise<boolean> {
  return (await db.classBooking.count({ where: { id: bookingId, gymClass: { gymId } } })) > 0;
}

/** An enquiry taken by this gym. */
export async function assertGymLead(gymId: string, leadId: string): Promise<boolean> {
  return (await db.lead.count({ where: { id: leadId, gymId } })) > 0;
}

/** A queued reminder belonging to this gym. */
export async function assertGymMessage(gymId: string, messageId: string): Promise<boolean> {
  return (await db.messageLog.count({ where: { id: messageId, gymId } })) > 0;
}

/** Somebody on this gym's team. Members are not staff and never match. */
export async function assertGymStaff(gymId: string, userId: string): Promise<boolean> {
  return (
    (await db.user.count({
      where: { id: userId, gymId, role: { in: ["GYM_OWNER", "GYM_STAFF"] } },
    })) > 0
  );
}

/** A coach this gym could put in front of a class. */
export async function assertGymCoach(gymId: string, trainerId: string): Promise<boolean> {
  return (await db.trainerProfile.count({ where: { id: trainerId, gymId } })) > 0;
}

/** A note written about one of this gym's members. */
export async function assertGymNote(gymId: string, noteId: string): Promise<boolean> {
  return (await db.trainerNote.count({ where: { id: noteId, client: { gymId } } })) > 0;
}

/**
 * A workout plan hanging off one of this gym's membership plans.
 *
 * Takes the parent plan as well: the caller has already established that the
 * plan is theirs, and what still has to be true is that the attachment belongs
 * to *that* plan. Checking only the gym would let a gym move another of its own
 * plans' attachments around; checking only the plan is what the bug was.
 */
export async function assertPlanWorkout(planId: string, workoutPlanId: string): Promise<boolean> {
  return (await db.workoutPlan.count({ where: { id: workoutPlanId, planId } })) > 0;
}

/** A nutrition plan hanging off one of this gym's membership plans. */
export async function assertPlanDiet(planId: string, dietPlanId: string): Promise<boolean> {
  return (await db.dietPlan.count({ where: { id: dietPlanId, planId } })) > 0;
}

/** A booking the signed-in member made themselves. Their own row, not their gym's. */
export async function assertOwnBooking(memberId: string, bookingId: string): Promise<boolean> {
  return (await db.classBooking.count({ where: { id: bookingId, memberId } })) > 0;
}
