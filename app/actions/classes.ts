"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/lib/generated/prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePaidMember, requirePaidStaff } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { PLANNING_DAYS, utcDay } from "@/lib/data/classes";
import { toDateOnly } from "@/lib/format";

const classSchema = z.object({
	classId: z.string().optional(),
	/** Set for a one-off: the class runs on this date and no other. */
	date: z
		.string()
		.trim()
		.optional()
		.transform((v) => (v === "" || v === undefined ? null : v)),
	name: z.string().trim().min(2, "Give the class a name").max(60),
	description: z.string().trim().max(400).optional(),
	coachId: z.string().optional(),
	dayOfWeek: z.coerce.number().int().min(1).max(7),
	startTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
	durationMinutes: z.coerce.number().int().min(15).max(180),
	capacity: z.coerce.number().int().min(1).max(200),
	isActive: z.union([z.literal("on"), z.literal("")]).optional(),
});

const obj = (fd: FormData) => Object.fromEntries(fd.entries());

/** Create or edit one weekly slot. */
export async function saveClassAction(
	formData: FormData,
): Promise<ActionResult> {
	return guard(async () => {
		const session = await requirePaidStaff();
		const parsed = classSchema.safeParse(obj(formData));
		if (!parsed.success) return invalid(parsed.error);
		const d = parsed.data;

		// A coach must belong to this gym — the picker is scoped, but the id is
		// posted by the browser and the browser is not trusted.
		let coachId: string | null = null;
		if (d.coachId) {
			const coach = await db.trainerProfile.findFirst({
				where: { id: d.coachId, gymId: session.gymId },
				select: { id: true },
			});
			if (!coach)
				return { ok: false, error: "That coach isn't on your team." };
			coachId = coach.id;
		}

		// A one-off carries its own date and takes its weekday from it, so the
		// calendar never has to reconcile a date with a contradictory dayOfWeek.
		const oneOff = d.date ? utcDay(d.date) : null;
		const data = {
			gymId: session.gymId,
			coachId,
			name: d.name,
			description: d.description || null,
			date: oneOff,
			dayOfWeek: oneOff
				? oneOff.getUTCDay() === 0
					? 7
					: oneOff.getUTCDay()
				: d.dayOfWeek,
			startTime: d.startTime,
			durationMinutes: d.durationMinutes,
			capacity: d.capacity,
			isActive: d.isActive === "on",
		};

		if (d.classId) {
			const owned = await db.gymClass.findFirst({
				where: { id: d.classId, gymId: session.gymId },
				select: { id: true },
			});
			if (!owned) return { ok: false, error: "That class is gone." };
			await db.gymClass.update({ where: { id: owned.id }, data });
		} else {
			await db.gymClass.create({ data });
		}

		revalidatePath("/gym/classes");
		return {
			ok: true,
			message: d.classId
				? "Class updated."
				: "Class added to the timetable.",
		};
	});
}

/**
 * Take a class off the timetable.
 *
 * Bookings cascade with it, which is right: a class that no longer runs has no
 * register worth keeping, and attendance for classes that did run is already
 * on the attendance table.
 */
export async function deleteClassAction(
	classId: string,
): Promise<ActionResult> {
	return guard(async () => {
		const session = await requirePaidStaff();
		const owned = await db.gymClass.findFirst({
			where: { id: classId, gymId: session.gymId },
			select: { id: true },
		});
		if (!owned) return { ok: false, error: "That class is gone." };

		await db.gymClass.delete({ where: { id: owned.id } });
		revalidatePath("/gym/classes");
		return { ok: true, message: "Class removed." };
	});
}

/** Mark a booked member present or absent, from the class register. */
export async function setBookingStatusAction(
	bookingId: string,
	status: "ATTENDED" | "NO_SHOW" | "BOOKED",
): Promise<ActionResult> {
	return guard(async () => {
		const session = await requirePaidStaff();
		const booking = await db.classBooking.findFirst({
			where: { id: bookingId, gymClass: { gymId: session.gymId } },
			select: { id: true, memberId: true, date: true },
		});
		if (!booking) return { ok: false, error: "That booking is gone." };

		await db.classBooking.update({
			where: { id: booking.id },
			data: { status },
		});
		revalidatePath("/gym/classes");
		return {
			ok: true,
			message: status === "ATTENDED" ? "Marked present." : "Updated.",
		};
	});
}

/**
 * A member books their own spot.
 *
 * Self-service on purpose: capacity decides the answer, so nobody at the front
 * desk has to approve anything. Past capacity the member goes on the waitlist,
 * which is a queue for a room rather than a queue for a human.
 */
