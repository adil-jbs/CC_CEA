#!/bin/bash
# Sets up the APP tier (Node API) on an Amazon Linux 2023 EC2 instance.
# Paste into EC2 "User data" (after filling in the values), or run with sudo.
#
# The instance needs outbound internet (NAT gateway if it's in a private subnet)
# to install Docker and clone the repo.
set -euo pipefail

# ---- FILL THESE IN ----
REPO_URL="https://github.com/<your-user>/Task_Manager_3Tier.git"
DB_HOST="<your-rds-endpoint>.rds.amazonaws.com"
DB_USER="admin"
DB_PASSWORD="<your-rds-password>"
DB_NAME="tasks_db"
# -----------------------

dnf install -y docker git
systemctl enable --now docker

rm -rf /opt/tasks && git clone "$REPO_URL" /opt/tasks
docker build -t task-api /opt/tasks/app

docker rm -f task-api 2>/dev/null || true
docker run -d --name task-api --restart unless-stopped -p 3000:3000 \
  -e DB_HOST="$DB_HOST" -e DB_USER="$DB_USER" \
  -e DB_PASSWORD="$DB_PASSWORD" -e DB_NAME="$DB_NAME" \
  task-api

echo "API running. Test with: curl http://localhost:3000/api/health"
