import { Wifi } from "lucide-react";
import type { DashboardOverview } from "@/types/api";
import { NetworkStatus } from "./NetworkStatus";

export function NetworkPanel({ dashboard }: { dashboard: DashboardOverview }) {
  const networkMetrics = [
    { label: "Online", value: dashboard.network.nodes_online, status: "online" as const },
    { label: "Offline", value: dashboard.network.nodes_offline, status: "offline" as const },
  ];
  return (
    <section className="mt-3 rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="flex items-start justify-between px-1">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-500"><Wifi size={18} /></div>
          <div>
            <h2 className="font-mono text-[11px] font-semibold tracking-widest text-zinc-900">NETWORK</h2>
            <p className="text-[9px] text-zinc-500">Signal health: {dashboard.network.mesh_health_percent}%</p>
          </div>
        </div>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-[9px] text-zinc-700">{dashboard.mine.total_nodes} Nodes</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {networkMetrics.map((metric) => <NetworkStatus key={metric.label} {...metric} />)}
      </div>
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3">
        <div className="flex justify-between font-mono text-xs"><span className="text-zinc-500">Signal health</span><span className="font-semibold text-zinc-900">{dashboard.network.mesh_health_percent}%</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-sky-500 transition-[width] duration-700" style={{ width: `${dashboard.network.mesh_health_percent}%` }} /></div>
      </div>
    </section>
  );
}
