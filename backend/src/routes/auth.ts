import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import {
  clearSessionCookie,
  getSessionFromRequest,
  setSessionCookie,
  signSession,
  verifyPassword,
} from "../auth";

interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: string;
}

export function registerAuthRoutes(app: FastifyInstance, db: DatabaseSync): void {
  app.get("/api/auth/me", async (request) => {
    const session = getSessionFromRequest(request);
    if (!session) {
      return { user: null };
    }
    return {
      user: {
        id: session.uid,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    };
  });

  app.post<{ Body: { email?: string; password?: string } }>("/api/auth/login", async (request, reply) => {
    const email = (request.body?.email || "").trim().toLowerCase();
    const password = request.body?.password || "";

    if (!email || !password) {
      return reply.code(400).send({ error: "Email dan kata sandi wajib diisi." });
    }

    const user = db
      .prepare("SELECT id, email, name, password_hash, role FROM users WHERE email = ?")
      .get(email) as unknown as UserRow | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return reply.code(401).send({ error: "Email atau kata sandi tidak sesuai." });
    }

    const token = signSession({
      uid: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    setSessionCookie(request, reply, token);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    clearSessionCookie(request, reply);
    return { ok: true };
  });
}
