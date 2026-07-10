import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Applies shared runtime configuration (CORS + validation) so the standalone
 * server (main.ts) and the Vercel serverless entrypoint (api/index.ts) stay
 * in sync.
 *
 * CORS is locked to FRONTEND_URL when it is set; without it (e.g. local dev)
 * all origins are allowed.
 */
export function configureApp(app: INestApplication): void {
  const frontendUrl = process.env.FRONTEND_URL;

  app.enableCors({
    origin: frontendUrl ? [frontendUrl] : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
