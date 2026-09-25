"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import styles from "@/app/search.module.css";
import { ActiveAlerts } from "./ActiveAlerts";
import { MineOverview } from "./MineOverview";
import { NetworkPanel } from "./NetworkPanel";
import { QuickFilters } from "./QuickFilters";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { NodeDetailPanel } from "./NodeDetailPanel";
import type { FilterType } from "@/data/dashboard";

export function SidebarMenu({ selectedNodeId, onNodeSelect, activeFilter, onFilterChange }: { selectedNodeId: string | null; onNodeSelect: (nodeId: string | null) => void; activeFilter: FilterType; onFilterChange: (filter: FilterType) => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { data: dashboard, error, loading } = useDashboardData();

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;

    setSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(`/api/nodes/search?q=${encodeURIComponent(query)}`);
      const payload = await response.json() as { results: Array<{ node_id: string }> };
      const result = payload.results[0];

      if (!result) {
        setSearchError("No matching node found");
        return;
      }

      onNodeSelect(result.node_id);
      setIsMenuOpen(false);
    } catch {
      setSearchError("Search is temporarily unavailable");
    } finally {
      setSearching(false);
    }
  }

  return (
    <aside className={`fixed left-4 top-4 z-1000 overflow-hidden bg-white text-black shadow-lg transition-[width,height,border-radius] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${isMenuOpen ? "h-[calc(100dvh-2rem)] w-80 rounded-[28px]" : "h-12 w-12 rounded-2xl"}`}>
      <div className={`${styles.scrollbarHidden} absolute inset-0 overflow-y-auto p-6 pt-8 transition-opacity duration-300 ${isMenuOpen ? "opacity-100 delay-150" : "pointer-events-none opacity-0"}`}>
        <form onSubmit={handleSearch} className={`${styles.searchGradientBorder} flex items-center gap-3 px-4 py-3 transition-all duration-300 backdrop-blur-sm`}>
          <Search size={18} className="shrink-0 text-zinc-500" />
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} type="search" placeholder="Search node..." aria-label="Search nodes" className="w-full bg-transparent text-sm text-black outline-none placeholder:text-zinc-500" />
        </form>
        {searching && <p className="mt-2 text-[10px] text-zinc-500">Searching nodes...</p>}
        {searchError && <p className="mt-2 text-[10px] text-rose-600">{searchError}</p>}
        {loading && <p className="mt-4 text-center text-xs text-zinc-500">Loading telemetry...</p>}
        {error && <p className="mt-4 text-center text-xs text-rose-600">{error}</p>}
        {dashboard && <>
          <MineOverview dashboard={dashboard} />
          <ActiveAlerts alerts={dashboard.alerts} />
          <NetworkPanel dashboard={dashboard} />
          <QuickFilters dashboard={dashboard} activeFilter={activeFilter} onFilterChange={onFilterChange} />
        </>}
      </div>

      {isMenuOpen ? (
        <div className="group absolute left-0 top-0 z-30 h-24 w-24" aria-hidden="true">
          <button type="button" onClick={() => setIsMenuOpen(false)} aria-label="Close menu" className="absolute left-3 top-3 flex h-12 w-12 scale-75 -translate-y-2 items-center justify-center rounded-2xl bg-black text-white opacity-0 shadow-[0_8px_30px_rgb(0,0,0,0.25)] transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-100 group-hover:translate-y-0 group-hover:opacity-100">✕</button>
        </div>
      ) : (
        <button type="button" onClick={() => setIsMenuOpen(true)} aria-label="Open menu" className="absolute inset-0 flex items-center justify-center text-black transition-transform duration-300 hover:scale-110">☰</button>
      )}

      {selectedNodeId && <NodeDetailPanel key={selectedNodeId} nodeId={selectedNodeId} onClose={() => onNodeSelect(null)} />}
    </aside>
  );
}
