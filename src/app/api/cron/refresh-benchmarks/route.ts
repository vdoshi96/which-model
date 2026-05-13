import { z } from "zod";

import { refreshBenchmarkData } from "@/lib/benchmarkSources";
import { getPrisma } from "@/lib/db";

export const runtime = "nodejs";

const authHeaderSchema = z.string().startsWith("Bearer ");

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (
    !cronSecret ||
    !authHeaderSchema.safeParse(authHeader).success ||
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await refreshBenchmarkData(getPrisma());

  return Response.json({ ok: true, ...result });
}

export const POST = GET;
