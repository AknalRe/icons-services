import path from "path";
import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 5056),
  host: process.env.HOST || "0.0.0.0",
  dataDir: path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "..", "data")),
  frontendDistDir: path.resolve(
    process.env.FRONTEND_DIST_DIR || path.join(process.cwd(), "..", "frontend", "dist")
  ),
  adminEmail: (process.env.ADMIN_EMAIL || "admin@reneo.my.id").trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || "reneo-admin-123",
  sessionSecret: process.env.SESSION_SECRET || "reneo-icons-dev-secret-change-in-prod",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  isProd: process.env.NODE_ENV === "production",
};
