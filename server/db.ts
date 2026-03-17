import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

// Configure pool for serverless environments
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Serverless-friendly settings
  max: 1, // Limit connections in serverless
  idleTimeoutMillis: 0, // Don't timeout connections
  connectionTimeoutMillis: 10000, // 10 seconds
});

export const db = drizzle(pool, { schema });
