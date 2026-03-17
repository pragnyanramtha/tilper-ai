import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { storage } from "./storage";
import { seedDatabase } from "./seed";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export type CreateAppOptions = {
  serveClient?: boolean;
  skipSeed?: boolean;
};

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Singleton to track if seeding has been done
let hasSeeded = false;

export async function createApp(options: CreateAppOptions = {}) {
  const { serveClient = false, skipSeed = false } = options;
  const app = express();

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

  // Only seed once in serverless environments
  if (!skipSeed && !hasSeeded) {
    await seedDatabase(storage);
    hasSeeded = true;
  }

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (serveClient) {
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      // For local dev, we still need the HTTP server for Vite
      const { createServer } = await import("http");
      const httpServer = createServer(app);
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      return { app, httpServer };
    }
  }

  return { app };
}
