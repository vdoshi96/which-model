import { z } from "zod";

export const runtime = "nodejs";

const authHeaderSchema = z.string().startsWith("Bearer ");
const DISABLED_REFRESH_RESPONSE = {
  ok: false,
  error:
    "Automatic benchmark refresh is disabled. Use the manual curated catalog refresh runbook.",
};

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

  return Response.json(DISABLED_REFRESH_RESPONSE, { status: 410 });
}

export const POST = GET;
