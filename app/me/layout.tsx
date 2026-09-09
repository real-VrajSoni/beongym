import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { MemberShell } from "@/components/member/member-shell";
import { SessionGuard } from "@/components/layout/session-guard";

export const metadata = {
  title: { default: "My gym", template: "%s · My gym" },
};

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await requireMember();

  const [gym, profile] = await Promise.all([
    db.gym.findUniqueOrThrow({
      where: { id: session.gymId },
      select: { name: true, logoText: true, accentColor: true, imageUrl: true },
    }),
    db.clientProfile.findUniqueOrThrow({
      where: { id: session.profileId },
      select: { memberCode: true },
    }),
  ]);

  return (
    <>
      <SessionGuard />
      <MemberShell
        brand={{
          name: gym.name,
          mark: gym.logoText ?? gym.name.slice(0, 2).toUpperCase(),
          accentColor: gym.accentColor,
          imageUrl: gym.imageUrl,
        }}
        memberName={session.name}
        memberCode={profile.memberCode}
      >
        {children}
      </MemberShell>
    </>
  );
}
