export type StatusTone = "normal" | "watch" | "warning" | "critical";
export type AlertStatus = "critical" | "warning";
export type NetworkStatus = "online" | "offline";
export type FilterType = "all" | "warning" | "critical" | "offline";

export type StatusSummary = {
  label: string;
  value: number;
  tone: StatusTone;
};

export type Alert = {
  node: string;
  status: AlertStatus;
  message: string;
  time: string;
};

export type NetworkMetric = {
  label: string;
  value: number;
  status: NetworkStatus;
};

export type Filter = {
  id: FilterType;
  label: string;
  count: number;
};

export const statusSummary: StatusSummary[] = [
  { label: "Normal", value: 42, tone: "normal" },
  { label: "Watch", value: 3, tone: "watch" },
  { label: "Warning", value: 2, tone: "warning" },
  { label: "Critical", value: 1, tone: "critical" },
];

export const alerts: Alert[] = [
  {
    node: "NODE_024",
    status: "critical",
    message: "Critical subsidence risk",
    time: "2 min ago",
  },
  {
    node: "NODE_017",
    status: "warning",
    message: "Increasing deformation",
    time: "6 min ago",
  },
];

export const networkMetrics: NetworkMetric[] = [
  { label: "Online", value: 48, status: "online" },
  { label: "Offline", value: 2, status: "offline" },
];

export const filters: Filter[] = [
  { id: "all", label: "All", count: 50 },
  { id: "warning", label: "Warning", count: 2 },
  { id: "critical", label: "Critical", count: 1 },
  { id: "offline", label: "Offline", count: 2 },
];
