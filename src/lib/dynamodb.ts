import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { DashboardOverview, NodeDetail, NodeHistory, NodeStatus, NodeSummary } from "@/types/api";
import { mockNodes } from "@/data/mock-api";
import type { AnalyzedTelemetry } from "@/types/telemetry";

const enabled = process.env.AWS_DYNAMODB_ENABLED === "true";
const nodesTable = process.env.DYNAMODB_NODES_TABLE ?? "mine-nodes";
const historyTable = process.env.DYNAMODB_HISTORY_TABLE ?? "mine-telemetry-history";
const STABLE_TILT_DELTA = 0.5;
const STABLE_VIBRATION_DELTA = 0.02;
const RISK_DECAY_INTERVAL_MS = 5000;
const RISK_DECAY_STEP = 10;
type CloudRiskState = { timestamp: string; score: number; tilt: number; vibration: number; lastDecayAt: number };
const processState = globalThis as typeof globalThis & { __cloudRiskState?: Map<string, CloudRiskState> };
const cloudRiskState = processState.__cloudRiskState ??= new Map<string, CloudRiskState>();

const client = enabled
  ? DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-south-1" }))
  : null;

export function isDynamoDbEnabled() {
  return enabled && client !== null;
}

export function isDynamoDbAuthError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  return name === "UnrecognizedClientException"
    || name === "InvalidClientTokenId"
    || message.includes("security token included in the request is invalid");
}

export function riskFromSignals(
  rollDeg: number,
  pitchDeg: number,
  rmsG: number,
  peakG: number,
  options?: { rollChangeDeg?: number; pitchChangeDeg?: number; baselineRollDeg?: number; baselinePitchDeg?: number },
) {
  const baselineRoll = options?.baselineRollDeg;
  const baselinePitch = options?.baselinePitchDeg;
  const hasBaseline = typeof baselineRoll === "number" && Number.isFinite(baselineRoll)
    && typeof baselinePitch === "number" && Number.isFinite(baselinePitch);
  const rollChange = options?.rollChangeDeg ?? (hasBaseline ? rollDeg - baselineRoll : 0);
  const pitchChange = options?.pitchChangeDeg ?? (hasBaseline ? pitchDeg - baselinePitch : 0);
  const tilt = Math.hypot(rollChange, pitchChange);
  const tiltScore = tilt >= 2 ? 70 : tilt >= 1 ? 45 : tilt >= 0.5 ? 20 : 0;
  const vibration = Math.max(rmsG, peakG);
  const vibrationScore = vibration >= 0.06 ? 70 : vibration >= 0.03 ? 45 : vibration >= 0.015 ? 20 : 0;
  const score = Math.min(100, tiltScore + vibrationScore + (tiltScore > 0 && vibrationScore > 0 ? 15 : 0));
  return {
    score,
    status: score >= 75 ? "CRITICAL" as const : score >= 45 ? "WARNING" as const : score >= 20 ? "WATCH" as const : "NORMAL" as const,
  };
}

export function cloudRiskFromStored(nodeId: string, storedScore: number, storedStatus: NodeStatus, stable: boolean, timestamp: string, tilt: number, vibration: number, rollChangeDeg = 0, pitchChangeDeg = 0) {
  const previous = cloudRiskState.get(nodeId);
  const now = Date.now();
  const signalStable = previous
    ? Math.abs(tilt - previous.tilt) < STABLE_TILT_DELTA && Math.abs(vibration - previous.vibration) < STABLE_VIBRATION_DELTA
    : stable;
  const signalRisk = riskFromSignals(0, 0, vibration, vibration, { rollChangeDeg, pitchChangeDeg });
  const baseScore = previous?.score ?? storedScore;
  let score = baseScore;

  if (signalStable && baseScore > signalRisk.score) {
    const lastDecay = previous?.lastDecayAt ?? 0;
    const decaySteps = previous ? Math.max(1, Math.floor((now - lastDecay) / RISK_DECAY_INTERVAL_MS)) : 1;
    score = Math.max(signalRisk.score, baseScore - RISK_DECAY_STEP * decaySteps);
  } else if (!signalStable) {
    score = Math.max(storedScore, signalRisk.score);
  }

  cloudRiskState.set(nodeId, { timestamp, score, tilt, vibration, lastDecayAt: now });
  return { score, status: scoreToStatus(score) };
}

function scoreToStatus(score: number): NodeStatus {
  return score >= 75 ? "CRITICAL" : score >= 45 ? "WARNING" : score >= 20 ? "WATCH" : "NORMAL";
}

function requireClient() {
  if (!client) throw new Error("DynamoDB is not enabled");
  return client;
}

export async function saveAnalyzedTelemetry(node: AnalyzedTelemetry) {
  const dynamo = requireClient();
  const timestamp = node.last_seen;

  await Promise.all([
    dynamo.send(new PutCommand({
      TableName: nodesTable,
      Item: {
        source: "LIVE",
        updated_at: timestamp,
        ...node,
      },
    })),
    dynamo.send(new PutCommand({
      TableName: historyTable,
      Item: {
        received_at: timestamp,
        ...node,
      },
    })),
  ]);
}

