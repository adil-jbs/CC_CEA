#!/bin/bash
# Installed on every EC2 instance as /opt/ctm/deploy.sh.
# Runs at boot (from the launch template user data) and on every release
# (GitHub Actions -> SSM Run Command). It reads the current settings from
# SSM Parameter Store, pulls the images and (re)starts the containers.
set -euo pipefail

TOKEN=$(curl -sf -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
REGION=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)

param() {
  aws ssm get-parameter --region "$REGION" --name "$1" --with-decryption \
    --query Parameter.Value --output text
}

IMAGE_REPO=$(param /ctm/image_repo)
IMAGE_TAG=$(param /ctm/image_tag)

# Private ECR registry: log in with the instance role before pulling.
if [[ "$IMAGE_REPO" == *.dkr.ecr.* ]]; then
  aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$IMAGE_REPO"
fi

umask 077
cat > /opt/ctm/.env <<EOF
AWS_REGION=$REGION
IMAGE_REPO=$IMAGE_REPO
IMAGE_TAG=$IMAGE_TAG
DB_HOST=$(param /ctm/db_host)
DB_USER=$(param /ctm/db_user)
DB_PASSWORD=$(param /ctm/db_password)
DB_NAME=$(param /ctm/db_name)
EOF

cd /opt/ctm
echo "Deploying image tag: $(grep IMAGE_TAG .env | cut -d= -f2)"
docker compose pull
docker compose up -d --remove-orphans
docker image prune -f >/dev/null
echo "Deploy finished"
