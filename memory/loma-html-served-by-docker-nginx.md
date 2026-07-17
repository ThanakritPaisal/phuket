---
name: loma-html-served-by-docker-nginx
description: LOMA_handoff-LASTEST prototype is served on :8080 by a Docker/nginx container with LOMA.html baked into the image
metadata:
  type: project
---

`LOMA_handoff-LASTEST/LOMA/LOMA.html` is a single self-contained prototype served on **port 8080 by a running Docker/nginx container** (`docker-compose.yml` → image `loma-prototype-web`, `Dockerfile` COPYs LOMA.html into the image at build time).

**Why:** Editing `LOMA.html` on disk does NOT change what :8080 serves — the container has its own baked-in copy. A `python -m http.server 8080` will silently fail to bind because nginx already holds the port, so you end up testing the stale image.

**How to apply:** After editing LOMA.html, either `docker compose up --build` to rebuild the image, or test the edited file on a *different* port (`python -m http.server 8091` from that dir). Verify with `curl -s http://localhost:PORT/LOMA.html | grep -c <marker>`.

Related: the booking flow in LOMA.html is wired to the FastAPI backend in [[loma-app-booking-api]] (base URL `http://<host>:8000`, override via `window.LOMA_API_BASE` or `?api=`).
