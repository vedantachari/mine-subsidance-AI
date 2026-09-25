import { mockNodes } from "@/data/mock-api";

export function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const results = query
    ? mockNodes.filter((node) => node.node_id.toLowerCase().includes(query))
    : [];

  return Response.json({ results });
}
