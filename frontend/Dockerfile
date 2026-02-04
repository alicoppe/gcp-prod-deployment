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

# Lightweight Node server for dynamic/runtime config needs.
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY server.js ./server.js
EXPOSE 8080
CMD ["node", "server.js"]