export async function listCloudNodes(): Promise<NodeSummary[]> {
  const response = await requireClient().send(new ScanCommand({ TableName: nodesTable }));
  return (response.Items ?? []).map((item) => {
    const nodeId = String(item.node_id);
    const fallback = mockNodes.find((node) => node.node_id === nodeId);
    const tilt = item.tilt as Record<string, unknown> | undefined;
    const vibration = item.vibration as Record<string, unknown> | undefined;
    const risk = item.risk as Record<string, unknown> | undefined;
    const signalRisk = riskFromSignals(
      Number(tilt?.roll_deg ?? item.roll_deg ?? 0),
      Number(tilt?.pitch_deg ?? item.pitch_deg ?? 0),
      Number(vibration?.rms_g ?? item.rms_g ?? 0),
      Number(vibration?.peak_g ?? item.peak_g ?? 0),
      {
        rollChangeDeg: Number(risk?.tilt_change_deg ?? 0),
        pitchChangeDeg: Number(risk?.pitch_change_deg ?? 0),
        baselineRollDeg: typeof tilt?.baseline_roll_deg === "number" ? tilt.baseline_roll_deg : undefined,
        baselinePitchDeg: typeof tilt?.baseline_pitch_deg === "number" ? tilt.baseline_pitch_deg : undefined,
      },
    );
    const persistedRiskScore = Number(item.risk_score ?? item.risk?.score ?? 0);
    const timestamp = String(item.last_seen ?? item.received_at ?? "");
    const statusDetail = item.status_detail as Record<string, unknown> | undefined;
    const stable = statusDetail?.trend === "STABLE"
      || (Math.abs(Number(risk?.tilt_change_deg ?? 0)) < 0.5 && Math.abs(Number(risk?.vibration_change_g ?? 0)) < 0.02);
    const cloudRisk = persistedRiskScore
      ? cloudRiskFromStored(
        nodeId,
        persistedRiskScore,
        item.risk?.level ?? item.status ?? "NORMAL",
        stable,
        timestamp,
        Number(tilt?.roll_deg ?? 0),
        Number(vibration?.rms_g ?? 0),
        Number(risk?.tilt_change_deg ?? 0),
        Number(risk?.pitch_change_deg ?? 0),
      )
      : { score: signalRisk.score, status: signalRisk.status };
    const riskScore = cloudRisk.score;
    const status: NodeStatus = persistedRiskScore
      ? cloudRisk.status
      : signalRisk.status;

    return {
      node_id: nodeId,
      source: "LIVE" as const,
      latitude: Number(item.latitude) || fallback?.latitude || 18.621437,
      longitude: Number(item.longitude) || fallback?.longitude || 73.912029,
      status,
      risk_score: riskScore,
      last_seen: String(item.last_seen ?? item.received_at ?? new Date().toISOString()),
    };
  });
}

export async function getCloudNode(nodeId: string): Promise<NodeDetail | null> {
  const dynamo = requireClient();
  const [currentResponse, historyResponse] = await Promise.all([
    dynamo.send(new GetCommand({
      TableName: nodesTable,
      Key: { node_id: nodeId },
    })),
    dynamo.send(new QueryCommand({
      TableName: historyTable,
      KeyConditionExpression: "node_id = :nodeId",
      ExpressionAttributeValues: { ":nodeId": nodeId },
      ScanIndexForward: false,
      Limit: 1,
    })),
  ]);

  const current = currentResponse.Item ?? {};
  const latestHistory = historyResponse.Items?.[0] ?? {};
  if (!currentResponse.Item && !historyResponse.Items?.length) return null;

  return { ...latestHistory, ...current } as NodeDetail;
}

export async function getCloudHistory(nodeId: string, limit = 100): Promise<NodeHistory> {
  const response = await requireClient().send(new QueryCommand({
    TableName: historyTable,
    KeyConditionExpression: "node_id = :nodeId",
    ExpressionAttributeValues: { ":nodeId": nodeId },
    ScanIndexForward: false,
    Limit: limit,
  }));

  const items = response.Items ?? [];
  return {
    node_id: nodeId,
    range: "24h",
    data: items.map((item) => ({
      timestamp: String(item.received_at),
      tilt_roll_deg: Number(item.tilt?.roll_deg ?? 0),
      tilt_pitch_deg: Number(item.tilt?.pitch_deg ?? 0),
      vibration_rms_g: Number(item.vibration?.rms_g ?? 0),
      anomaly_score: Number(item.risk?.vibration_z_score ?? 0),
      risk_score: Number(item.risk_score ?? 0),
    })),
  };
}

export function dashboardFromNodes(nodes: NodeSummary[]): DashboardOverview {
  const count = (status: NodeSummary["status"]) => nodes.filter((node) => node.status === status).length;
  const offline = count("OFFLINE");
  const alerts = nodes
    .filter((node) => node.status === "WATCH" || node.status === "WARNING" || node.status === "CRITICAL")
    .map((node) => ({
      alert_id: `ALT_${node.node_id}`,
      node_id: node.node_id,
      severity: node.status as "WATCH" | "WARNING" | "CRITICAL",
      type: node.status === "CRITICAL" ? "SUBSIDENCE_RISK" : node.status === "WARNING" ? "VIBRATION_ANOMALY" : "TILT_INCREASE",
      message: node.status === "CRITICAL"
        ? "Critical subsidence risk detected"
        : node.status === "WARNING"
          ? "Unusual vibration pattern detected"
          : "Tilt increasing above baseline",
      time: node.last_seen,
    }));

  return {
    system: { status: "OPERATIONAL", last_updated: new Date().toISOString() },
    mine: {
      total_nodes: nodes.length,
      normal_nodes: count("NORMAL"),
      watch_nodes: count("WATCH"),
      warning_nodes: count("WARNING"),
      critical_nodes: count("CRITICAL"),
      offline_nodes: offline,
    },
    network: {
      gateway_status: "ONLINE",
      gateway_id: process.env.AWS_THING_NAME ?? "mine-gateway-001",
      mesh_health_percent: nodes.length ? Math.round(((nodes.length - offline) / nodes.length) * 100) : 0,
      nodes_online: nodes.length - offline,
      nodes_offline: offline,
    },
    alerts,
  };
}
