"use client";

import { useEffect, useState } from "react";
import type { NodeSummary } from "@/types/api";

export function useMapNodes() {
  const [nodes, setNodes] = useState<NodeSummary[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/nodes")
      .then((response) => response.json() as Promise<{ nodes: NodeSummary[] }>)
      .then((payload) => {
        if (!cancelled) setNodes(payload.nodes);
      })
      .catch(() => {
        if (!cancelled) setNodes([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return nodes;
}
