import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set - Using in-memory storage (data will not persist)");
  console.warn("   To enable persistent storage, set DATABASE_URL in your .env file");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://localhost/tilper_ai",
  },
});
