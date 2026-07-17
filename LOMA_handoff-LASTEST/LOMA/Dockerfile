# LOMA prototype (real Phuket provider data) — served as a static site by nginx.
# The prototype is a single self-contained HTML file, so the image is tiny.
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="LOMA Prototype (real data)" \
      org.opencontainers.image.description="LOMA.html driven by real loma-app provider data, served over nginx"

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Serve the prototype at both / and /LOMA.html
COPY LOMA.html /usr/share/nginx/html/index.html
COPY LOMA.html /usr/share/nginx/html/LOMA.html

# Runtime assets in data/: the QR renderer (data/qrcode.browser.js) and the bundled
# Leaflet map library (data/leaflet.js|css + data/images/*) that powers the real maps.
# OSM map tiles are still fetched from the network at view time.
COPY data/ /usr/share/nginx/html/data/

# Cloud Run sends traffic to $PORT (default 8080); listen on it. nginx.conf is templated
# at start so the same image works locally (80) and on Cloud Run (8080).
ENV PORT=8080
CMD ["/bin/sh", "-c", "sed -i \"s/listen  *80;/listen ${PORT};/\" /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]

EXPOSE 8080
