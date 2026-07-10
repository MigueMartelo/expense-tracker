import type { IncomingMessage, ServerResponse } from 'http';
import { NestFactory } from '@nestjs/core';
// Import the COMPILED app (produced by `nest build` -> dist/) rather than the
// TypeScript sources. Vercel bundles this function with esbuild, which does not
// emit the decorator metadata NestJS relies on; the pre-compiled JS already has
// it, so DI keeps working.
import { AppModule } from '../dist/src/app.module.js';
import { configureApp } from '../dist/src/setup.js';

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

let appPromise: Promise<NodeHandler> | null = null;

async function bootstrap(): Promise<NodeHandler> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  configureApp(app);

  await app.init();

  // Underlying Express instance; NestFactory defaults to the Express adapter.
  return app.getHttpAdapter().getInstance() as NodeHandler;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!appPromise) {
    appPromise = bootstrap();
  }

  const expressApp = await appPromise;
  expressApp(req, res);
}
