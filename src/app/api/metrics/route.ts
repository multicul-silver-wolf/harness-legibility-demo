import { renderMetrics } from "@/lib/observability/metrics";

export async function GET() {
  const body = await renderMetrics();

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
