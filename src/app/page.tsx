"use client";

import { useState } from "react";
import { MapBackground } from "@/components/MapBackground";
import { SidebarMenu } from "@/components/dashboard/SidebarMenu";
import type { FilterType } from "@/data/dashboard";

export default function Home() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  return (
    <main className="relative h-screen w-full overflow-hidden bg-gray-100">
      <MapBackground selectedNodeId={selectedNodeId} onNodeSelect={setSelectedNodeId} activeFilter={activeFilter} />
      <SidebarMenu selectedNodeId={selectedNodeId} onNodeSelect={setSelectedNodeId} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
    </main>
  );
}
