export type NodeStatus = "NORMAL" | "WATCH" | "WARNING" | "CRITICAL" | "OFFLINE";
export type AlertSeverity = "CRITICAL" | "WARNING" | "WATCH";

export type DashboardOverview = {
  system: {
    status: "OPERATIONAL" | "DEGRADED" | "OFFLINE";
    last_updated: string;
  };
  mine: {
    total_nodes: number;
    normal_nodes: number;
    watch_nodes: number;
    warning_nodes: number;
    critical_nodes: number;
    offline_nodes: number;
  };
  network: {
    gateway_status: "ONLINE" | "OFFLINE";
    gateway_id: string;
    mesh_health_percent: number;
    nodes_online: number;
    nodes_offline: number;
  };
  alerts: DashboardAlert[];
};

export type DashboardAlert = {
  alert_id: string;
  node_id: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  time: string;
};

export type NodeSummary = {
  node_id: string;
  source?: "LIVE" | "MOCK";
  latitude: number;
  longitude: number;
  status: NodeStatus;
  risk_score: number;
  last_seen: string;
};

export type NodeDetail = NodeSummary & {
  status_detail: {
    trend: "INCREASING" | "STABLE" | "DECREASING";
  };
  location: {
    altitude_m: number;
    gps_fix: boolean;
    satellites: number;
  };
  tilt: {
    roll_deg: number;
    pitch_deg: number;
    samples?: Array<{ roll_deg: number; pitch_deg: number }>;
    baseline_roll_deg: number;
    baseline_pitch_deg: number;
    roll_change_deg: number;
    pitch_change_deg: number;
    tilt_rate_deg_per_hour: number;
  };
  vibration: {
    sampling_rate_hz: number;
    window_seconds: number;
    rms_g: number;
    peak_g: number;
    peak_to_peak_g: number;
    dominant_frequency_hz: number;
    spectral_centroid_hz: number;
    anomaly_score: number;
    samples?: number[];
    classification: {
      label: string;
      confidence: number;
    };
  };
  network: {
    rssi_dbm: number;
    snr_db: number;
    hop_count: number;
    link_status: "GOOD" | "DEGRADED" | "LOST";
  };
  power: {
    battery_percent: number;
    battery_voltage_v: number;
    solar_status: "CHARGING" | "DISCHARGING" | "NOT_CONNECTED";
  };
  alerts: NodeAlert[];
  neighbors: NodeNeighbor[];
};

export type NodeAlert = {
  alert_id: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  created_at: string;
  acknowledged: boolean;
};

export type NodeNeighbor = {
  node_id: string;
  status: NodeStatus;
  distance_m: number;
  risk_score: number;
};

export type NodeHistory = {
  node_id: string;
  range: "24h" | "7d" | "30d";
  data: Array<{
    timestamp: string;
    tilt_roll_deg: number;
    tilt_pitch_deg: number;
    vibration_rms_g: number;
    anomaly_score: number;
    risk_score: number;
  }>;
};
