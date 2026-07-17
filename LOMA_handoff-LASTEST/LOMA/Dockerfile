# LOMA prototype (real Phuket provider data) — served as a static site by nginx.
# The prototype is a single self-contained HTML file, so the image is tiny.
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="LOMA Prototype (real data)" \
      org.opencontainers.image.description="LOMA.html driven by real loma-app provider data, served over nginx"

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Serve the prototype at both / and /LOMA.html
COPY LOMA.html /usr/share/nginx/html/index.html
COPY LOMA.html /usr/share/nginx/html/LOMA.html

EXPOSE 80
