#!/usr/bin/env bash
# Usage: scripts/deploy.sh [all|backend|frontend]
# Requires: aws login --profile expense-tracker, export AWS_PROFILE=expense-tracker
set -euo pipefail

TARGET="${1:-all}"
export AWS_REGION=us-east-2
STACK=ExpenseTrackerStack

cd "$(git rev-parse --show-toplevel)"

out() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

deploy_backend() {
  local account repo tag
  account=$(aws sts get-caller-identity --query Account --output text)
  repo="$account.dkr.ecr.$AWS_REGION.amazonaws.com/expense-tracker-api"
  tag=$(date +%Y%m%d-%H%M%S)

  echo "==> Building and pushing image $tag"
  aws ecr get-login-password | docker login --username AWS --password-stdin "${repo%%/*}"
  docker buildx build --platform linux/arm64 --provenance=false \
    -f backend/Dockerfile -t "$repo:$tag" --push .

  echo "==> Deploying stack"
  ORIGIN_VERIFY_SECRET=$(aws ssm get-parameter \
    --name /expense-tracker/prod/ORIGIN_VERIFY_SECRET \
    --with-decryption --query Parameter.Value --output text)
  export ORIGIN_VERIFY_SECRET
  export IMAGE_TAG="$tag"

  ALERT_EMAIL=$(aws ssm get-parameter --name /expense-tracker/infra/ALERT_EMAIL \
    --query Parameter.Value --output text)
  export ALERT_EMAIL

  CERT_ARN=$(aws ssm get-parameter --name /expense-tracker/infra/CERT_ARN \
  --query Parameter.Value --output text 2>/dev/null || true)
  if [ -n "$CERT_ARN" ]; then export CERT_ARN; fi

  (cd infra && npx cdk deploy)
}

deploy_frontend() {
  local bucket dist
  bucket=$(out SiteBucketName)
  dist=$(out DistributionId)

  echo "==> Building frontend"
  npm run build:spa -w frontend

  echo "==> Uploading to s3://$bucket"
  aws s3 sync frontend/dist/client "s3://$bucket" --delete \
    --exclude "assets/*" --cache-control "no-cache"
  aws s3 sync frontend/dist/client/assets "s3://$bucket/assets" --delete \
    --cache-control "public,max-age=31536000,immutable"

  echo "==> Invalidating CloudFront"
  aws cloudfront create-invalidation --distribution-id "$dist" --paths "/*" \
    --query 'Invalidation.Id' --output text
}

case "$TARGET" in
  all)      deploy_backend; deploy_frontend ;;
  backend)  deploy_backend ;;
  frontend) deploy_frontend ;;
  *) echo "Usage: $0 [all|backend|frontend]"; exit 1 ;;
esac

echo "==> Done: $(out SiteUrl)"
