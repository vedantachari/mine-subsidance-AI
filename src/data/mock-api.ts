import type {
  DashboardOverview,
  NodeDetail,
  NodeHistory,
  NodeSummary,
} from "@/types/api";

const updatedAt = "2026-09-05T17:42:31Z";
const liveNodeLatitude = 18.621437;
const liveNodeLongitude = 73.912029;

const dummyNodes: NodeSummary[] = Array.from({ length: 23 }, (_, index) => {
  const angle = index * 2.399963 + Math.sin(index * 4.71) * 0.42;
  const distance = 0.00065 + ((index * 17) % 23) * 0.0001 + Math.cos(index * 2.13) * 0.00012;
  const status = index === 22 ? "CRITICAL" : index >= 20 ? "WARNING" : index >= 16 ? "WATCH" : "NORMAL";
  const riskScore = status === "CRITICAL" ? 94 : status === "WARNING" ? 68 + (index % 2) * 7 : status === "WATCH" ? 38 + (index % 4) * 6 : 8 + (index % 5) * 4;

  return {
    node_id: `NODE_${String(index + 2).padStart(3, "0")}`,
    latitude: Number((liveNodeLatitude + Math.sin(angle) * distance).toFixed(6)),
    longitude: Number((liveNodeLongitude + Math.cos(angle) * distance).toFixed(6)),
    status,
    risk_score: riskScore,
    last_seen: updatedAt,
  };
});

export const mockDashboard: DashboardOverview = {
  system: { status: "OPERATIONAL", last_updated: updatedAt },
  mine: {
    total_nodes: 25,
    normal_nodes: 17,
    watch_nodes: 4,
    warning_nodes: 2,
    critical_nodes: 1,
    offline_nodes: 1,
  },
  network: {
    gateway_status: "ONLINE",
    gateway_id: "GW_001",
    mesh_health_percent: 94,
    nodes_online: 24,
    nodes_offline: 1,
  },
  alerts: [
    {
      alert_id: "ALT_1024",
      node_id: "NODE_024",
      severity: "CRITICAL",
      type: "SUBSIDENCE_RISK",
      message: "Rapid increase in deformation detected",
      time: "2026-09-05T17:40:12Z",
    },
    {
      alert_id: "ALT_1023",
      node_id: "NODE_017",
      severity: "WARNING",
      type: "VIBRATION_ANOMALY",
      message: "Unusual vibration pattern detected",
      time: "2026-09-05T17:36:48Z",
    },
    {
      alert_id: "ALT_1022",
      node_id: "NODE_031",
      severity: "WATCH",
      type: "TILT_INCREASE",
      message: "Tilt increasing above baseline",
      time: "2026-09-05T17:31:21Z",
    },
  ],
};

