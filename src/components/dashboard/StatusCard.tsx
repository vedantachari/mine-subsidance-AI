import type { StatusSummary } from "@/data/dashboard";

type StatusCardProps = StatusSummary;

const toneStyles = {
  normal: "border-emerald-100 bg-emerald-50/70 text-emerald-600",
  watch: "border-amber-100 bg-amber-50/70 text-amber-600",
  warning: "border-orange-100 bg-orange-50/70 text-orange-600",
  critical: "border-rose-100 bg-rose-50/70 text-rose-600",
};

export function StatusCard({ label, value, tone }: StatusCardProps) {
  return (
    <div className={`rounded-xl border px-2 py-2.5 ${toneStyles[tone]}`}>
      <div className="flex items-center gap-1 text-[9px] font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold leading-none text-zinc-900">
        {value}
      </div>
    </div>
  );
}
