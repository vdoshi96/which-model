import bcrypt from "bcryptjs";
import { z } from "zod";

import { getPrisma } from "@/lib/db";

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[A-Za-z0-9_]+$/),
  password: z.string().min(8).regex(/\d/),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid signup details." }, { status: 400 });
  }

  const username = parsed.data.username;
  const existingUser = await getPrisma().user.findUnique({
    where: { username },
  });

  if (existingUser) {
    return Response.json({ error: "Username is already taken." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await getPrisma().user.create({
    data: {
      username,
      passwordHash,
    },
  });

  return Response.json({ ok: true }, { status: 201 });
}
