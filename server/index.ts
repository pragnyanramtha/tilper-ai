import { createServer } from "http";
import { createApp, log } from "./app";

(async () => {
  const result = await createApp({ serveClient: true });
  const app = result.app;
  const httpServer = result.httpServer || createServer(app);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