export async function bookClassAction(
	classId: string,
	isoDate: string,
): Promise<ActionResult> {
	return guard(async () => {
		const session = await requirePaidMember();
		const date = new Date(isoDate);
		if (Number.isNaN(date.getTime()))
			return { ok: false, error: "That date isn't valid." };
		const day = toDateOnly(date);
		const today = toDateOnly();
		const ahead = Math.round(
			(day.getTime() - today.getTime()) / 86_400_000,
		);
		if (ahead < 0)
			return { ok: false, error: "That class has already run." };
		if (ahead > PLANNING_DAYS) {
			return {
				ok: false,
				error: `You can book up to ${PLANNING_DAYS} days ahead.`,
			};
		}

		const reserve = () =>
			db.$transaction(
				async (tx) => {
					const gymClass = await tx.gymClass.findFirst({
						where: {
							id: classId,
							gymId: session.gymId,
							isActive: true,
						},
						select: {
							id: true,
							capacity: true,
							name: true,
							dayOfWeek: true,
							date: true,
						},
					});
					if (!gymClass)
						return { error: "That class isn't running." } as const;

					const weekday = day.getUTCDay() === 0 ? 7 : day.getUTCDay();
					if (
						(gymClass.date &&
							gymClass.date.getTime() !== day.getTime()) ||
						(!gymClass.date && gymClass.dayOfWeek !== weekday)
					) {
						return {
							error: "That class isn't running on that day.",
						} as const;
					}

					const off = await tx.classCancellation.findFirst({
						where: { classId, date: day },
						select: { id: true },
					});
					if (off)
						return {
							error: "That class isn't running on that day.",
						} as const;

					const existing = await tx.classBooking.findUnique({
						where: {
							classId_memberId_date: {
								classId,
								memberId: session.profileId,
								date: day,
							},
						},
						select: { status: true },
					});
					if (existing)
						return {
							status: existing.status,
							name: gymClass.name,
						} as const;

					const taken = await tx.classBooking.count({
						where: {
							classId,
							date: day,
							status: { in: ["BOOKED", "ATTENDED"] },
						},
					});
					const status =
						taken >= gymClass.capacity ? "WAITLIST" : "BOOKED";
					await tx.classBooking.create({
						data: {
							classId,
							memberId: session.profileId,
							date: day,
							status,
						},
					});
					return { status, name: gymClass.name } as const;
				},
				{
					isolationLevel:
						Prisma.TransactionIsolationLevel.Serializable,
				},
			);

		let booked: Awaited<ReturnType<typeof reserve>> | null = null;
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				booked = await reserve();
				break;
			} catch (error) {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === "P2034" &&
					attempt < 2
				)
					continue;
				throw error;
			}
		}
		if (!booked || "error" in booked) {
			return {
				ok: false,
				error:
					booked?.error ??
					"We couldn't reserve that class. Please try again.",
			};
		}

		revalidatePath("/me/classes");
		return {
			ok: true,
			message:
				booked.status === "WAITLIST"
					? `${booked.name} is full — you're on the waitlist.`
					: `Booked into ${booked.name}.`,
		};
	});
}

/** …and cancels it, which is the other half of not needing the front desk. */
export async function cancelBookingAction(
	bookingId: string,
): Promise<ActionResult> {
	return guard(async () => {
		const session = await requirePaidMember();

		const booking = await db.classBooking.findFirst({
			where: { id: bookingId, memberId: session.profileId },
			select: { id: true, classId: true, date: true },
		});
		if (!booking) return { ok: false, error: "That booking is gone." };

		await db.classBooking.delete({ where: { id: booking.id } });

		// A cancellation frees a spot, so the longest-waiting person takes it.
		const next = await db.classBooking.findFirst({
			where: {
				classId: booking.classId,
				date: booking.date,
				status: "WAITLIST",
			},
			orderBy: { createdAt: "asc" },
			select: { id: true },
		});
		if (next) {
			await db.classBooking.update({
				where: { id: next.id },
				data: { status: "BOOKED" },
			});
		}

		revalidatePath("/me/classes");
		return { ok: true, message: "Booking cancelled." };
	});
}

/**
 * Strike one occurrence off the calendar.
 *
 * Recorded rather than deleted, so the weekly slot stays intact and the class
 * runs again next week without anybody re-creating it. Existing bookings are
 * cancelled with it — a member holding a spot in a class that is not running is
 * the one outcome worse than no booking at all.
 */
export async function cancelOccurrenceAction(
	classId: string,
	isoDate: string,
	reason?: string,
): Promise<ActionResult> {
	return guard(async () => {
		const session = await requirePaidStaff();
		const gymClass = await db.gymClass.findFirst({
			where: { id: classId, gymId: session.gymId },
			select: { id: true, name: true },
		});
		if (!gymClass) return { ok: false, error: "That class is gone." };

		const date = utcDay(isoDate);
		await db.$transaction([
			db.classCancellation.upsert({
				where: { classId_date: { classId, date } },
				create: { classId, date, reason: reason?.trim() || null },
				update: { reason: reason?.trim() || null },
			}),
			db.classBooking.updateMany({
				where: {
					classId,
					date,
					status: { in: ["BOOKED", "WAITLIST"] },
				},
				data: { status: "CANCELLED" },
			}),
		]);

		revalidatePath("/gym/classes");
		revalidatePath("/me/classes");
		return { ok: true, message: `${gymClass.name} is off for that day.` };
	});
}

/** Put a cancelled occurrence back on. Bookings are not restored with it. */
export async function restoreOccurrenceAction(
	classId: string,
	isoDate: string,
): Promise<ActionResult> {
	return guard(async () => {
		const session = await requirePaidStaff();
		const owned = await db.gymClass.findFirst({
			where: { id: classId, gymId: session.gymId },
			select: { id: true },
		});
		if (!owned) return { ok: false, error: "That class is gone." };

		await db.classCancellation
			.delete({
				where: { classId_date: { classId, date: utcDay(isoDate) } },
			})
			.catch(() => null);

		revalidatePath("/gym/classes");
		revalidatePath("/me/classes");
		return { ok: true, message: "Back on the calendar." };
	});
}
