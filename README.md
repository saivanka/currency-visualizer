# 💱 Currency Visualizer

A full-stack web app that visualizes USD ⇄ INR exchange rates — React frontend, FastAPI + PostgreSQL backend — containerized with Docker and deployed through GitHub Actions. The live demo runs free on AWS S3; the full stack also deploys to AWS EC2.

![Python](https://img.shields.io/badge/Python-FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)
![AWS](https://img.shields.io/badge/Live-AWS%20S3-FF9900?logo=amazons3&logoColor=white)

**🔴 Live demo: [currency-visualizer-saivanka.s3-website-us-east-1.amazonaws.com](http://currency-visualizer-saivanka.s3-website-us-east-1.amazonaws.com)** — no server, no sign-up, just open it.

## What it does

- Visualizes current currency exchange rates in the browser
- FastAPI backend serves rate data backed by PostgreSQL
- React + Vite frontend for a fast, responsive UI
- Live demo runs as a static site on AWS S3 (free); the full stack also ships as Docker containers for EC2

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────┐
│  React + Vite   │─────▶│  FastAPI backend │─────▶│  PostgreSQL  │
│  (frontend)     │  API │  (Python)        │      │  (database)  │
└─────────────────┘      └──────────────────┘      └──────────────┘
        ▲                         ▲
        │              Docker images → GHCR
        │                         ▲
        └────── GitHub Actions ────┴── deploy → AWS EC2
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| Containers | Docker, Docker Compose |
| CI/CD | GitHub Actions, GitHub Container Registry (GHCR) |
| Hosting | AWS S3 (live demo) · AWS EC2 (full stack) |

## Run it locally

```bash
# Clone and start everything with Docker Compose
git clone https://github.com/saivanka/currency-visualizer.git
cd currency-visualizer
cp .env.example .env   # then fill in your own values — never commit .env
docker compose up --build
```

Environment values (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`)
live in **GitHub Secrets** for CI/CD and in your local `.env` file for
Docker Compose. `.env` is git-ignored; only `.env.example` (placeholders)
is committed.

Then open the frontend in your browser and explore live currency rates.

## CI/CD pipeline

The EC2 pipeline (`.github/workflows/deploy.yml`, currently manual-only —
see the S3 section below) builds and deploys the full stack:

1. **Build** — backend and frontend Docker images are built
2. **Publish** — images are pushed to GitHub Container Registry (GHCR)
3. **Deploy** — the EC2 host pulls the new images and restarts the stack
4. **Verify** — the deployment is health-checked before the run is marked green

### Rollback

If a deployment fails verification, redeploy the previous known-good image tag from GHCR and restart the stack — the same workflow supports rolling back to any earlier published tag.

## Project structure

```
currency-visualizer/
├── backend/            # FastAPI + PostgreSQL service
├── frontend/           # React + Vite app
├── deploy/             # EC2 deployment scripts and configs
├── .github/workflows/  # CI/CD pipelines
└── docker-compose.yml  # Local + server orchestration
```

## Why this project matters

It is a complete, honest DevOps loop: code → container → registry → cloud host → rollback plan. No step is manual, and every step is documented in this repo.

## S3 static deployment (free, live)

S3 can only host static files, so the live demo runs the frontend in
**static mode**: the browser calls the same free rate API the backend uses
(open.er-api.com) directly, and the chart's history is kept locally in the
browser (one real point per day, starting from your first visit). The
FastAPI + Postgres backend stays in this repo for the full Docker/EC2
setup below — it is simply not needed to run the demo, and S3 hosting for
this traffic costs effectively $0 (pennies/month at most, covered by
account credits).

One-time setup:

1. Create an S3 bucket in `us-east-1`, turn **off** "Block all public
   access", enable **Static website hosting** (index document:
   `index.html`), and add a bucket policy allowing public `s3:GetObject`.
2. Build and upload:
   `cd frontend && VITE_STATIC_MODE=true npm run build`, then upload the
   contents of `dist/` to the bucket. Your URL is the bucket's website
   endpoint.
3. For automatic deploys, add repo secrets `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY` and `S3_BUCKET`, then run the
   **Deploy Frontend to S3 (Static)** workflow from the Actions tab
   (`.github/workflows/deploy-s3.yml`, manual trigger).

The EC2 workflow (`deploy.yml`) is paused to manual-only: it needs
`EC2_HOST` / `EC2_USER` / `EC2_SSH_KEY` secrets and a running instance,
and failed on every push while those were missing.
