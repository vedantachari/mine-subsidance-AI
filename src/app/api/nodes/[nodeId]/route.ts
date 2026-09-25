import { getMockNodeDetail } from "@/data/mock-api";
import { jsonError } from "@/lib/api-response";
import { getLiveNode } from "@/lib/telemetry-store";
import { cloudRiskFromStored, getCloudNode, isDynamoDbAuthError, isDynamoDbEnabled, riskFromSignals } from "@/lib/dynamodb";
import type { NodeDetail, NodeStatus } from "@/types/api";

type RouteContext = {
  params: Promise<{ nodeId: string }>;
};

function numericValue(...values: unknown[]) {
  const value = values.find((candidate) => typeof candidate === "number" && Number.isFinite(candidate));
  return typeof value === "number" ? value : 0;
}

function statusForScore(score: number) {
  return score >= 75 ? "CRITICAL" as const : score >= 45 ? "WARNING" as const : score >= 20 ? "WATCH" as const : "NORMAL" as const;
}

function ensureSignalSamples(detail: NodeDetail) {
  return {
    ...detail,
    tilt: {
      ...detail.tilt,
      samples: detail.tilt.samples?.length
        ? detail.tilt.samples
        : [{ roll_deg: detail.tilt.roll_deg, pitch_deg: detail.tilt.pitch_deg }],
    },
    vibration: {
      ...detail.vibration,
      samples: detail.vibration.samples?.length ? detail.vibration.samples : [detail.vibration.rms_g],
    },
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { nodeId } = await params;
  const normalizedId = nodeId.toUpperCase();
  const currentLiveNode = getLiveNode(normalizedId);
  const currentMockDetail = getMockNodeDetail(normalizedId);
  if (currentLiveNode && currentMockDetail) {
    return Response.json({
      ...currentMockDetail,
      source: "LIVE",
      latitude: currentLiveNode.latitude,
      longitude: currentLiveNode.longitude,
      status: currentLiveNode.status,
      risk_score: currentLiveNode.risk_score,
      last_seen: currentLiveNode.last_seen,
      tilt: {
        ...currentMockDetail.tilt,
        ...currentLiveNode.tilt,
        roll_change_deg: currentLiveNode.risk.tilt_change_deg,
        tilt_rate_deg_per_hour: currentLiveNode.risk.tilt_rate_deg_per_hour,
      },
      vibration: {
        ...currentMockDetail.vibration,
        ...currentLiveNode.vibration,
        anomaly_score: currentLiveNode.risk.vibration_z_score,
      },
    });
  }

  if (isDynamoDbEnabled()) {
    try {
      const cloudNode = await getCloudNode(normalizedId);
      if (!cloudNode) {
        const mockNode = getMockNodeDetail(normalizedId);
        if (mockNode) return Response.json(mockNode);
        return jsonError(`Node ${nodeId} was not found`, 404);
      }
      const fallbackDetail = getMockNodeDetail(normalizedId);
      if (!fallbackDetail) return Response.json(cloudNode);
      const raw = cloudNode as unknown as Record<string, unknown>;
      const rawRisk = raw.risk as Record<string, unknown> | undefined;
      const rawLatitude = numericValue(raw.latitude, raw.location && (raw.location as Record<string, unknown>).latitude);
      const rawLongitude = numericValue(raw.longitude, raw.location && (raw.location as Record<string, unknown>).longitude);
      const liveLatitude = rawLatitude || fallbackDetail.latitude;
      const liveLongitude = rawLongitude || fallbackDetail.longitude;
      const roll = numericValue(raw.roll_deg, raw.tilt && (raw.tilt as Record<string, unknown>).roll_deg, fallbackDetail.tilt.roll_deg);
      const pitch = numericValue(raw.pitch_deg, raw.tilt && (raw.tilt as Record<string, unknown>).pitch_deg, fallbackDetail.tilt.pitch_deg);
      const rms = numericValue(raw.rms_g, raw.vibration && (raw.vibration as Record<string, unknown>).rms_g, fallbackDetail.vibration.rms_g);
      const peak = numericValue(raw.peak_g, raw.vibration && (raw.vibration as Record<string, unknown>).peak_g, fallbackDetail.vibration.peak_g);
      const peakToPeak = numericValue(raw.peak_to_peak_g, raw.vibration && (raw.vibration as Record<string, unknown>).peak_to_peak_g, fallbackDetail.vibration.peak_to_peak_g);
      const frequency = numericValue(raw.dominant_frequency_hz, raw.vibration && (raw.vibration as Record<string, unknown>).dominant_frequency_hz, fallbackDetail.vibration.dominant_frequency_hz);
      const centroid = numericValue(raw.spectral_centroid_hz, raw.vibration && (raw.vibration as Record<string, unknown>).spectral_centroid_hz, fallbackDetail.vibration.spectral_centroid_hz);
      const persistedRiskScore = numericValue(raw.risk_score, rawRisk?.score);
      const rawTilt = raw.tilt as Record<string, unknown> | undefined;
      const signalRisk = riskFromSignals(roll, pitch, rms, peak, {
        rollChangeDeg: numericValue(rawRisk?.tilt_change_deg),
        pitchChangeDeg: numericValue(rawRisk?.pitch_change_deg),
        baselineRollDeg: typeof rawTilt?.baseline_roll_deg === "number" ? rawTilt.baseline_roll_deg : undefined,
        baselinePitchDeg: typeof rawTilt?.baseline_pitch_deg === "number" ? rawTilt.baseline_pitch_deg : undefined,
      });
      const stable = (raw.status_detail as Record<string, unknown> | undefined)?.trend === "STABLE"
        || (Math.abs(Number(rawRisk?.tilt_change_deg ?? 0)) < 0.5 && Math.abs(Number(rawRisk?.vibration_change_g ?? 0)) < 0.02);
      const timestamp = String(raw.last_seen ?? raw.received_at ?? "");
      const cloudRisk = persistedRiskScore
        ? cloudRiskFromStored(normalizedId, persistedRiskScore, raw.status as NodeStatus ?? fallbackDetail.status, stable, timestamp, roll, rms, numericValue(rawRisk?.tilt_change_deg), numericValue(rawRisk?.pitch_change_deg))
        : { score: signalRisk.score, status: signalRisk.status };
      const riskScore = cloudRisk.score ?? fallbackDetail.risk_score;
      const calculatedStatus = persistedRiskScore || rawRisk?.score
        ? statusForScore(riskScore)
        : signalRisk.status;

      return Response.json(ensureSignalSamples({
        ...fallbackDetail,
        ...cloudNode,
        source: "LIVE",
        status: calculatedStatus ?? ((cloudNode as Partial<typeof fallbackDetail>).status ?? fallbackDetail.status),
        latitude: liveLatitude,
        longitude: liveLongitude,
        risk_score: riskScore,
        last_seen: timestamp || fallbackDetail.last_seen,
        status_detail: {
          ...fallbackDetail.status_detail,
          ...(cloudNode as Partial<typeof fallbackDetail>).status_detail,
        },
        location: {
          ...fallbackDetail.location,
          ...(cloudNode as Partial<typeof fallbackDetail>).location,
        },
        tilt: {
          ...fallbackDetail.tilt,
          ...(cloudNode as Partial<typeof fallbackDetail>).tilt,
          roll_deg: roll,
          pitch_deg: pitch,
          roll_change_deg: numericValue(rawRisk?.tilt_change_deg, fallbackDetail.tilt.roll_change_deg),
          tilt_rate_deg_per_hour: numericValue(rawRisk?.tilt_rate_deg_per_hour, fallbackDetail.tilt.tilt_rate_deg_per_hour),
        },
        vibration: {
          ...fallbackDetail.vibration,
          ...(cloudNode as Partial<typeof fallbackDetail>).vibration,
          rms_g: rms,
          peak_g: peak,
          peak_to_peak_g: peakToPeak,
          dominant_frequency_hz: frequency,
          spectral_centroid_hz: centroid,
          anomaly_score: numericValue(rawRisk?.vibration_z_score, fallbackDetail.vibration.anomaly_score),
        },
        network: {
          ...fallbackDetail.network,
          ...(cloudNode as Partial<typeof fallbackDetail>).network,
          rssi_dbm: numericValue(raw.rssi, raw.network && (raw.network as Record<string, unknown>).rssi_dbm, fallbackDetail.network.rssi_dbm),
          snr_db: numericValue(raw.snr, raw.network && (raw.network as Record<string, unknown>).snr_db, fallbackDetail.network.snr_db),
        },
        power: {
          ...fallbackDetail.power,
          ...(cloudNode as Partial<typeof fallbackDetail>).power,
        },
        alerts: cloudNode.alerts ?? fallbackDetail.alerts,
        neighbors: cloudNode.neighbors ?? fallbackDetail.neighbors,
      }));
    } catch (error) {
      if (!isDynamoDbAuthError(error)) console.error("DynamoDB node detail unavailable", error);
    }
  }
  const node = getMockNodeDetail(normalizedId);
  const live = getLiveNode(normalizedId);

  if (!node) return jsonError(`Node ${nodeId} was not found`, 404);
  if (!live) return Response.json(node);

  return Response.json({
    ...node,
    latitude: live.latitude,
    longitude: live.longitude,
    status: live.status,
    risk_score: live.risk_score,
    last_seen: live.last_seen,
    tilt: {
      ...node.tilt,
      roll_deg: live.tilt.roll_deg,
      pitch_deg: live.tilt.pitch_deg,
      samples: live.tilt.samples,
      roll_change_deg: live.risk.tilt_change_deg,
      tilt_rate_deg_per_hour: live.risk.tilt_rate_deg_per_hour,
    },
    vibration: {
      ...node.vibration,
      rms_g: live.vibration.rms_g,
      peak_g: live.vibration.peak_g,
      peak_to_peak_g: live.vibration.peak_to_peak_g,
      dominant_frequency_hz: live.vibration.dominant_frequency_hz,
      anomaly_score: live.risk.vibration_z_score,
      samples: live.vibration.samples,
    },
    network: { ...node.network, ...live.network },
    power: { ...node.power, ...live.power },
    status_detail: {
      trend: live.risk.tilt_change_deg > 0 ? "INCREASING" : "STABLE",
    },
  });
}
