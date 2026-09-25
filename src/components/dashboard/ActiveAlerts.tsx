import { TriangleAlert } from "lucide-react";
import type { DashboardAlert } from "@/types/api";
import { AlertItem } from "./AlertItem";

export function ActiveAlerts({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <section className="mt-3 rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="flex items-start justify-between border-b border-zinc-100 px-1 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600">
            <TriangleAlert size={13} />
          </div>
          <div>
            <h2 className="font-mono text-[11px] font-semibold tracking-wide text-zinc-900">ACTIVE ALERTS</h2>
            <p className="text-[9px] text-zinc-500">{alerts.length} critical or warning nodes</p>
          </div>
        </div>
        <span className="rounded-lg bg-zinc-100 px-3 py-1.5 font-mono text-[9px] font-medium text-zinc-700">{alerts.length} Active</span>
      </div>
      <div className="space-y-3 pt-3">
        {alerts.map((alert) => <AlertItem key={alert.alert_id} node={alert.node_id} status={alert.severity.toLowerCase() as "critical" | "warning"} message={alert.message} time={alert.time} />)}
      </div>
    </section>
  );
}
