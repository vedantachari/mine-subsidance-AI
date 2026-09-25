import type { NetworkMetric } from "@/data/dashboard";

type NetworkStatusProps = NetworkMetric;

export function NetworkStatus({ label, value, status }: NetworkStatusProps) {
  const isOnline = status === "online";

  return (
    <div
      className={`flex items-center justify-between rounded-2xl border px-3 py-3 ${
        isOnline
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-rose-200 bg-rose-50/60"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isOnline ? "bg-emerald-400" : "border-2 border-rose-500"
          }`}
        />
        <span className="font-mono text-[11px] font-medium text-zinc-800">
          {label}
        </span>
      </div>
      <span className={`text-[11px] font-semibold ${isOnline ? "text-zinc-900" : "text-rose-500"}`}>
        {value}
      </span>
    </div>
  );
}
