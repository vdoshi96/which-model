import { fetchAllBenchmarkSources } from "@/lib/benchmarkSources";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const records = await fetchAllBenchmarkSources();

  return Response.json({
    ok: true,
    recordsFetched: records.length,
  });
}
