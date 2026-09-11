import "server-only";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env";

/**
 * The gym's check-in poster, as an SVG.
 *
 * Rendered on the server — the QR library never reaches the browser — and it
 * encodes the gym's permanent code, so the poster printed today still works
 * next year. `APP_URL` is what the phone will actually open, so it has to be
 * the address members can reach; on localhost that is only the same machine.
 */
export async function renderCheckInQr(gymId: string): Promise<{
  svg: string;
  url: string;
  gymCode: string;
}> {
  const gym = await db.gym.findUniqueOrThrow({
    where: { id: gymId },
    select: { code: true, checkInCode: true },
  });

  const base = serverEnv().appUrl;
  const url = `${base}/checkin/${gym.code}?k=${gym.checkInCode}`;

  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#14141b", light: "#ffffff" },
  });

  return { svg, url, gymCode: gym.code };
}
