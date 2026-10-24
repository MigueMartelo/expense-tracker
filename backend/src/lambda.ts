import { NestFactory } from '@nestjs/core';
import serverlessExpress from '@codegenie/serverless-express';
import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { Handler } from 'aws-lambda';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './setup';

let serverPromise: Promise<Handler> | undefined;

// Copia /expense-tracker/prod/* de Parameter Store a process.env
// ANTES de crear la app, para que ConfigModule y PrismaService los vean.
async function loadParameters(): Promise<void> {
  const path = process.env.SSM_PATH;
  if (!path) return; // en local usas variables de entorno normales

  const ssm = new SSMClient({});
  let nextToken: string | undefined;
  do {
    const res = await ssm.send(
      new GetParametersByPathCommand({
        Path: path,
        WithDecryption: true,
        NextToken: nextToken,
      }),
    );
    for (const p of res.Parameters ?? []) {
      if (p.Name && p.Value !== undefined) {
        // /expense-tracker/prod/JWT_SECRET -> JWT_SECRET
        process.env[p.Name.slice(path.length)] = p.Value;
      }
    }
    nextToken = res.NextToken;
  } while (nextToken);
}

async function bootstrap(): Promise<Handler> {
  await loadParameters();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // La Function URL es pública: solo aceptamos lo que llega con el header que pone CloudFront.
  const originSecret = process.env.ORIGIN_VERIFY_SECRET;
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (originSecret && req.headers['x-origin-verify'] !== originSecret) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    next();
  });

  app.setGlobalPrefix('api'); // CloudFront manda /api/*; Vercel no usa este archivo
  configureApp(app);
  await app.init();

  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

export const handler: Handler = async (event, context, callback) => {
  // Si el arranque falla (p. ej. SSM), no dejamos la promesa rota para siempre.
  serverPromise ??= bootstrap().catch((err: unknown) => {
    serverPromise = undefined;
    throw err;
  });
  const server = await serverPromise;
  return server(event, context, callback);
};
