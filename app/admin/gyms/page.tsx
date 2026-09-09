import { requireAdmin } from "@/lib/auth";
import { getGymTable } from "@/lib/data/admin";
import { formatUsd } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { GymsTable, type GymRow } from "@/components/admin/gyms-table";
import { Building2, CircleCheck, DollarSign, Timer } from "lucide-react";

export const metadata = { title: "Gyms" };

export default async function AdminGymsPage() {
  await requireAdmin();
  const gyms = await getGymTable();

  const rows: GymRow[] = gyms.map((g) => ({
    ...g,
    createdAt: g.createdAt.toISOString(),
  }));

  const mrr = rows
    .filter((r) => r.status === "ACTIVE" || r.status === "TRIAL")
    .reduce((a, r) => a + r.mrr, 0);

  return (
    <>
      <PageHeader
        title="Gyms"
        description="Every tenant on the platform. Suspend, upgrade or open any of them."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total gyms" value={rows.length} icon={Building2} accent />
        <StatCard
          label="Active"
          value={rows.filter((r) => r.status === "ACTIVE").length}
          icon={CircleCheck}
        />
        <StatCard
          label="On trial"
          value={rows.filter((r) => r.status === "TRIAL").length}
          icon={Timer}
        />
        <StatCard label="Platform MRR" value={formatUsd(mrr)} icon={DollarSign} />
      </div>

      <GymsTable rows={rows} />
    </>
  );
}
