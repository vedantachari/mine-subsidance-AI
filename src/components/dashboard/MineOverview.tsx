import { ArrowUpRight } from "lucide-react";
import type { DashboardOverview } from "@/types/api";
import { StatusCard } from "./StatusCard";

export function MineOverview({ dashboard }: { dashboard: DashboardOverview }) {
  const statusSummary = [
    { label: "Normal", value: dashboard.mine.normal_nodes, tone: "normal" as const },
    { label: "Watch", value: dashboard.mine.watch_nodes, tone: "watch" as const },
    { label: "Warning", value: dashboard.mine.warning_nodes, tone: "warning" as const },
    { label: "Critical", value: dashboard.mine.critical_nodes, tone: "critical" as const },
  ];

  return (
    <section className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-start justify-between border-b border-zinc-100 px-3 py-3">
        <div className="flex items-start gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
            <ArrowUpRight size={13} />
          </div>
          <div>
            <h2 className="text-[11px] font-semibold tracking-wide text-zinc-900">MINE OVERVIEW</h2>
            <p className="text-[9px] text-zinc-500">Sensors &amp; equipment status monitoring</p>
          </div>
        </div>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-medium text-zinc-600">{dashboard.mine.total_nodes} Total</span>
      </div>
      <div className="grid grid-cols-4 gap-2 p-3">
        {statusSummary.map((status) => <StatusCard key={status.label} {...status} />)}
      </div>
    </section>
  );
}
