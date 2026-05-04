import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getPrisma } from "@/lib/db";
import { signInSchema } from "@/lib/validators/auth";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Codex123!";

type AuthorizedUser = {
  id: string;
  name: string;
  username: string;
  isAdmin: boolean;
};

export async function authorizeCredentials(
  credentials: unknown,
): Promise<AuthorizedUser | null> {
  const parsed = signInSchema.safeParse(credentials);

  if (!parsed.success) {
    return null;
  }

  if (parsed.data.username === ADMIN_USERNAME) {
    if (parsed.data.password !== ADMIN_PASSWORD) {
      return null;
    }

    return {
      id: ADMIN_USERNAME,
      name: ADMIN_USERNAME,
      username: ADMIN_USERNAME,
      isAdmin: true,
    };
  }

  const user = await getPrisma().user.findUnique({
    where: { username: parsed.data.username },
  });

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    name: user.username,
    username: user.username,
    isAdmin: false,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return authorizeCredentials(credentials);
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.username = user.username;
        token.isAdmin = user.isAdmin;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.username =
          typeof token.username === "string"
            ? token.username
            : (session.user.name ?? "");
        session.user.isAdmin = token.isAdmin === true;
      }

      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
