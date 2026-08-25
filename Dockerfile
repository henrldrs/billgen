# BillGen — production image (ADR-0004).
#
# Two build targets from one context:
#   --target api  → uvicorn + Chromium, serves the HTTP API
#   --target web  → Caddy + the built SPA bundle, terminates TLS
#
# Build context is the repo root. Desktop (Tauri/SQLite) does not use this
# image; see HANDOFF §3.

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — build the SaaS SPA bundle
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-slim AS spa-build
WORKDIR /build

# package.json for every workspace member first, so `npm ci` caches on the
# lockfile rather than on source edits. frontend-electron is a workspace member
# and must be present for `npm ci` to resolve, but is never built here.
COPY package.json package-lock.json ./
COPY henrioutai-ui/package.json henrioutai-ui/
COPY frontend-react/package.json frontend-react/
COPY frontend-saas/package.json frontend-saas/
COPY frontend-electron/package.json frontend-electron/
RUN npm ci

COPY henrioutai-ui/ henrioutai-ui/
COPY frontend-react/ frontend-react/
COPY frontend-saas/ frontend-saas/

# Relative base URL: the SPA and the API are same-origin behind Caddy, which
# strips the /api prefix. Keeps one bundle valid for every environment
# (ADR-0004 consequences).
ENV VITE_API_URL=/api
RUN npm run -w frontend-saas build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — the API image
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.14-slim AS api

# Pin uv rather than tracking :latest — this image is the reproducibility story.
# Must match the uv that wrote uv.lock (bump both together).
COPY --from=ghcr.io/astral-sh/uv:0.11.29 /uv /bin/uv

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    # Outside $HOME so the non-root runtime user can read the browser.
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Workspace manifests before source, for the same caching reason as above.
COPY pyproject.toml uv.lock ./
COPY core/pyproject.toml core/
COPY db/pyproject.toml db/
COPY api/pyproject.toml api/

# The workspace members are path packages, so their source must be present
# before uv can build them — this layer rebuilds on any source change.
COPY core/ core/
COPY db/ db/
COPY api/ api/
COPY alembic.ini ./

# --package billgen-api is required, not stylistic: the root `billgen` project
# declares no dependencies of its own, so a bare `uv sync` would resolve the
# workspace and install none of it. Naming the member pulls billgen-api plus
# its workspace deps (billgen-db → billgen-core) into /app/.venv.
RUN uv sync --frozen --no-dev --package billgen-api

# The PDF engine. --with-deps pulls Chromium's shared libraries via apt and
# must run as root. WeasyPrint's GTK/Pango natives are deliberately NOT
# installed: Chromium is the engine of record for hosted renders (ADR-0004
# decision 3), and core/pdf/renderer.py imports WeasyPrint lazily and catches
# its ImportError, so the unusable fallback degrades cleanly instead of
# crashing the process.
RUN playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 10001 billgen \
    && chown -R billgen:billgen /app /ms-playwright
USER billgen

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/readyz', timeout=4).status == 200 else 1)"

# --workers 1 is load-bearing, not a placeholder: RateLimitMiddleware keeps its
# sliding window in process memory, so a second worker would double every
# client's real limit. Raise this only once the limiter has a shared backend
# (ADR-0004 decision 4).
#
# --proxy-headers + --forwarded-allow-ips is equally load-bearing: the limiter
# keys on request.client.host, which behind Caddy is the proxy's address unless
# uvicorn is told to trust X-Forwarded-For. Without it every client collapses
# into one bucket and the limiter throttles the whole site at once.
CMD ["uvicorn", "api.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "1", \
     "--proxy-headers", "--forwarded-allow-ips", "*"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — the web image (TLS + static SPA + reverse proxy)
# ─────────────────────────────────────────────────────────────────────────────
FROM caddy:2-alpine AS web
COPY infra/docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=spa-build /build/frontend-saas/dist /srv
