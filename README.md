# 💰 Spent Tracker

Full-stack expense tracking application.

> **Status:** this branch deploys the whole app to AWS. The production site on my own domain still runs on Vercel until I move the DNS record. The Vercel files stay in the repo until then.

## ✨ Features

- 📊 Monthly dashboard
- 💳 Credit card management
- 📁 Category management
- 📈 Income & expense tracking
- 🔐 JWT authentication

## 🏗️ Tech Stack

- **Backend**: NestJS, Prisma, PostgreSQL
- **Frontend**: React, TanStack Router, TanStack Query, Tailwind CSS (built as a static SPA)
- **Infrastructure**: AWS (Lambda, CloudFront, S3, SSM, CloudWatch), defined with AWS CDK in TypeScript

## 🚀 Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `backend/.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/spent_tracker"
   JWT_SECRET="your-secret-key"
   ```

   The password-reset emails also need `JWT_EXPIRES_IN`, `RESEND_API_KEY`, `EMAIL_FROM` and `FRONTEND_URL` (for example `http://localhost:5173`).

3. Run migrations:
   ```bash
   cd backend && npm run prisma:migrate
   ```

4. Start development:
   ```bash
   npm run dev
   ```

   - API: http://localhost:3000
   - App: http://localhost:5173

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both backend and frontend |
| `npm run dev:backend` | Start only backend |
| `npm run dev:frontend` | Start only frontend |
| `npm run build:spa -w frontend` | Build the frontend as static files for S3 |
| `./scripts/deploy.sh [all\|backend\|frontend]` | Deploy to AWS (see below) |

## ☁️ Architecture on AWS

```mermaid
flowchart LR
  U[Browser] --> CF[CloudFront]
  CF -->|"/* (static files)"| S3[("S3 bucket, private (OAC)")]
  CF -->|"/api/* + secret header"| L["Lambda container, arm64 (NestJS)"]
  L -->|"secrets at cold start"| SSM[SSM Parameter Store]
  L --> DB[("Neon PostgreSQL, pooled")]
  L --> R[Resend email]
  L --> CW[CloudWatch Logs]
  CW --> AL[Alarms]
  AL --> SNS[SNS] --> M[Email]
```

CloudFront is the only public entry point:

- Any path that is not `/api/*` is served from a **private S3 bucket**. Only CloudFront can read it, using Origin Access Control. A small CloudFront Function sends paths without a file extension to `index.html`, so client-side routes work on reload.
- `/api/*` goes to the **Lambda Function URL**, with caching disabled. CloudFront adds a secret header, `x-origin-verify`. The Nest app rejects any request without it, so calling the Function URL directly returns `403`.
- The Lambda reads its configuration from **SSM Parameter Store** (`/expense-tracker/prod/*`) when it starts, so no secret is stored in the code, the image or the function's environment variables.

### Repository layout

```
backend/     NestJS API (src/lambda.ts is the Lambda entry point) + Dockerfile for the Lambda image
frontend/    React app, built in SPA mode for S3
infra/       AWS CDK app (one stack: ExpenseTrackerStack)
scripts/     deploy.sh, the one-command deploy
```

### Design decisions

| Decision | Why |
| --- | --- |
| Lambda as a **container image** | The API is a normal NestJS app with Prisma and bcrypt. A container keeps the same build locally and in AWS and avoids zip size limits. |
| **arm64** (Graviton) | Cheaper per millisecond. All dependencies have prebuilt arm64 binaries. |
| **Function URL + CloudFront** instead of API Gateway | One entry point for the site and the API, no extra service to pay for. The cost is a shared-secret header instead of API Gateway features. |
| **SSM Parameter Store** instead of Secrets Manager | Standard parameters are free. Secrets Manager charges per secret per month. |
| **Neon** with the pooled connection string | Lambda can open many connections at once. The pooler protects the database from running out of connections. |
| **CDK** in TypeScript | Same language as the rest of the project. `cdk diff` shows changes before they are applied. |
| Logs kept 30 days, ECR keeps the last 3 images | Keeps the two usual hidden costs near zero. |

