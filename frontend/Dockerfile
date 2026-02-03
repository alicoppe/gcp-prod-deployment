# Simple production build for the React + Vite + Tailwind frontend
# Use Debian-based image to avoid Rollup optional dependency issues on musl.
FROM node:20-slim AS build
WORKDIR /app
ARG VITE_ASSET_BUCKET
ENV VITE_ASSET_BUCKET=$VITE_ASSET_BUCKET
COPY package.json package-lock.json* ./
# Install deps (prefer lockfile when available). Work around npm optional deps bug for Rollup.
RUN if [ -f package-lock.json ]; then npm ci --include=optional; else npm install --include=optional; fi && \
  node -e "require('@rollup/rollup-linux-x64-gnu')" 2>/dev/null || \
  npm install --no-save --no-package-lock @rollup/rollup-linux-x64-gnu
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=build /app ./
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "npm run preview -- --host 0.0.0.0 --port ${PORT}"]
