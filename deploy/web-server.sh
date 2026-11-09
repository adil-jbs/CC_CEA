#!/bin/bash
# Sets up the WEB tier (Nginx + static page) on an Amazon Linux 2023 EC2 instance.
# Paste into EC2 "User data" (after filling in the values), or run with sudo.
set -euo pipefail

# ---- FILL THESE IN ----
REPO_URL="https://github.com/<your-user>/Task_Manager_3Tier.git"
# Where Nginx forwards /api calls: the app server's PRIVATE IP (or an internal ALB DNS name) + port.
API_UPSTREAM="10.0.3.25:3000"
# -----------------------

dnf install -y docker git
systemctl enable --now docker

rm -rf /opt/tasks && git clone "$REPO_URL" /opt/tasks
docker build -t task-web /opt/tasks/web

docker rm -f task-web 2>/dev/null || true
docker run -d --name task-web --restart unless-stopped -p 80:80 \
  -e API_UPSTREAM="$API_UPSTREAM" \
  task-web

echo "Web running. Open http://<this-server-public-ip>/"