Estimated cost for a personal project: **under $0.20 per month**. Most of it is ECR storage.

### Test the Lambda image locally

The base image includes the Lambda Runtime Interface Emulator:

```bash
docker build -f backend/Dockerfile -t expense-api .
docker run --rm -p 9000:8080 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/spent_tracker" \
  -e JWT_SECRET=dev -e JWT_EXPIRES_IN=7d \
  -e ORIGIN_VERIFY_SECRET=local -e RESEND_API_KEY=re_dummy \
  expense-api

curl -s http://localhost:9000/2015-03-31/functions/function/invocations -d '{
  "version": "2.0", "rawPath": "/api", "rawQueryString": "",
  "headers": { "x-origin-verify": "local" },
  "requestContext": { "http": { "method": "GET", "path": "/api", "sourceIp": "127.0.0.1" } },
  "isBase64Encoded": false
}'
```

Without the `x-origin-verify` header the same request returns `403`.

### Deploy to AWS

One-time setup:

1. Install the AWS CLI v2 and Docker (with buildx), and sign in: `aws login --profile expense-tracker`, then `export AWS_PROFILE=expense-tracker`.
2. Bootstrap CDK once in the target region (`us-east-2`): `cd infra && npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-2`. Passing the environment explicitly means CDK does not need to run the app first.
3. Create the parameters in SSM (secrets as `SecureString`):

| Parameter (`/expense-tracker/prod/`) | Type |
| --- | --- |
| `DATABASE_URL` (pooled connection string) | SecureString |
| `JWT_SECRET` | SecureString |
| `JWT_EXPIRES_IN` | String |
| `RESEND_API_KEY` | SecureString |
| `EMAIL_FROM` | String |
| `FRONTEND_URL` | String |
| `ORIGIN_VERIFY_SECRET` (random, `openssl rand -hex 32`) | SecureString |

Also create `/expense-tracker/infra/ALERT_EMAIL` (String). The alarms send email to that address.

Then deploy:

```bash
./scripts/deploy.sh            # backend + frontend
./scripts/deploy.sh backend    # image, Lambda and infrastructure only
./scripts/deploy.sh frontend   # static files only
```

The script builds the arm64 image and pushes it to ECR with a timestamp tag, runs `cdk deploy`, builds the SPA, syncs it to S3 (hashed assets cached for a year, everything else revalidated) and invalidates CloudFront.

To remove everything, run `cdk destroy` from `infra/`. The stack needs its environment variables to be set even for this, so pass any value: `ORIGIN_VERIFY_SECRET=x IMAGE_TAG=x ALERT_EMAIL=x npx cdk destroy`. The SSM parameters are not part of the stack, so delete them separately.

### Monitoring

- Logs go to CloudWatch with 30 days of retention.
- Two alarms send an email through SNS: the Lambda `Errors` metric, and a metric filter that counts `ERROR` lines in the application logs.

### Known limitations

- **No CI/CD to AWS.** I wanted GitHub Actions with OIDC (no stored keys). The AWS project account I use has a policy that blocks creating an OIDC provider, so deploys run from my machine with `deploy.sh`. A CI pipeline needs either OIDC in an account that allows it, or long-lived keys, which I preferred to avoid.
- **Database migrations are not part of `deploy.sh`.** They run in a separate GitHub workflow. Run migrations before deploying code that depends on them.
- **The origin secret is visible in the CloudFormation template.** CloudFront custom headers cannot reference a `SecureString`. Only people with access to the AWS account can see it.
- **Cross-region database.** Neon runs in `us-east-1` and the Lambda in `us-east-2`, which adds roughly 10-15 ms per query.
- **No custom domain on AWS yet.** It needs an ACM certificate in `us-east-1` and a DNS change.
