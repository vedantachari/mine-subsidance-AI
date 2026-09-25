import type { Filter } from "@/data/dashboard";

type FilterButtonProps = {
  filter: Filter;
  active: boolean;
  onClick: () => void;
};

const activeStyles = {
  all: "border-zinc-900 bg-zinc-900 text-white",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-200 bg-rose-50 text-rose-900",
  offline: "border-slate-200 bg-slate-50 text-slate-800",
};

export function FilterButton({ filter, active, onClick }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-12 items-center justify-between rounded-2xl border px-3 font-mono text-[11px] transition-all duration-200 hover:-translate-y-0.5 ${
        active ? activeStyles[filter.id] : "border-zinc-200 bg-white text-zinc-700"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-current" />
        {filter.label}
      </span>
      <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${active ? "bg-white/15" : "bg-zinc-100 text-zinc-600"}`}>
        {filter.count}
      </span>
    </button>
  );
}
