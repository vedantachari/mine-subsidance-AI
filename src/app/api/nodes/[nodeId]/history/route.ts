import { mockHistory } from "@/data/mock-api";
import { jsonError } from "@/lib/api-response";
import { getCloudHistory, isDynamoDbAuthError, isDynamoDbEnabled } from "@/lib/dynamodb";

type RouteContext = {
  params: Promise<{ nodeId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { nodeId } = await params;

  if (isDynamoDbEnabled()) {
    try {
      return Response.json(await getCloudHistory(nodeId.toUpperCase()));
    } catch (error) {
      if (!isDynamoDbAuthError(error)) throw error;
    }
  }

  if (nodeId.toUpperCase() !== mockHistory.node_id) {
    return jsonError(`History for ${nodeId} was not found`, 404);
  }

  return Response.json(mockHistory);
}