const baseMockNodes: NodeSummary[] = [
  { node_id: "NODE_001", latitude: liveNodeLatitude, longitude: liveNodeLongitude, status: "NORMAL", risk_score: 12, last_seen: updatedAt },
  { node_id: "NODE_002", latitude: 18.5981, longitude: 73.9256, status: "NORMAL", risk_score: 18, last_seen: updatedAt },
  { node_id: "NODE_003", latitude: 18.5947, longitude: 73.9272, status: "NORMAL", risk_score: 9, last_seen: updatedAt },
  { node_id: "NODE_004", latitude: 18.5929, longitude: 73.9221, status: "NORMAL", risk_score: 15, last_seen: updatedAt },
  { node_id: "NODE_005", latitude: 18.6002, longitude: 73.9218, status: "NORMAL", risk_score: 21, last_seen: updatedAt },
  { node_id: "NODE_006", latitude: 18.6016, longitude: 73.9251, status: "NORMAL", risk_score: 17, last_seen: updatedAt },
  { node_id: "NODE_007", latitude: 18.6031, longitude: 73.9294, status: "NORMAL", risk_score: 11, last_seen: updatedAt },
  { node_id: "NODE_008", latitude: 18.5989, longitude: 73.9312, status: "NORMAL", risk_score: 24, last_seen: updatedAt },
  { node_id: "NODE_009", latitude: 18.5942, longitude: 73.9318, status: "NORMAL", risk_score: 19, last_seen: updatedAt },
  { node_id: "NODE_010", latitude: 18.5908, longitude: 73.9287, status: "NORMAL", risk_score: 13, last_seen: updatedAt },
  { node_id: "NODE_011", latitude: 18.5897, longitude: 73.9244, status: "NORMAL", risk_score: 16, last_seen: updatedAt },
  { node_id: "NODE_012", latitude: 18.5916, longitude: 73.9198, status: "NORMAL", risk_score: 22, last_seen: updatedAt },
  { node_id: "NODE_013", latitude: 18.5954, longitude: 73.9167, status: "NORMAL", risk_score: 14, last_seen: updatedAt },
  { node_id: "NODE_014", latitude: 18.5997, longitude: 73.9179, status: "NORMAL", risk_score: 20, last_seen: updatedAt },
  { node_id: "NODE_015", latitude: 18.6038, longitude: 73.9188, status: "NORMAL", risk_score: 10, last_seen: updatedAt },
  { node_id: "NODE_016", latitude: 18.6062, longitude: 73.9236, status: "NORMAL", risk_score: 25, last_seen: updatedAt },
  { node_id: "NODE_018", latitude: 18.6068, longitude: 73.9282, status: "NORMAL", risk_score: 23, last_seen: updatedAt },
  { node_id: "NODE_019", latitude: 18.6019, longitude: 73.9339, status: "WATCH", risk_score: 43, last_seen: updatedAt },
  { node_id: "NODE_020", latitude: 18.5968, longitude: 73.9342, status: "WATCH", risk_score: 51, last_seen: updatedAt },
  { node_id: "NODE_021", latitude: 18.5888, longitude: 73.9311, status: "WATCH", risk_score: 58, last_seen: updatedAt },
  { node_id: "NODE_017", latitude: 18.5869, longitude: 73.9248, status: "WARNING", risk_score: 74, last_seen: "2026-09-05T17:42:20Z" },
  { node_id: "NODE_022", latitude: 18.5902, longitude: 73.9162, status: "WARNING", risk_score: 69, last_seen: updatedAt },
  { node_id: "NODE_024", latitude: 18.6007, longitude: 73.9306, status: "CRITICAL", risk_score: 93, last_seen: "2026-09-05T17:42:18Z" },
  { node_id: "NODE_023", latitude: 18.6051, longitude: 73.9159, status: "OFFLINE", risk_score: 0, last_seen: "2026-09-05T15:12:08Z" },
  { node_id: "NODE_031", latitude: 18.6041, longitude: 73.9325, status: "WATCH", risk_score: 58, last_seen: "2026-09-05T17:41:55Z" },
];

export const mockNodes: NodeSummary[] = [
  baseMockNodes[0],
  ...dummyNodes,
];

export const mockNodeDetails: Record<string, NodeDetail> = {
  "NODE_024": {
    ...mockNodes.find((node) => node.node_id === "NODE_024")!,
    status_detail: { trend: "INCREASING" },
    location: { altitude_m: 128.42, gps_fix: true, satellites: 12 },
    tilt: { roll_deg: 1.82, pitch_deg: 0.94, samples: Array.from({ length: 24 }, (_, index) => ({ roll_deg: Number((0.34 + 1.48 * (index + 1) / 24).toFixed(3)), pitch_deg: Number((0.21 + 0.73 * (index + 1) / 24).toFixed(3)) })), baseline_roll_deg: 0.34, baseline_pitch_deg: 0.21, roll_change_deg: 1.48, pitch_change_deg: 0.73, tilt_rate_deg_per_hour: 0.19 },
    vibration: { sampling_rate_hz: 200, window_seconds: 5, samples: Array.from({ length: 24 }, (_, index) => Number((0.018 + 0.066 * (index + 1) / 24 + Math.sin(index * 1.7) * 0.004).toFixed(4))), rms_g: 0.0842, peak_g: 0.2914, peak_to_peak_g: 0.4721, dominant_frequency_hz: 18.36, spectral_centroid_hz: 22.14, anomaly_score: 0.92, classification: { label: "UNKNOWN_ANOMALY", confidence: 0.87 } },
    network: { rssi_dbm: -68, snr_db: 8.7, hop_count: 2, link_status: "GOOD" },
    power: { battery_percent: 82, battery_voltage_v: 3.91, solar_status: "CHARGING" },
    alerts: [{ alert_id: "ALT_1024", severity: "CRITICAL", type: "SUBSIDENCE_RISK", message: "Rapid increase in deformation detected", created_at: "2026-09-05T17:40:12Z", acknowledged: false }],
    neighbors: [{ node_id: "NODE_017", status: "WARNING", distance_m: 42.7, risk_score: 74 }, { node_id: "NODE_031", status: "WATCH", distance_m: 51.3, risk_score: 58 }],
  },
};

