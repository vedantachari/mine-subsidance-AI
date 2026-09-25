import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SubsidenceEngine } from "../../src/lib/subsidence-engine";
import type { GatewayTelemetry } from "../../src/types/telemetry";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const engines = new Map<string, SubsidenceEngine>();
const nodesTable = process.env.DYNAMODB_NODES_TABLE ?? "mine-nodes";
const historyTable = process.env.DYNAMODB_HISTORY_TABLE ?? "mine-telemetry-history";
const STABLE_TILT_DELTA = 0.5;
const STABLE_VIBRATION_DELTA = 0.02;

const numberOr = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

export async function handler(event: GatewayTelemetry) {
  const nodeId = String(event.node_id ?? event.n ?? "").toUpperCase();
  if (!nodeId) throw new Error("IoT event is missing node_id or n");

  const engine = engines.get(nodeId) ?? new SubsidenceEngine();
  engines.set(nodeId, engine);
  const previousResponse = await client.send(new GetCommand({ TableName: nodesTable, Key: { node_id: nodeId } }));
  const previous = previousResponse.Item;
  const tiltSamples = event.tilt?.filter((sample) => Number.isFinite(sample.roll_deg) && Number.isFinite(sample.pitch_deg)) ?? [];
  const vibrationSamples = event.vibration?.filter((sample) => Number.isFinite(sample)) ?? [];
  const rollDeg = tiltSamples.length
    ? tiltSamples.reduce((sum, sample) => sum + sample.roll_deg, 0) / tiltSamples.length
    : numberOr(event.roll_deg ?? event.r);
  const pitchDeg = tiltSamples.length
    ? tiltSamples.reduce((sum, sample) => sum + sample.pitch_deg, 0) / tiltSamples.length
    : numberOr(event.pitch_deg ?? event.p);
  const rmsG = vibrationSamples.length
    ? Math.sqrt(vibrationSamples.reduce((sum, sample) => sum + sample * sample, 0) / vibrationSamples.length)
    : numberOr(event.vibration_rms_g ?? event.v);
  const peakG = numberOr(event.peak_g ?? event.pk);
  const peakToPeakG = numberOr(event.peak_to_peak_g ?? event.pp);
  const frequencyHz = numberOr(event.dominant_frequency_hz ?? event.f);
  const spectralCentroidHz = numberOr(event.c);
  let risk = engine.analyze({ rollDeg, pitchDeg, vibrationRmsG: rmsG, peakG, dominantFrequencyHz: frequencyHz });
  const previousTilt = previous?.tilt as {
    roll_deg?: number;
    pitch_deg?: number;
    baseline_roll_deg?: number;
    baseline_pitch_deg?: number;
    samples?: unknown[];
  } | undefined;
  const previousVibration = previous?.vibration as { rms_g?: number; samples?: unknown[] } | undefined;
  const previousTiltSamples = Array.isArray(previousTilt?.samples)
    ? previousTilt.samples.filter((sample): sample is { roll_deg: number; pitch_deg: number } => {
      if (typeof sample !== "object" || sample === null) return false;
      const candidate = sample as Record<string, unknown>;
      return typeof candidate.roll_deg === "number" && Number.isFinite(candidate.roll_deg)
        && typeof candidate.pitch_deg === "number" && Number.isFinite(candidate.pitch_deg);
    })
    : [];
  const previousVibrationSamples = Array.isArray(previousVibration?.samples)
    ? previousVibration.samples.filter((sample): sample is number => typeof sample === "number" && Number.isFinite(sample))
    : [];
  const retainedTiltSamples = [...previousTiltSamples, ...tiltSamples].slice(-120);
  const retainedVibrationSamples = [...previousVibrationSamples, ...vibrationSamples].slice(-120);
  const previousRisk = previous?.risk as { score?: number } | undefined;
  const previousRiskScore = numberOr(previous?.risk_score, typeof previousRisk?.score === "number" ? previousRisk.score : 0);
  const hasPreviousRisk = previousRiskScore > 0;
  const isStable = hasPreviousRisk
    && Math.abs(rollDeg - numberOr(previousTilt?.roll_deg, rollDeg)) < STABLE_TILT_DELTA
    && Math.abs(pitchDeg - numberOr(previousTilt?.pitch_deg, pitchDeg)) < STABLE_TILT_DELTA
    && Math.abs(rmsG - numberOr(previousVibration?.rms_g, rmsG)) < STABLE_VIBRATION_DELTA;
  if (isStable) {
    const stableScore = Math.max(0, previousRiskScore - 10);
    risk = { ...risk, score: stableScore, level: stableScore >= 75 ? "CRITICAL" : stableScore >= 45 ? "WARNING" : stableScore >= 20 ? "WATCH" : "NORMAL", warning: stableScore >= 45 };
    engine.applyScore(stableScore);
  }
  const now = event.received_at ?? event.timestamp ?? new Date().toISOString();
  const latitude = numberOr(event.latitude ?? event.la);
  const longitude = numberOr(event.longitude ?? event.lo);
  const hasGpsFix = Boolean(event.gps_fix ?? (latitude !== 0 || longitude !== 0));
  const item = {
    node_id: nodeId,
    source: "LIVE",
    updated_at: now,
    last_seen: now,
    latitude,
    longitude,
    status: risk.level,
    risk_score: risk.score,
    status_detail: { trend: isStable ? "STABLE" : risk.tilt_change_deg > 0 ? "INCREASING" : "STABLE" },
    location: {
      latitude,
      longitude,
      altitude_m: numberOr(event.altitude_m ?? event.alt),
      gps_fix: hasGpsFix,
      satellites: numberOr(event.satellites ?? event.s),
    },
    tilt: {
      roll_deg: rollDeg,
      pitch_deg: pitchDeg,
      samples: retainedTiltSamples.length ? retainedTiltSamples : [{ roll_deg: rollDeg, pitch_deg: pitchDeg }],
      baseline_roll_deg: numberOr(previousTilt?.baseline_roll_deg, rollDeg),
      baseline_pitch_deg: numberOr(previousTilt?.baseline_pitch_deg, pitchDeg),
      roll_change_deg: risk.tilt_change_deg,
      pitch_change_deg: 0,
      tilt_rate_deg_per_hour: risk.tilt_rate_deg_per_hour,
    },
    vibration: {
      sampling_rate_hz: 200,
      window_seconds: 5,
      rms_g: rmsG,
      peak_g: peakG,
      peak_to_peak_g: peakToPeakG,
      dominant_frequency_hz: frequencyHz,
      samples: retainedVibrationSamples.length ? retainedVibrationSamples : [rmsG],
      spectral_centroid_hz: spectralCentroidHz,
      anomaly_score: risk.vibration_z_score,
      classification: {
        label: risk.level === "NORMAL" ? "BACKGROUND" : "UNKNOWN_ANOMALY",
        confidence: 0.87,
      },
    },
    network: {
      rssi_dbm: numberOr(event.rssi_dbm ?? event.rssi),
      snr_db: numberOr(event.snr_db ?? event.snr),
      hop_count: 0,
      link_status: "GOOD",
    },
    power: {
      battery_percent: numberOr(event.battery_percent ?? event.battery),
      battery_voltage_v: 0,
      solar_status: "NOT_CONNECTED",
    },
    risk,
    alerts: risk.level === "NORMAL" ? [] : [{
      alert_id: `LIVE_${nodeId}`,
      severity: risk.level === "WATCH" ? "WATCH" : risk.level,
      type: "SUBSIDENCE_RISK",
      message: `${risk.level.toLowerCase()} subsidence risk detected from tilt and vibration samples`,
      created_at: now,
      acknowledged: false,
    }],
    neighbors: [],
  };

  await Promise.all([
    client.send(new PutCommand({ TableName: nodesTable, Item: item })),
    client.send(new PutCommand({ TableName: historyTable, Item: { ...item, received_at: now } })),
  ]);

  return { accepted: true, node_id: nodeId, risk_score: risk.score, status: risk.level };
}
