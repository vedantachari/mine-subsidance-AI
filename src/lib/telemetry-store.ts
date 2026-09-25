import { mockNodes } from "@/data/mock-api";
import { SubsidenceEngine } from "@/lib/subsidence-engine";
import type { NodeStatus } from "@/types/api";
import type { NodeSummary } from "@/types/api";
import type { AnalyzedTelemetry, GatewayTelemetry } from "@/types/telemetry";

const engines = new Map<string, SubsidenceEngine>();
const liveNodes = new Map<string, AnalyzedTelemetry>();
const liveAlerts = new Map<string, NodeSummary["status"]>();
const sampleHistory = new Map<string, {
  tilt: Array<{ roll_deg: number; pitch_deg: number }>;
  vibration: number[];
}>();

const MAX_SAMPLES = 120;
const RISK_WINDOW_SAMPLES = 12;

function numberOr(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function coordinateOr(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value !== 0
    ? value
    : fallback;
}

function rms(values: number[]) {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
}

function statusForScore(score: number): NodeStatus {
  return score >= 75 ? "CRITICAL" : score >= 45 ? "WARNING" : score >= 20 ? "WATCH" : "NORMAL";
}

export function processTelemetry(payload: GatewayTelemetry): AnalyzedTelemetry {
  const nodeId = (payload.node_id ?? payload.n ?? "").trim().toUpperCase();
  if (!nodeId) throw new Error("Telemetry is missing node_id or n");

  const fallback = mockNodes.find((node) => node.node_id === nodeId);
  const history = sampleHistory.get(nodeId) ?? { tilt: [], vibration: [] };
  const incomingTilt = payload.tilt?.filter((sample) => Number.isFinite(sample.roll_deg) && Number.isFinite(sample.pitch_deg))
    ?? [{ roll_deg: numberOr(payload.roll_deg ?? payload.r, 0), pitch_deg: numberOr(payload.pitch_deg ?? payload.p, 0) }];
  const incomingVibration = payload.vibration?.filter((sample) => Number.isFinite(sample))
    ?? [numberOr(payload.vibration_rms_g ?? payload.v, 0)];
  history.tilt.push(...incomingTilt);
  history.vibration.push(...incomingVibration);
  history.tilt = history.tilt.slice(-MAX_SAMPLES);
  history.vibration = history.vibration.slice(-MAX_SAMPLES);
  sampleHistory.set(nodeId, history);

  const riskTiltSamples = history.tilt.slice(-RISK_WINDOW_SAMPLES);
  const riskVibrationSamples = history.vibration.slice(-RISK_WINDOW_SAMPLES);
  const rollDeg = riskTiltSamples.length
    ? riskTiltSamples.reduce((sum, sample) => sum + sample.roll_deg, 0) / riskTiltSamples.length
    : numberOr(payload.roll_deg ?? payload.r, 0);
  const pitchDeg = riskTiltSamples.length
    ? riskTiltSamples.reduce((sum, sample) => sum + sample.pitch_deg, 0) / riskTiltSamples.length
    : numberOr(payload.pitch_deg ?? payload.p, 0);
  const vibrationRmsG = riskVibrationSamples.length
    ? rms(riskVibrationSamples)
    : numberOr(payload.vibration_rms_g ?? payload.v, 0);
  const peakG = numberOr(payload.peak_g ?? payload.pk, riskVibrationSamples.length ? Math.max(...riskVibrationSamples) : vibrationRmsG);
  const dominantFrequencyHz = numberOr(payload.dominant_frequency_hz ?? payload.f, 0);
  const engine = engines.get(nodeId) ?? new SubsidenceEngine();
  engines.set(nodeId, engine);
  const previousNode = liveNodes.get(nodeId);
  let risk = engine.analyze({ rollDeg, pitchDeg, vibrationRmsG, peakG, dominantFrequencyHz });
  const stable = previousNode
    && Math.abs(rollDeg - previousNode.tilt.roll_deg) < 0.5
    && Math.abs(pitchDeg - previousNode.tilt.pitch_deg) < 0.5
    && Math.abs(vibrationRmsG - previousNode.vibration.rms_g) < 0.02;
  if (stable) {
    const score = Math.max(0, previousNode.risk_score - 10);
    risk = { ...risk, score, level: statusForScore(score), warning: score >= 45 };
    engine.applyScore(score);
  }
  const timestamp = payload.received_at ?? payload.timestamp ?? new Date().toISOString();
  const status: NodeStatus = risk.level;
  if (status === "NORMAL" || status === "OFFLINE") liveAlerts.delete(nodeId);
  else liveAlerts.set(nodeId, status);

  const analyzed: AnalyzedTelemetry = {
    node_id: nodeId,
    latitude: coordinateOr(payload.latitude ?? payload.la, fallback?.latitude ?? 18.621437),
    longitude: coordinateOr(payload.longitude ?? payload.lo, fallback?.longitude ?? 73.912029),
    status,
    risk_score: risk.score,
    last_seen: timestamp,
    tilt: { roll_deg: rollDeg, pitch_deg: pitchDeg, samples: history.tilt },
    vibration: {
      rms_g: vibrationRmsG,
      peak_g: peakG,
      peak_to_peak_g: numberOr(payload.peak_to_peak_g ?? payload.pp, 0),
      dominant_frequency_hz: dominantFrequencyHz,
      samples: history.vibration,
    },
    network: { rssi_dbm: numberOr(payload.rssi_dbm ?? payload.rssi, 0), snr_db: numberOr(payload.snr_db ?? payload.snr, 0) },
    power: { battery_percent: numberOr(payload.battery_percent ?? payload.battery, 0) },
    risk,
  };

  liveNodes.set(nodeId, analyzed);
  return analyzed;
}

export function getLiveNodes() {
  return [...liveNodes.values()];
}

export function getLiveNode(nodeId: string) {
  return liveNodes.get(nodeId);
}

export function getLiveAlerts() {
  return [...liveAlerts.entries()].map(([nodeId, severity]) => ({
    alert_id: `LIVE_${nodeId}`,
    node_id: nodeId,
    severity: severity === "WATCH" ? "WATCH" : severity,
    type: "SUBSIDENCE_RISK",
    message: `${severity.toLowerCase()} subsidence risk detected from tilt and vibration samples`,
    time: liveNodes.get(nodeId)?.last_seen ?? new Date().toISOString(),
  }));
}

export function getCurrentNodeSummaries(): NodeSummary[] {
  return mockNodes.map((mockNode) => {
    const liveNode = liveNodes.get(mockNode.node_id);
    if (!liveNode) return { ...mockNode, source: "MOCK" as const };

    return {
      node_id: liveNode.node_id,
      source: "LIVE" as const,
      latitude: liveNode.latitude,
      longitude: liveNode.longitude,
      status: liveNode.status,
      risk_score: liveNode.risk_score,
      last_seen: liveNode.last_seen,
    };
  }).concat(
    getLiveNodes()
      .filter((liveNode) => !mockNodes.some((mockNode) => mockNode.node_id === liveNode.node_id))
      .map((liveNode) => ({
        node_id: liveNode.node_id,
        source: "LIVE" as const,
        latitude: liveNode.latitude,
        longitude: liveNode.longitude,
        status: liveNode.status,
        risk_score: liveNode.risk_score,
        last_seen: liveNode.last_seen,
      })),
  );
}
