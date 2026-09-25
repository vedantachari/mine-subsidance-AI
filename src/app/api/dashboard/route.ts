import { mockDashboard, mockNodes } from "@/data/mock-api";
import { getCurrentNodeSummaries, getLiveNodes } from "@/lib/telemetry-store";
import { dashboardFromNodes, isDynamoDbAuthError, isDynamoDbEnabled, listCloudNodes } from "@/lib/dynamodb";

export async function GET() {
  if (isDynamoDbEnabled()) {
    try {
      const nodes = await listCloudNodes();
      getLiveNodes().forEach((liveNode) => {
        const existing = nodes.find((node) => node.node_id === liveNode.node_id);
        if (existing) {
          existing.status = liveNode.status;
          existing.risk_score = liveNode.risk_score;
          existing.last_seen = liveNode.last_seen;
          existing.latitude = liveNode.latitude;
          existing.longitude = liveNode.longitude;
        } else {
          nodes.push({ node_id: liveNode.node_id, source: "LIVE", latitude: liveNode.latitude, longitude: liveNode.longitude, status: liveNode.status, risk_score: liveNode.risk_score, last_seen: liveNode.last_seen });
        }
      });
      mockNodes.forEach((mockNode) => {
        if (!nodes.some((node) => node.node_id === mockNode.node_id)) nodes.push({ ...mockNode, source: "MOCK" });
      });
      return Response.json(dashboardFromNodes(nodes));
    } catch (error) {
      if (!isDynamoDbAuthError(error)) throw error;
    }
  }
  const nodes = getCurrentNodeSummaries();
  const online = nodes.filter((node) => node.status !== "OFFLINE").length;

  const dashboard = dashboardFromNodes(nodes);
  return Response.json({
    ...dashboard,
    system: { ...mockDashboard.system, last_updated: new Date().toISOString() },
    network: { ...dashboard.network, ...mockDashboard.network, nodes_online: online, nodes_offline: nodes.length - online },
  });
}
