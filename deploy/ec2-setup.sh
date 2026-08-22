#!/usr/bin/env bash
# One-time setup script to run ON THE EC2 INSTANCE (not locally).
# Usage: ssh into the instance, then:
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/deploy/ec2-setup.sh -o ec2-setup.sh
#   bash ec2-setup.sh
# or just scp this file up and run it. Tested on Ubuntu 22.04/24.04 EC2 AMIs.
set -euo pipefail

echo "==> Installing Docker Engine + Compose plugin"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Adding current user to the docker group (log out/in for this to take effect)"
sudo usermod -aG docker "$USER"

echo "==> Creating app directory"
mkdir -p ~/currency-visualizer
cd ~/currency-visualizer

if [ ! -f .env ]; then
  echo "==> Writing starter .env — EDIT THIS with your real values before deploying"
  cat > .env <<'EOF'
GHCR_IMAGE_BACKEND=ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO-backend
GHCR_IMAGE_FRONTEND=ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO-frontend
IMAGE_TAG=latest

POSTGRES_USER=currency
POSTGRES_PASSWORD=change_me_to_something_strong
POSTGRES_DB=currency
EOF
fi

echo ""
echo "==> Done. Next steps:"
echo "1. Edit ~/currency-visualizer/.env with your real GHCR image names and a strong Postgres password."
echo "2. Make sure your EC2 security group allows inbound TCP 80 (and 22 for SSH)."
echo "3. Push to your repo's main branch — GitHub Actions will build images and deploy here automatically."
echo "4. (First run only, or after this script) log out and back in so the docker group membership applies,"
echo "   or run: newgrp docker"
