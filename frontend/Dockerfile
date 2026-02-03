# Simple production build for the React + Vite + Tailwind frontend.
# Build on Debian-based image to avoid Rollup optional dependency issues on musl.
FROM node:20-slim AS build
WORKDIR /app
ARG VITE_ASSET_BUCKET
ARG VITE_API_URL
ENV VITE_ASSET_BUCKET=$VITE_ASSET_BUCKET
ENV VITE_API_URL=$VITE_API_URL
COPY package.json package-lock.json* ./
# Install deps (prefer lockfile when available). Work around npm optional deps bug for Rollup.
RUN if [ -f package-lock.json ]; then npm ci --include=optional; else npm install --include=optional; fi && \
  node -e "require('@rollup/rollup-linux-x64-gnu')" 2>/dev/null || \
  npm install --no-save --no-package-lock @rollup/rollup-linux-x64-gnu
COPY . .
RUN npm run build

# Serve the static build with nginx (no Node runtime).
FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
