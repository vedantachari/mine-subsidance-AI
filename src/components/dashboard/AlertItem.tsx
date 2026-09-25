import type { Alert } from "@/data/dashboard";

export function AlertItem({ node, status, message, time }: Alert) {
  const critical = status === "critical";

  return (
    <div
      className={`rounded-2xl border p-4 ${
        critical
          ? "border-rose-200 bg-rose-50/70"
          : "border-amber-200 bg-amber-50/70"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${
            critical ? "bg-rose-500" : "bg-amber-500"
          }`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold text-zinc-900">
              {node}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                critical
                  ? "bg-rose-100 text-rose-600"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {status}
            </span>
          </div>
          <p className="mt-1 text-[10px] font-medium text-zinc-900">{message}</p>
          <p className="mt-1 font-mono text-[9px] text-zinc-500">{time}</p>
        </div>

        <button
          type="button"
          className={`shrink-0 text-[9px] font-semibold ${
            critical
              ? "text-rose-600 hover:text-rose-700"
              : "text-amber-700 hover:text-amber-800"
          }`}
        >
          View
        </button>
      </div>
    </div>
  );
}
