import serverless from "serverless-http";
import { createApp } from "../../server/app";

let handlerPromise: Promise<any> | null = null;

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = createApp({ serveClient: false }).then(({ app }) => {
      return serverless(app);
    });
  }

  return handlerPromise;
}

export async function handler(event: any, context: any) {
  const appHandler = await getHandler();
  return appHandler(event, context);
}
