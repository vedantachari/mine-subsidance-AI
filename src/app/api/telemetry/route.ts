import { processTelemetry } from "@/lib/telemetry-store";
import { isDynamoDbAuthError, isDynamoDbEnabled, saveAnalyzedTelemetry } from "@/lib/dynamodb";
import type { GatewayTelemetry } from "@/types/telemetry";

export async function POST(request: Request) {
  const configuredToken = process.env.WEBSITE_API_TOKEN;
  if (configuredToken) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${configuredToken}`) {
      return Response.json({ error: "Unauthorized telemetry source" }, { status: 401 });
    }
  }

  let payload: GatewayTelemetry;

  try {
    payload = await request.json() as GatewayTelemetry;
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  let node;
  try {
    node = processTelemetry(payload);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid telemetry" }, { status: 400 });
  }

  if (isDynamoDbEnabled()) {
    try {
      await saveAnalyzedTelemetry(node);
    } catch (error) {
      console.error(isDynamoDbAuthError(error)
        ? "DynamoDB credentials are invalid or expired"
        : "DynamoDB could not save telemetry", error);
    }
  }

  return Response.json({ accepted: true, node }, { status: 202 });
}

export function GET() {
  return Response.json({ message: "POST gateway telemetry to this endpoint" });
}
