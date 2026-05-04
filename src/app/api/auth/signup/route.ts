import bcrypt from "bcryptjs";

import { getPrisma } from "@/lib/db";
import { getAuthFieldErrors, signUpSchema } from "@/lib/validators/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid signup details.",
        fieldErrors: getAuthFieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const username = parsed.data.username;
  const existingUser = await getPrisma().user.findUnique({
    where: { username },
  });

  if (existingUser) {
    return Response.json({ error: "Username is already taken." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    await getPrisma().user.create({
      data: {
        username,
        passwordHash,
      },
      select: { id: true, username: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return Response.json(
        { error: "Username is already taken." },
        { status: 409 },
      );
    }

    throw error;
  }

  return Response.json({ ok: true }, { status: 201 });
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
