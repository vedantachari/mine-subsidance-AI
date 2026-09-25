import { getCurrentNodeSummaries } from "@/lib/telemetry-store";
import { isDynamoDbAuthError, isDynamoDbEnabled, listCloudNodes } from "@/lib/dynamodb";
import { mockNodes } from "@/data/mock-api";

export async function GET() {
  if (isDynamoDbEnabled()) {
    try {
      const nodes = await listCloudNodes();
      mockNodes.forEach((mockNode) => {
        if (!nodes.some((node) => node.node_id === mockNode.node_id)) nodes.push({ ...mockNode, source: "MOCK" });
      });
      return Response.json({ nodes });
    } catch (error) {
      if (!isDynamoDbAuthError(error)) throw error;
    }
  }
  return Response.json({ nodes: getCurrentNodeSummaries() });
}
