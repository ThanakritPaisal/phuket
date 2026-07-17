# LOMA prototype (real Phuket provider data) — served as a static site by nginx.
# The prototype is a single self-contained HTML file, so the image is tiny.
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="LOMA Prototype (real data)" \
      org.opencontainers.image.description="LOMA.html driven by real loma-app provider data, served over nginx"

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Serve the prototype at both / and /LOMA.html
COPY LOMA.html /usr/share/nginx/html/index.html
COPY LOMA.html /usr/share/nginx/html/LOMA.html

# The QR renderer loads this at runtime (<script src="data/qrcode.browser.js">); without
# it, QR codes fall back to a remote image service.
COPY data/qrcode.browser.js /usr/share/nginx/html/data/qrcode.browser.js

# Cloud Run sends traffic to $PORT (default 8080); listen on it. nginx.conf is templated
# at start so the same image works locally (80) and on Cloud Run (8080).
ENV PORT=8080
CMD ["/bin/sh", "-c", "sed -i \"s/listen  *80;/listen ${PORT};/\" /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]

EXPOSE 8080
