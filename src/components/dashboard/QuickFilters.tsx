import { SlidersHorizontal } from "lucide-react";
import type { DashboardOverview } from "@/types/api";
import type { Filter, FilterType } from "@/data/dashboard";
import { FilterButton } from "./FilterButton";

export function QuickFilters({ dashboard, activeFilter, onFilterChange }: { dashboard: DashboardOverview; activeFilter: FilterType; onFilterChange: (filter: FilterType) => void }) {
  const filters: Filter[] = [
    { id: "all", label: "All", count: dashboard.mine.total_nodes },
    { id: "warning", label: "Warning", count: dashboard.mine.warning_nodes },
    { id: "critical", label: "Critical", count: dashboard.mine.critical_nodes },
    { id: "offline", label: "Offline", count: dashboard.mine.offline_nodes },
  ];
  const activeCount = filters.find((filter) => filter.id === activeFilter)?.count ?? 0;

  return (
    <section className="mt-3 rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="flex items-start justify-between px-1">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-500"><SlidersHorizontal size={18} /></div>
          <div>
            <h2 className="font-mono text-[11px] font-semibold tracking-widest text-zinc-900">QUICK FILTERS</h2>
            <p className="text-[9px] text-zinc-500">Telemetry state stream</p>
          </div>
        </div>
        <span className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-[9px] text-zinc-700">4 Presets</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {filters.map((filter) => <FilterButton key={filter.id} filter={filter} active={activeFilter === filter.id} onClick={() => onFilterChange(filter.id)} />)}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-[10px]">
        <span className="font-mono text-zinc-500">Matches: <strong className="text-zinc-900">{activeCount}</strong> of 50 nodes</span>
        <button type="button" onClick={() => onFilterChange("all")} className="font-mono text-indigo-600 transition-colors hover:text-indigo-800">Clear &times;</button>
      </div>
    </section>
  );
}
