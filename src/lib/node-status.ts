import type { NodeStatus } from "@/types/api";

export const nodeStatusColors: Record<NodeStatus, string> = {
  NORMAL: "#10b981",
  WATCH: "#f59e0b",
  WARNING: "#f97316",
  CRITICAL: "#ef4444",
  OFFLINE: "#64748b",
};
