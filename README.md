# 💱 Currency Visualizer

A full-stack web app that visualizes current currency exchange rates — React frontend, FastAPI + PostgreSQL backend — with a complete containerized CI/CD pipeline that deploys to AWS EC2.

![Python](https://img.shields.io/badge/Python-FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)
![AWS](https://img.shields.io/badge/Deploy-AWS%20EC2-FF9900?logo=amazonec2&logoColor=white)

## What it does

- Visualizes current currency exchange rates in the browser
- FastAPI backend serves rate data backed by PostgreSQL
- React + Vite frontend for a fast, responsive UI
- Ships as Docker containers and deploys automatically to EC2

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
| Hosting | AWS EC2 |

## Run it locally

```bash
# Clone and start everything with Docker Compose
git clone https://github.com/saivanka/currency-visualizer.git
cd currency-visualizer
docker compose up --build
```

Then open the frontend in your browser and explore live currency rates.

## CI/CD pipeline

Every push to the main branch triggers the GitHub Actions workflow:

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
