# USD ⇄ INR Currency Visualizer

A full-stack currency tracker: a FastAPI backend fetches the USD→INR exchange
rate once a day and stores it in Postgres, and a React + shadcn/ui frontend
shows a live converter and a historical trend chart.

```
currency-visualizer/
├── backend/            FastAPI + SQLAlchemy + Postgres, daily rate scheduler
├── frontend/            React + Vite + TypeScript + Tailwind + shadcn/ui + Recharts
├── docker-compose.yml   Local dev: builds both images + Postgres
├── deploy/
│   ├── docker-compose.prod.yml   Production compose (pulls prebuilt GHCR images)
│   ├── ec2-setup.sh              One-time EC2 instance bootstrap script
│   └── .env.example              Template for the server-side .env
└── .github/workflows/deploy.yml  CI/CD: build → push to GHCR → deploy over SSH
```

## How it works

- The backend fetches `USD → INR` from the free, keyless
  [exchangerate-api.com](https://www.exchangerate-api.com/) endpoint once a
  day (APScheduler, 00:05 UTC) and upserts a row per day into Postgres.
- `GET /api/rate/latest`, `GET /api/rate/history?days=N`, and
  `GET /api/convert?amount=&from=&to=` serve the frontend. `POST
  /api/rate/refresh` lets you trigger a fetch on demand.
- The frontend polls those endpoints: a converter card (with a currency
  swap button) and an area chart of the last 7/30/90 days.

## Run it locally (no Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000

# Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env            # VITE_API_URL=http://localhost:8000
npm run dev                     # http://localhost:5173
```

The backend defaults to a local SQLite file (`currency.db`) when
`DATABASE_URL` isn't set, so you don't need Postgres running just to poke
around.

## Run it with Docker Compose (Postgres included)

```bash
cp .env.example .env    # optionally change POSTGRES_PASSWORD
docker compose up --build
```

- Frontend: http://localhost (nginx serves the built React app and proxies
  `/api/*` to the backend container)
- Backend directly: http://localhost:8000/docs (FastAPI's interactive docs)

> Note: this repo was validated by running the backend (FastAPI TestClient)
> and building the frontend (`npm run build`) directly — the dev sandbox
> that generated it doesn't support running a Docker daemon itself. Run
> `docker compose up --build` on your own machine before your first deploy
> to confirm the images build cleanly there too.

## Deploying to EC2 with Docker + GitHub Actions

### 1. Launch the EC2 instance

- Ubuntu 22.04 or 24.04, t3.micro/t3.small is plenty for this app.
- Security group: allow inbound **22** (SSH, restrict to your IP) and
  **80** (HTTP, from anywhere).
- Create/download a key pair — you'll need the private key for GitHub
  Actions secrets below.

### 2. Bootstrap Docker on the instance

SSH in, then either run `deploy/ec2-setup.sh` (copy it up first) or paste
its commands manually. It installs Docker Engine + the Compose plugin and
creates `~/currency-visualizer/.env` from a template.

```bash
scp -i your-key.pem deploy/ec2-setup.sh ubuntu@<EC2_PUBLIC_IP>:~/
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP> "bash ec2-setup.sh"
```

Then edit `~/currency-visualizer/.env` on the server with real values:

```
GHCR_IMAGE_BACKEND=ghcr.io/<your-github-username>/<your-repo>-backend
GHCR_IMAGE_FRONTEND=ghcr.io/<your-github-username>/<your-repo>-frontend
IMAGE_TAG=latest
POSTGRES_USER=currency
POSTGRES_PASSWORD=<a strong password>
POSTGRES_DB=currency
```

Log out and back in (or run `newgrp docker`) so your user's docker-group
membership takes effect.

### 3. Make your GHCR package pullable

The workflow pushes images to `ghcr.io/<owner>/<repo>-backend` and
`-frontend` using the automatic `GITHUB_TOKEN`, so no extra registry secret
is needed for *pushing*. For the EC2 box to *pull* them, either:

- make the packages public (Package settings → Change visibility → Public
  — simplest for a personal project), or
- keep them private and let the deploy step's `docker login` (using the
  same `GITHUB_TOKEN` passed through the SSH session) handle auth — this
  repo's workflow already does that, so private packages work too as long
  as the token has `packages:read`, which `GITHUB_TOKEN` gets by default
  for the same repo.

### 4. Add GitHub Actions secrets

In your repo: **Settings → Secrets and variables → Actions → New repository
secret**:

| Secret         | Value                                              |
|----------------|-----------------------------------------------------|
| `EC2_HOST`     | EC2 public IP or DNS name                          |
| `EC2_USER`     | `ubuntu` (default for Ubuntu AMIs)                 |
| `EC2_SSH_KEY`  | The **private** key (full contents of the `.pem`)  |

`GITHUB_TOKEN` is provided automatically — you don't create it yourself.

### 5. Push to `main`

```bash
git push origin main
```

`.github/workflows/deploy.yml` will:

1. Build the backend and frontend Docker images.
2. Push them to GHCR tagged with the short commit SHA and `latest`.
3. Copy `deploy/docker-compose.prod.yml` to the EC2 box.
4. SSH in, update `IMAGE_TAG` in the server's `.env`, `docker compose pull`,
   `docker compose up -d`, and prune old images.

Visit `http://<EC2_PUBLIC_IP>` — you should see the converter and chart.
The first deploy's chart will be mostly empty (only today's rate exists);
it fills in day by day as the scheduler runs, or you can seed more points
immediately by calling `POST /api/rate/refresh` a few times across
different simulated days if you want to demo it right away.

### Rolling back

Every image is tagged with its commit SHA, so a rollback is just:

```bash
ssh ubuntu@<EC2_PUBLIC_IP>
cd ~/currency-visualizer
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=<previous-short-sha>/' .env
docker compose -f docker-compose.prod.yml up -d
```

### Optional hardening for a real production deploy

- Put the instance behind an Elastic IP or a domain + [Caddy](https://caddyserver.com/)
  / [Let's Encrypt via certbot](https://certbot.eff.org/) for HTTPS — nginx
  in this repo serves plain HTTP on port 80 to keep the demo simple.
  A minimal path: swap the frontend's nginx for Caddy, or put an ALB /
  Cloudflare in front of the instance.
- Move Postgres to Amazon RDS instead of the `db` container for real
  durability and backups; then remove the `db` service from
  `docker-compose.prod.yml` and point `DATABASE_URL` at the RDS endpoint.
- Restrict CORS in `backend/app/main.py` (`allow_origins=["*"]` is fine for
  same-origin nginx proxying, but tighten it if you ever call the API from
  another domain).