export function getMockNodeDetail(nodeId: string): NodeDetail | undefined {
  const existing = mockNodeDetails[nodeId];
  if (existing) return existing;

  const node = mockNodes.find((item) => item.node_id === nodeId);
  if (!node) return undefined;

  const isOffline = node.status === "OFFLINE";
  const riskFactor = node.risk_score / 100;

  return {
    ...node,
    status_detail: { trend: node.status === "NORMAL" ? "STABLE" : "INCREASING" },
    location: { altitude_m: 126 + node.risk_score / 10, gps_fix: !isOffline, satellites: isOffline ? 0 : 10 },
    tilt: { roll_deg: Number((0.3 + riskFactor).toFixed(2)), pitch_deg: Number((0.15 + riskFactor / 2).toFixed(2)), samples: Array.from({ length: 24 }, (_, index) => ({ roll_deg: Number((0.3 + riskFactor * (index + 1) / 24).toFixed(3)), pitch_deg: Number((0.15 + riskFactor * (index + 1) / 48).toFixed(3)) })), baseline_roll_deg: 0.31, baseline_pitch_deg: 0.18, roll_change_deg: Number((riskFactor / 2).toFixed(2)), pitch_change_deg: Number((riskFactor / 3).toFixed(2)), tilt_rate_deg_per_hour: Number((riskFactor / 5).toFixed(2)) },
    vibration: { sampling_rate_hz: 200, window_seconds: 5, samples: Array.from({ length: 36 }, (_, index) => Number((0.012 + riskFactor * (index + 1) / 72 + Math.sin(index * 1.7) * 0.003).toFixed(4))), rms_g: Number((0.018 + riskFactor / 10).toFixed(4)), peak_g: Number((0.05 + riskFactor / 2).toFixed(4)), peak_to_peak_g: Number((0.08 + riskFactor).toFixed(4)), dominant_frequency_hz: 18.36, spectral_centroid_hz: 22.14, anomaly_score: Number((riskFactor * 0.9).toFixed(2)), classification: { label: node.status === "NORMAL" ? "BACKGROUND" : "UNKNOWN_ANOMALY", confidence: 0.87 } },
    network: { rssi_dbm: isOffline ? -120 : -67, snr_db: isOffline ? 0 : 8.2, hop_count: isOffline ? 0 : 2, link_status: isOffline ? "LOST" : "GOOD" },
    power: { battery_percent: isOffline ? 31 : 87, battery_voltage_v: isOffline ? 3.42 : 3.91, solar_status: isOffline ? "NOT_CONNECTED" : "CHARGING" },
    alerts: [],
    neighbors: [],
  };
}

export const mockHistory: NodeHistory = {
  node_id: "NODE_024",
  range: "24h",
  data: [
    { timestamp: "2026-09-05T12:00:00Z", tilt_roll_deg: 0.41, tilt_pitch_deg: 0.19, vibration_rms_g: 0.018, anomaly_score: 0.08, risk_score: 11 },
    { timestamp: "2026-09-05T14:00:00Z", tilt_roll_deg: 0.59, tilt_pitch_deg: 0.31, vibration_rms_g: 0.021, anomaly_score: 0.14, risk_score: 23 },
    { timestamp: "2026-09-05T16:00:00Z", tilt_roll_deg: 1.21, tilt_pitch_deg: 0.62, vibration_rms_g: 0.047, anomaly_score: 0.61, risk_score: 58 },
    { timestamp: "2026-09-05T17:40:00Z", tilt_roll_deg: 1.82, tilt_pitch_deg: 0.94, vibration_rms_g: 0.084, anomaly_score: 0.92, risk_score: 93 },
  ],
};
