#!/usr/bin/env bash
# Build LOMA.html from the pristine source by applying the idempotent patchers in order.
# Optionally bakes the backend URL in via  LOMA_API_BASE=<url>  (Cloud Run cannot use the
# default host:8000). Safe to run repeatedly — every patcher is marker-guarded.
#
#   ./build.sh                                   # local build (API defaults to :8000)
#   LOMA_API_BASE=https://loma-api.run.app ./build.sh   # bake a real backend URL
set -euo pipefail
cd "$(dirname "$0")"

# Patchers print emoji/Thai in their summaries; force UTF-8 so a Windows cp1252 console
# doesn't abort the build under `set -e` (Linux/Docker default to UTF-8 already).
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8

cp LOMA.html.orig LOMA.html
python _wire_booking_backend.py
python _wire_real_data.py
python _wire_loma_signals.py
python _wire_communities.py
python _wire_live_actions.py
python _wire_real_prototype.py
python _wire_recent_recs.py
python _wire_ui_final.py

# Bake window.LOMA_API_BASE so the deployed page calls the real backend (both the
# booking layer and the live-actions layer read window.LOMA_API_BASE first).
if [ -n "${LOMA_API_BASE:-}" ]; then
  python - "$LOMA_API_BASE" <<'PY'
import io, sys
url = sys.argv[1].rstrip("/")
tag = "<script>window.LOMA_API_BASE=%r;</script>" % url
s = io.open("LOMA.html", encoding="utf-8").read()
if "window.LOMA_API_BASE=" not in s:
    s = s.replace("</head>", tag + "\n</head>", 1)
    io.open("LOMA.html", "w", encoding="utf-8", newline="").write(s)
    print("baked LOMA_API_BASE =", url)
else:
    print("LOMA_API_BASE already present — left as is")
PY
fi

echo "built LOMA.html ($(wc -c < LOMA.html) bytes)"
