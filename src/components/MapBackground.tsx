"use client";

import { useEffect, useRef, useState } from "react";
import { Box } from "lucide-react";
import type { CircleMarker, LatLngExpression, Map as LeafletMap } from "leaflet";
import type { NodeSummary } from "@/types/api";
import type { FilterType } from "@/data/dashboard";
import { nodeStatusColors } from "@/lib/node-status";

const mapCenter: LatLngExpression = [18.621437, 73.912029];

export function MapBackground({ selectedNodeId, onNodeSelect, activeFilter }: { selectedNodeId: string | null; onNodeSelect: (nodeId: string | null) => void; activeFilter: FilterType }) {
  const [is3D, setIs3D] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef(new Map<string, CircleMarker>());
  const hasFittedNodes = useRef(false);

  useEffect(() => {
    let cancelled = false;

    import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: mapCenter,
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });
      const normalLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, opacity: 0.82, className: "normal-map-tiles", attribution: "&copy; OpenStreetMap contributors" });
      const terrainLayer = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, opacity: 0.95, attribution: "Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap" });
      const nodeLayer = L.layerGroup().addTo(map);

      normalLayer.addTo(map);
      L.control.layers({ Normal: normalLayer, Terrain: terrainLayer }, undefined, { position: "topright" }).addTo(map);

      const renderNodes = (nodes: NodeSummary[]) => {
        markerRefs.current.clear();
        nodeLayer.clearLayers();

        nodes.forEach((node) => {
          const color = nodeStatusColors[node.status] ?? "#64748b";
          const matchesFilter = activeFilter === "all"
            || (activeFilter === "warning" && node.status === "WARNING")
            || (activeFilter === "critical" && node.status === "CRITICAL")
            || (activeFilter === "offline" && node.status === "OFFLINE");
          const emphasis = matchesFilter ? 1 : 0.22;
          const isWatch = node.status === "WATCH";
          const isWarning = node.status === "WARNING";
          const isCritical = node.status === "CRITICAL";
          const markerRadius = isCritical ? 13 : isWatch ? 11 : 10;

          if (isWatch || isWarning || isCritical) {
            L.circleMarker([node.latitude, node.longitude], {
              radius: isCritical ? 25 : isWarning ? 19 : 17,
              className: `node-pulse node-pulse-${node.status.toLowerCase()}`,
              color,
              fillColor: color,
              fillOpacity: 0,
              opacity: matchesFilter ? 0.75 : 0.08,
              weight: 2,
              interactive: false,
            }).addTo(nodeLayer);
          }

          const marker = L.circleMarker([node.latitude, node.longitude], { radius: markerRadius + (matchesFilter && activeFilter !== "all" ? 3 : 0), fillColor: color, color: "white", weight: 3, opacity: emphasis, fillOpacity: emphasis })
            .bindPopup(`<strong>${node.node_id}</strong><br />Status: ${node.status}<br />Risk score: ${node.risk_score}`)
            .addTo(nodeLayer);
          marker.on("dblclick", () => onNodeSelect(node.node_id));
          markerRefs.current.set(node.node_id, marker);
        });
      };

      const refreshNodes = () => fetch("/api/nodes")
        .then((response) => response.json() as Promise<{ nodes: NodeSummary[] }>)
        .then(({ nodes }) => {
          if (!cancelled) {
            renderNodes(nodes);
            if (!hasFittedNodes.current && nodes.length) {
              map.fitBounds(nodes.map((node) => [node.latitude, node.longitude] as [number, number]), { padding: [36, 36], maxZoom: 15 });
              hasFittedNodes.current = true;
            }
          }
        })
        .catch(() => undefined);

      refreshNodes();
      const interval = window.setInterval(refreshNodes, 5000);

      mapRef.current = map;
      map.on("unload", () => window.clearInterval(interval));
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [activeFilter, onNodeSelect]);

  useEffect(() => {
    if (!selectedNodeId || !mapRef.current) return;
    const marker = markerRefs.current.get(selectedNodeId);
    if (!marker || !marker.getElement()) return;

    mapRef.current.setView(marker.getLatLng(), 16, { animate: true });
    marker.openPopup();
    marker.setStyle({ radius: 14, weight: 4 });

    return () => {
      if (marker.getElement()) marker.setStyle({ radius: 10, weight: 2 });
    };
  }, [selectedNodeId]);

  return (
    <div className={`map-scene absolute inset-0 ${is3D ? "map-scene-3d" : ""}`}>
      <div ref={containerRef} className="map-viewport absolute inset-0 h-full w-full bg-[#f0f0f0]" />
      <button
        type="button"
        onClick={() => setIs3D((current) => !current)}
        aria-pressed={is3D}
        aria-label={is3D ? "Switch to 2D map view" : "Switch to 3D map view"}
        title={is3D ? "Switch to 2D map view" : "Switch to 3D map view"}
        className={`absolute bottom-6 right-6 z-[900] flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold shadow-lg backdrop-blur-md transition-all ${
          is3D
            ? "border-zinc-900 bg-zinc-900 text-white"
            : "border-white/80 bg-white/90 text-zinc-800 hover:bg-white"
        }`}
      >
        <Box size={16} />
        {is3D ? "3D" : "2D"}
      </button>
    </div>
  );
}
