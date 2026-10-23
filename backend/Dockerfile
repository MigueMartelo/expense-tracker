# ---- build: instala todo y compila ----
FROM public.ecr.aws/lambda/nodejs:22 AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY infra/package.json infra/
RUN npm ci --workspace=backend --ignore-scripts
COPY backend/ backend/
WORKDIR /app/backend
RUN npx prisma generate && npm run build

# ---- runtime: solo lo necesario para ejecutar ----
FROM public.ecr.aws/lambda/nodejs:22
WORKDIR ${LAMBDA_TASK_ROOT}
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY infra/package.json infra/
RUN npm ci --workspace=backend --omit=dev --ignore-scripts && npm cache clean --force
COPY backend/prisma.config.ts backend/
COPY backend/src/prisma backend/src/prisma
RUN cd backend && npx prisma generate
COPY --from=build /app/backend/dist backend/dist
CMD ["backend/dist/src/lambda.handler"]
